begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
revoke all on table net.http_request_queue from public, anon, authenticated;

-- A dedicated worker token is held in Vault, not an administrator key or a user JWT.
-- Missing deployment configuration leaves the dispatcher inactive and visible in setup checks.
create function ai_private.dispatch_program_jobs()
returns void language plpgsql security invoker set search_path = '' as $$
declare v_url text; v_token text; v_job record;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'ai_worker_url';
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'ai_worker_secret';
  if v_url is null or v_token is null then return; end if;
  for v_job in select id from ai_private.program_jobs
    where next_run_at <= now() and (lease_until is null or lease_until < now())
      and status in ('queued', 'running')
    order by next_run_at, created_at limit 3
  loop
    perform net.http_post(url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_token),
      body := jsonb_build_object('action', 'program-work', 'jobId', v_job.id), timeout_milliseconds := 5000);
  end loop;
end;
$$;
revoke all on function ai_private.dispatch_program_jobs() from public, anon, authenticated;
-- Only the scheduler owner reads Vault. The worker itself cannot read Vault over the API.
select cron.schedule('vincere-program-jobs', '* * * * *', 'select ai_private.dispatch_program_jobs()');
commit;
