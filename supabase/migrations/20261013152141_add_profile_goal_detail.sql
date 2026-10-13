alter table public.user_profiles
  add column if not exists goal_detail text;

comment on column public.user_profiles.goal_detail is
  'Optional user-defined detail that refines the primary training objective.';
