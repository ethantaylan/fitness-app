begin;
-- Older application tables did not grant privileges to service_role. BYPASSRLS
-- bypasses policies, not table privileges. Grant only what finalization uses.
grant usage on schema public, auth to service_role;
grant select (id), update (id) on public.users to service_role;
grant select, insert, update on public.programs to service_role;
grant insert on public.program_weeks, public.program_sessions, public.program_session_blocks, public.exercises to service_role;
grant select (id) on public.program_weeks, public.program_sessions, public.program_session_blocks to service_role;
commit;
