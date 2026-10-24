begin;
alter table ai_private.exercise_demos drop constraint exercise_demos_status_check;
alter table ai_private.exercise_demos add constraint exercise_demos_status_check
  check (status in ('requested', 'generating', 'uncertain', 'review', 'ready', 'rejected'));
alter table ai_private.exercise_demos add column generation_token uuid unique;
alter table ai_private.exercise_demos add column generation_started_at timestamptz;
alter table ai_private.exercise_demos add column generation_error text;
alter table ai_private.exercise_demos drop constraint exercise_demos_check;
alter table ai_private.exercise_demos add constraint exercise_demo_ready_content check (
  status <> 'ready' or (guide is not null and (reviewed_at is not null or generation_token is not null))
);

-- An attempt is permanently consumed BEFORE contacting the paid provider. No expiring
-- lease and no automatic retry can send the same exercise to the provider twice.
create function public.exercise_demo_claim(p_user_id uuid, p_key text, p_name text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_demo ai_private.exercise_demos; v_target text;
begin
  if not (exists (
    select 1 from public.exercises e
    join public.program_session_blocks b on b.id = e.block_id
    join public.program_sessions s on s.id = b.session_id
    join public.program_weeks w on w.id = s.week_id
    join public.programs p on p.id = w.program_id
    where p.user_id = p_user_id and e.name = p_name
  ) or exists (
    select 1 from public.daily_session_exercises e
    join public.daily_session_blocks b on b.id = e.block_id
    join public.daily_sessions s on s.id = b.session_id
    where s.user_id = p_user_id and e.name = p_name
  )) then return null; end if;
  select demo_key into v_target from ai_private.exercise_demo_aliases where key = p_key;
  select * into v_demo from ai_private.exercise_demos where key = coalesce(v_target,p_key) for update;
  if not found or v_demo.status in ('ready','review','rejected') then return null; end if;
  if v_demo.generation_token is not null then
    return jsonb_build_object('claimed',false,'id',v_demo.id,'key',v_demo.key,'title',v_demo.title,'token',v_demo.generation_token);
  end if;
  if v_demo.status <> 'requested' or v_demo.asset_path is not null then return null; end if;
  update ai_private.exercise_demos set status='generating',generation_token=gen_random_uuid(),generation_started_at=now()
    where key=v_demo.key returning * into v_demo;
  return jsonb_build_object('claimed',true,'id',v_demo.id,'key',v_demo.key,'title',v_demo.title,'token',v_demo.generation_token);
end;
$$;

create function public.exercise_demo_generated(p_key text,p_token uuid,p_error text default null)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_demo ai_private.exercise_demos; v_path text;
begin
  select * into v_demo from ai_private.exercise_demos where key=p_key and generation_token=p_token and status in ('generating','uncertain') for update;
  if not found then return false; end if;
  if p_error is not null then
    update ai_private.exercise_demos set status='uncertain',generation_error=left(p_error,160) where key=p_key;
    return true;
  end if;
  v_path := v_demo.id::text || '/generated.png';
  if not exists(select 1 from storage.objects where bucket_id='exercise-demo-library' and name=v_path) then return false; end if;
  -- Automatic provenance is explicit; reviewed_at remains reserved for human review.
  update ai_private.exercise_demos set status='ready',asset_path=v_path,reviewed_at=null,generation_error=null,
    guide=jsonb_build_object('id',v_demo.id,'title',v_demo.title,'source','vincere','layout','pair','reviewed',false,
      'steps',jsonb_build_array('Repère les positions de départ et d’arrivée sur l’illustration.','Suis les consignes de ta séance pour les répétitions, la durée et la récupération.'),
      'mistake','Ne reproduis pas une position qui provoque une douleur.') where key=p_key;
  return true;
end;
$$;
revoke all on function public.exercise_demo_claim(uuid,text,text), public.exercise_demo_generated(text,uuid,text) from public,anon,authenticated;
grant execute on function public.exercise_demo_claim(uuid,text,text), public.exercise_demo_generated(text,uuid,text) to service_role;
create or replace function public.exercise_demo_request(p_user_id uuid, p_key text, p_name text, p_enqueue boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_demo ai_private.exercise_demos; v_target text;
begin
  if p_key is null or length(p_key) not between 2 and 160 or p_name is null or length(p_name) not between 2 and 160 then
    raise exception 'Invalid exercise' using errcode = '22023';
  end if;
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;
  select demo_key into v_target from ai_private.exercise_demo_aliases where key = p_key;
  select * into v_demo from ai_private.exercise_demos where key = coalesce(v_target, p_key);
  if not found and p_enqueue then
    -- No free-form prompt or personal workout notes are accepted into the library.
    if not (exists (
      select 1 from public.exercises e
      join public.program_session_blocks b on b.id = e.block_id
      join public.program_sessions s on s.id = b.session_id
      join public.program_weeks w on w.id = s.week_id
      join public.programs p on p.id = w.program_id
      where p.user_id = p_user_id and e.name = p_name
    ) or exists (
      select 1 from public.daily_session_exercises e
      join public.daily_session_blocks b on b.id = e.block_id
      join public.daily_sessions s on s.id = b.session_id
      where s.user_id = p_user_id and e.name = p_name
    )) then raise exception 'Exercise unavailable' using errcode = '42501'; end if;
    -- Per-account lock and bounded backlog. Duplicate consultations do not use quota.
    perform 1 from public.users where id = p_user_id for update;
    if (select count(*) from ai_private.exercise_demo_requests
      where user_id = p_user_id and created_at >= date_trunc('day', now())) >= 50 then
      return jsonb_build_object('status', 'limited');
    end if;
    insert into ai_private.exercise_demos(key, title) values (p_key, p_name) on conflict (key) do nothing;
    select * into strict v_demo from ai_private.exercise_demos where key = p_key;
    insert into ai_private.exercise_demo_requests(user_id, key) values (p_user_id, v_demo.key) on conflict do nothing;
  end if;
  if v_demo.key is null then return jsonb_build_object('status', 'missing'); end if;
  if v_demo.status = 'ready' then
    return jsonb_build_object('status', 'ready', 'guide', v_demo.guide, 'assetPath', v_demo.asset_path);
  end if;
  -- Draft media, audit details and requester identities never reach a client.
  return jsonb_build_object('status', case when v_demo.status in ('rejected','uncertain') or (v_demo.status='generating' and v_demo.generation_started_at < now()-interval '10 minutes') then 'unavailable' else 'pending' end);
end;
$$;
commit;
