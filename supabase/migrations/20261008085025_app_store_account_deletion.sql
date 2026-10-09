begin;

-- Abort if legacy application accounts have no matching Auth identity.
-- Do not silently discard those accounts during a release migration.
alter table public.users
  add constraint users_auth_account_fkey
  foreign key (id) references auth.users(id) on delete cascade;

alter table public.contact drop constraint contact_user_id_fkey;
alter table public.contact add constraint contact_user_id_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

-- The Edge Function refuses deletion if these cascades are not installed.
create function public.account_deletion_ready()
returns boolean language sql stable security invoker
set search_path = '' as $$
  select count(*) = 2 from pg_catalog.pg_constraint
  where contype = 'f' and confdeltype = 'c' and convalidated
    and ((conrelid = 'public.users'::regclass
      and confrelid = 'auth.users'::regclass and conname = 'users_auth_account_fkey')
    or (conrelid = 'public.contact'::regclass
      and confrelid = 'public.users'::regclass and conname = 'contact_user_id_fkey'));
$$;

revoke all on function public.account_deletion_ready() from public, anon, authenticated;
grant execute on function public.account_deletion_ready() to service_role;

commit;
