begin;
create table public.health_activity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('apple_health','garmin')),
  external_id text not null check (length(external_id) between 1 and 200),
  program_session_id uuid not null references public.program_sessions(id) on delete cascade,
  activity_started_at timestamptz not null,
  activity_ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id,source,external_id),
  unique(user_id,program_session_id),
  check(activity_ended_at >= activity_started_at)
);
create index health_link_session on public.health_activity_links(program_session_id);
alter table public.health_activity_links enable row level security;
revoke all on public.health_activity_links from public,anon,authenticated;
grant select,insert,delete on public.health_activity_links to authenticated;
create policy health_links_read on public.health_activity_links for select to authenticated using(user_id=(select auth.uid()));
create policy health_links_delete on public.health_activity_links for delete to authenticated using(user_id=(select auth.uid()));
create policy health_links_insert on public.health_activity_links for insert to authenticated with check (
  user_id=(select auth.uid()) and exists (
    select 1 from public.program_sessions s join public.program_weeks w on w.id=s.week_id
    join public.programs p on p.id=w.program_id where s.id=program_session_id and p.user_id=(select auth.uid())
  )
);

create function public.guard_program_progression()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_week integer; v_program uuid;
begin
  select w.week_number,w.program_id into v_week,v_program
    from public.program_weeks w join public.programs p on p.id=w.program_id
    where w.id=new.week_id for update of p;
  if new.completed_at is null then
    delete from public.health_activity_links where program_session_id=new.id and user_id=auth.uid();
    return new;
  end if;
  if old.completed_at is not null then return new; end if;
  if exists(select 1 from public.program_sessions s join public.program_weeks w on w.id=s.week_id
    where w.program_id=v_program and w.week_number<v_week and s.completed_at is null) then
    raise exception 'Termine les semaines précédentes avant de valider cette séance.' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_program_progression() from public,anon,authenticated;
create trigger guard_program_progression before update of completed_at on public.program_sessions
  for each row execute function public.guard_program_progression();

create function public.reset_program_weeks(p_program_id uuid,p_week integer,p_following boolean default true)
returns void language plpgsql security invoker set search_path='' as $$
declare v_program uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode='42501'; end if;
  select id into v_program from public.programs where id=p_program_id and user_id=auth.uid() for update;
  if v_program is null or not exists(select 1 from public.program_weeks where program_id=v_program and week_number=p_week) then
    raise exception 'Semaine inaccessible' using errcode='42501';
  end if;
  delete from public.health_activity_links l using public.program_sessions s,public.program_weeks w
    where l.program_session_id=s.id and s.week_id=w.id and w.program_id=v_program
      and (w.week_number=p_week or (p_following and w.week_number>p_week)) and l.user_id=auth.uid();
  update public.program_sessions s set completed_at=null from public.program_weeks w
    where s.week_id=w.id and w.program_id=v_program and (w.week_number=p_week or (p_following and w.week_number>p_week));
end;
$$;

create function public.link_health_activity(p_program_id uuid,p_week integer,p_session text,p_source text,p_external_id text,p_started_at timestamptz,p_ended_at timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_program uuid; v_session uuid; v_existing uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode='42501'; end if;
  if p_source not in ('apple_health','garmin') or length(p_external_id) not between 1 and 200
    or p_started_at is null or p_ended_at is null or p_ended_at < p_started_at or p_ended_at > now()+interval '5 minutes' then
    raise exception 'Activité invalide' using errcode='22023';
  end if;
  select id into v_program from public.programs where id=p_program_id and user_id=auth.uid() for update;
  if v_program is null then raise exception 'Programme inaccessible' using errcode='42501'; end if;
  select s.id into v_session from public.program_sessions s join public.program_weeks w on w.id=s.week_id
    where w.program_id=v_program and w.week_number=p_week and s.session_label=p_session;
  if v_session is null then raise exception 'Séance inaccessible' using errcode='42501'; end if;
  select program_session_id into v_existing from public.health_activity_links
    where user_id=auth.uid() and source=p_source and external_id=p_external_id;
  if v_existing is not null then
    if v_existing=v_session then return v_session; end if;
    raise exception 'Cette activité est déjà associée à une autre séance.' using errcode='23505';
  end if;
  insert into public.health_activity_links(user_id,source,external_id,program_session_id,activity_started_at,activity_ended_at)
    values(auth.uid(),p_source,p_external_id,v_session,p_started_at,p_ended_at);
  update public.program_sessions set completed_at=p_ended_at where id=v_session;
  return v_session;
end;
$$;
revoke all on function public.reset_program_weeks(uuid,integer,boolean), public.link_health_activity(uuid,integer,text,text,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.reset_program_weeks(uuid,integer,boolean), public.link_health_activity(uuid,integer,text,text,text,timestamptz,timestamptz) to authenticated;
commit;
