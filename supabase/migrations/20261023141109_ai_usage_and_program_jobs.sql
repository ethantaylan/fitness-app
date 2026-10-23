begin;

-- Internal accounting and work state are never exposed through the Data API.
create schema if not exists ai_private;
revoke all on schema ai_private from public, anon, authenticated;
grant usage on schema ai_private to service_role;

create table ai_private.limits (
  bucket text primary key check (bucket in ('program', 'other')),
  maximum integer not null check (maximum >= 0),
  period text not null check (period in ('week', 'day'))
);
insert into ai_private.limits values ('program', 5, 'week'), ('other', 10, 'day');

create table ai_private.usage (
  user_id uuid not null references public.users(id) on delete cascade,
  bucket text not null references ai_private.limits(bucket),
  period_start timestamptz not null,
  used integer not null check (used >= 0),
  primary key (user_id, bucket, period_start)
);
create table ai_private.requests (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  bucket text not null references ai_private.limits(bucket),
  created_at timestamptz not null default now()
);
create index ai_requests_owner on ai_private.requests(user_id);

create table ai_private.program_jobs (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  checkpoint jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  error text,
  lease_token uuid,
  lease_until timestamptz,
  lease_attempts integer not null default 0,
  next_run_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index one_active_program_job_per_account on ai_private.program_jobs(user_id)
  where status in ('queued', 'running');
create index program_jobs_ready on ai_private.program_jobs(next_run_at, created_at)
  where status in ('queued', 'running');
create index program_jobs_owner on ai_private.program_jobs(user_id);

alter table ai_private.limits enable row level security;
alter table ai_private.usage enable row level security;
alter table ai_private.requests enable row level security;
alter table ai_private.program_jobs enable row level security;
grant select, insert, update, delete on all tables in schema ai_private to service_role;

-- A single transaction reserves quota. The request ID prevents double billing on retries;
-- a conditional UPSERT enforces the limit even across concurrent Edge workers.
create function public.ai_reserve_usage(p_user_id uuid, p_bucket text, p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_limit ai_private.limits;
  v_start timestamptz;
  v_reset timestamptz;
  v_local_start timestamp;
  v_used integer;
  v_existing ai_private.requests;
begin
  select * into strict v_limit from ai_private.limits where bucket = p_bucket;
  v_local_start := date_trunc(v_limit.period, now() at time zone 'Europe/Paris');
  v_start := v_local_start at time zone 'Europe/Paris';
  v_reset := (v_local_start + case when v_limit.period = 'week' then interval '1 week' else interval '1 day' end) at time zone 'Europe/Paris';
  insert into ai_private.requests(id, user_id, bucket) values (p_request_id, p_user_id, p_bucket)
    on conflict (id) do nothing;
  if not found then
    select * into strict v_existing from ai_private.requests where id = p_request_id;
    if v_existing.user_id <> p_user_id or v_existing.bucket <> p_bucket then
      raise exception 'Request belongs to another operation' using errcode = '42501';
    end if;
    return jsonb_build_object('allowed', true, 'duplicate', true);
  end if;
  if v_limit.maximum > 0 then
    insert into ai_private.usage(user_id, bucket, period_start, used)
      values (p_user_id, p_bucket, v_start, 1)
    on conflict (user_id, bucket, period_start) do update
      set used = ai_private.usage.used + 1 where ai_private.usage.used < v_limit.maximum
    returning used into v_used;
  end if;
  if v_used is null then
    delete from ai_private.requests where id = p_request_id;
    return jsonb_build_object('allowed', false, 'limit', v_limit.maximum, 'resetsAt', v_reset);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit.maximum, 'resetsAt', v_reset);
end;
$$;

create function public.ai_start_program(p_user_id uuid, p_job_id uuid, p_profile jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_job ai_private.program_jobs; v_quota jsonb;
begin
  -- Lock ordering is always account, quota, job. A second device resumes the active job.
  perform 1 from public.users where id = p_user_id for update;
  if not found then raise exception 'Account unavailable' using errcode = '42501'; end if;
  select * into v_job from ai_private.program_jobs where id = p_job_id;
  if found then
    if v_job.user_id <> p_user_id then raise exception 'Job unavailable' using errcode = '42501'; end if;
    return jsonb_build_object('allowed', true, 'job', to_jsonb(v_job));
  end if;
  select * into v_job from ai_private.program_jobs
    where user_id = p_user_id and status in ('queued', 'running') limit 1;
  if found then return jsonb_build_object('allowed', true, 'job', to_jsonb(v_job)); end if;
  v_quota := public.ai_reserve_usage(p_user_id, 'program', p_job_id);
  if not (v_quota->>'allowed')::boolean then return v_quota; end if;
  insert into ai_private.program_jobs(id, user_id, profile) values (p_job_id, p_user_id, p_profile)
    returning * into v_job;
  return jsonb_build_object('allowed', true, 'job', to_jsonb(v_job), 'quota', v_quota);
end;
$$;

create function public.ai_get_program(p_user_id uuid, p_job_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select to_jsonb(j) from ai_private.program_jobs j where id = p_job_id and user_id = p_user_id;
$$;

create function public.ai_claim_program(p_job_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_job ai_private.program_jobs;
begin
  select * into v_job from ai_private.program_jobs
  where id = p_job_id and next_run_at <= now() and (lease_until is null or lease_until < now())
    and status in ('queued', 'running')
  for update skip locked;
  if not found then return null; end if;
  if v_job.lease_attempts >= 3 or v_job.created_at < now() - interval '30 minutes' then
    update ai_private.program_jobs set status = 'failed', error = 'La création a été interrompue côté serveur. Ton ancien programme reste disponible.',
      lease_token = null, lease_until = null, updated_at = now() where id = p_job_id;
    return null;
  end if;
  update ai_private.program_jobs set lease_token = gen_random_uuid(), lease_until = now() + interval '130 seconds',
    lease_attempts = lease_attempts + 1, status = 'running', updated_at = now()
    where id = p_job_id returning * into v_job;
  return to_jsonb(v_job);
end;
$$;

create function public.ai_checkpoint_program(p_job_id uuid, p_lease uuid, p_checkpoint jsonb, p_error text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update ai_private.program_jobs set checkpoint = p_checkpoint,
    status = case when p_error is null then 'queued' else 'failed' end, error = p_error,
    lease_token = null, lease_until = null, lease_attempts = 0, next_run_at = now(), updated_at = now()
    where id = p_job_id and status = 'running' and lease_token = p_lease and lease_until > now();
  return found;
end;
$$;

-- Only the trusted worker can complete a job. Bind the existing atomic save RPC to the
-- owner read from the locked job; no client-supplied owner or JWT is used.
create function public.ai_finish_program(p_job_id uuid, p_lease uuid, p_program jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_job ai_private.program_jobs; v_previous_sub text;
begin
  -- Keep the same account -> job lock order as ai_start_program/save_generated_program.
  perform 1 from public.users where id = (select user_id from ai_private.program_jobs where id = p_job_id) for update;
  select * into v_job from ai_private.program_jobs where id = p_job_id and status = 'running'
    and lease_token = p_lease and lease_until > now() for update;
  if not found then return false; end if;
  v_previous_sub := current_setting('request.jwt.claim.sub', true);
  perform set_config('request.jwt.claim.sub', v_job.user_id::text, true);
  perform public.save_generated_program(p_job_id, p_program || jsonb_build_object('user_id', v_job.user_id));
  perform set_config('request.jwt.claim.sub', coalesce(v_previous_sub, ''), true);
  update ai_private.program_jobs set status = 'completed', completed_at = now(), updated_at = now(),
    checkpoint = jsonb_build_object('program', p_program),
    lease_token = null, lease_until = null, lease_attempts = 0, next_run_at = now() where id = p_job_id;
  return true;
end;
$$;
grant execute on function public.save_generated_program(uuid, jsonb) to service_role;

do $$ declare v_name text; v_args text; begin
  for v_name, v_args in select p.proname, pg_get_function_identity_arguments(p.oid)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('ai_reserve_usage', 'ai_start_program', 'ai_get_program', 'ai_claim_program', 'ai_checkpoint_program', 'ai_finish_program')
  loop
    execute format('revoke all on function public.%I(%s) from public, anon, authenticated', v_name, v_args);
    execute format('grant execute on function public.%I(%s) to service_role', v_name, v_args);
  end loop;
end $$;
commit;
