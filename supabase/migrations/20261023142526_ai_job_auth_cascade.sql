begin;
-- Keep new AI data tied directly to Auth even on legacy databases where the
-- public account -> Auth cascade is absent. Do not change legacy account data.
alter table ai_private.usage add constraint ai_usage_auth_account_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table ai_private.requests add constraint ai_requests_auth_account_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table ai_private.program_jobs add constraint ai_program_jobs_auth_account_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
commit;
