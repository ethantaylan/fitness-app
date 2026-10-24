begin;

-- A shared catalogue, deliberately separate from accounts and paid AI quotas.
create table ai_private.exercise_demos (
  key text primary key check (length(key) between 2 and 160),
  id uuid not null unique default gen_random_uuid(),
  title text not null check (length(title) between 2 and 160),
  status text not null default 'requested' check (status in ('requested', 'review', 'ready', 'rejected')),
  guide jsonb,
  asset_path text unique,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status <> 'ready' or (guide is not null and reviewed_at is not null))
);
create table ai_private.exercise_demo_aliases (
  key text primary key,
  demo_key text not null references ai_private.exercise_demos(key) on delete restrict
);
create index exercise_demo_alias_target on ai_private.exercise_demo_aliases(demo_key);
create index exercise_demo_pending on ai_private.exercise_demos(created_at) where status = 'requested';
create table ai_private.exercise_demo_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null references ai_private.exercise_demos(key) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table ai_private.exercise_demos enable row level security;
alter table ai_private.exercise_demo_aliases enable row level security;
alter table ai_private.exercise_demo_requests enable row level security;
revoke all on ai_private.exercise_demos, ai_private.exercise_demo_aliases, ai_private.exercise_demo_requests from public, anon, authenticated;
grant select, insert, update on ai_private.exercise_demos, ai_private.exercise_demo_aliases, ai_private.exercise_demo_requests to service_role;
-- Required solely to confirm that a requested name belongs to a saved workout.
grant select on public.exercises, public.program_session_blocks, public.program_sessions, public.program_weeks, public.programs,
  public.daily_session_exercises, public.daily_session_blocks, public.daily_sessions to service_role;

create function public.exercise_demo_request(p_user_id uuid, p_key text, p_name text, p_enqueue boolean default false)
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
  return jsonb_build_object('status', case when v_demo.status = 'rejected' then 'unavailable' else 'pending' end);
end;
$$;
revoke all on function public.exercise_demo_request(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.exercise_demo_request(uuid, text, text, boolean) to service_role;

-- Private originals and drafts. The Edge Function signs only reviewed media.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-demo-library', 'exercise-demo-library', false, 10485760, array['image/png', 'image/webp'])
on conflict (id) do nothing;
-- Administrative batch tooling. No role inferred from editable user metadata.
create function public.exercise_demo_admin(p_action text, p_key text default null, p_guide jsonb default null, p_aliases text[] default '{}')
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_demo ai_private.exercise_demos; v_alias text;
begin
  if p_action = 'list' then
    return coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from ai_private.exercise_demos d
      where d.status in ('requested', 'review') and not exists (select 1 from ai_private.exercise_demo_aliases a where a.key = d.key)), '[]'::jsonb);
  end if;
  select * into strict v_demo from ai_private.exercise_demos where key = p_key for update;
  if p_action = 'stage' then
    if v_demo.status = 'ready' then raise exception 'Already published'; end if;
    if p_guide is null or jsonb_typeof(p_guide->'steps') is distinct from 'array'
      or nullif(p_guide->>'title', '') is null or nullif(p_guide->>'mistake', '') is null
      or coalesce(p_guide->>'file', '') not in ('demo.webp', 'demo.png') then raise exception 'Invalid guide'; end if;
    if jsonb_array_length(p_guide->'steps') not between 2 and 10
      or exists (select 1 from jsonb_array_elements(p_guide->'steps') item where jsonb_typeof(item) <> 'string' or length(item #>> '{}') not between 1 and 1000) then raise exception 'Invalid instructions'; end if;
    if v_demo.asset_path is not null and v_demo.asset_path <> v_demo.id::text || '/' || (p_guide->>'file') then raise exception 'Existing media is immutable'; end if;
    update ai_private.exercise_demos set status = 'review',
      guide = jsonb_build_object('id', v_demo.id, 'title', p_guide->>'title', 'steps', p_guide->'steps', 'mistake', p_guide->>'mistake', 'source', 'vincere', 'layout', 'pair'),
      asset_path = v_demo.id::text || '/' || (p_guide->>'file') where key = p_key returning * into v_demo;
  elsif p_action = 'approve' then
    if v_demo.status = 'ready' then return jsonb_build_object('status', 'ready', 'duplicate', true); end if;
    if v_demo.status <> 'review' or v_demo.asset_path is null then raise exception 'Draft required'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'exercise-demo-library' and name = v_demo.asset_path) then raise exception 'Media unavailable'; end if;
    update ai_private.exercise_demos set status = 'ready', reviewed_at = now() where key = p_key returning * into v_demo;
  elsif p_action = 'reject' then
    if v_demo.status = 'ready' then raise exception 'Published asset is immutable'; end if;
    update ai_private.exercise_demos set status = 'rejected' where key = p_key returning * into v_demo;
  elsif p_action <> 'alias' then raise exception 'Unknown action'; end if;
  if p_action = 'alias' and v_demo.status <> 'ready' then raise exception 'Approved target required'; end if;
  foreach v_alias in array p_aliases loop
    if length(v_alias) not between 2 and 160 then raise exception 'Invalid alias'; end if;
    if exists (select 1 from ai_private.exercise_demos where key = v_alias and key <> p_key and status in ('review', 'ready')) then
      raise exception 'Alias already has media';
    end if;
    insert into ai_private.exercise_demo_aliases(key, demo_key) values (v_alias, p_key) on conflict (key) do nothing;
    if exists (select 1 from ai_private.exercise_demo_aliases where key = v_alias and demo_key <> p_key) then raise exception 'Alias conflict'; end if;
  end loop;
  return jsonb_build_object('status', v_demo.status, 'id', v_demo.id);
end;
$$;
revoke all on function public.exercise_demo_admin(text, text, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.exercise_demo_admin(text, text, jsonb, text[]) to service_role;

-- Seed the bundled catalogue so verified synonyms can reuse its existing media.
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:push-ups','Pompes','ready','{"id": "push-ups", "title": "Pompes", "aliases": ["Pompes", "Push ups"], "steps": ["Place les mains sous les épaules, jambes tendues.", "Garde le corps aligné et descends en pliant les coudes.", "Repousse le sol pour revenir."], "mistake": "Évite de laisser tomber le bassin.", "source": "everkinetic", "images": ["/exercises/everkinetic/push-ups-1.webp", "/exercises/everkinetic/push-ups-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('pompes','builtin:push-ups') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('push ups','builtin:push-ups') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:pull-ups','Tractions pronation','ready','{"id": "pull-ups", "title": "Tractions pronation", "aliases": ["Tractions pronation", "Pull-ups"], "steps": ["Saisis une barre fixe, paumes vers l’avant.", "Tire les coudes vers le bas pour monter la poitrine.", "Redescends lentement."], "mistake": "Évite les balancements.", "source": "everkinetic", "images": ["/exercises/everkinetic/pull-ups-1.webp", "/exercises/everkinetic/pull-ups-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('tractions pronation','builtin:pull-ups') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('pull ups','builtin:pull-ups') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:side-plank','Planche latérale','ready','{"id": "side-plank", "title": "Planche latérale", "aliases": ["Planche latérale", "Gainage latéral", "Side plank"], "steps": ["Allonge-toi sur le côté, coude sous l’épaule.", "Soulève le bassin en prenant appui sur l’avant-bras et les pieds.", "Maintiens puis repose le bassin et change de côté."], "mistake": "Ne laisse pas le bassin s’affaisser.", "source": "everkinetic", "images": ["/exercises/everkinetic/side-plank-1.webp", "/exercises/everkinetic/side-plank-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('planche laterale','builtin:side-plank') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('gainage lateral','builtin:side-plank') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('side plank','builtin:side-plank') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:crunches','Crunch jambes sur banc','ready','{"id": "crunches", "title": "Crunch jambes sur banc", "aliases": ["Crunch jambes sur banc", "Crunch sur banc"], "steps": ["Allonge-toi, mollets sur un banc, genoux fléchis.", "Décolle légèrement les épaules en contractant les abdominaux.", "Repose lentement les épaules."], "mistake": "Ne tire pas sur la nuque.", "source": "everkinetic", "images": ["/exercises/everkinetic/crunches-1.webp", "/exercises/everkinetic/crunches-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('crunch jambes sur banc','builtin:crunches') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('crunch sur banc','builtin:crunches') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:barbell-squat','Squat barre','ready','{"id": "barbell-squat", "title": "Squat barre", "aliases": ["Squat barre", "Squat avec barre", "Back squat", "Barbell squat"], "steps": ["Place la barre sur le haut du dos, pieds bien ancrés.", "Fléchis hanches et genoux dans une amplitude contrôlée.", "Pousse dans les pieds pour te redresser."], "mistake": "Évite de décoller les talons ou d’arrondir le dos.", "source": "everkinetic", "images": ["/exercises/everkinetic/barbell-squat-1.webp", "/exercises/everkinetic/barbell-squat-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('squat barre','builtin:barbell-squat') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('squat avec barre','builtin:barbell-squat') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('back squat','builtin:barbell-squat') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('barbell squat','builtin:barbell-squat') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:bench-press','Développé couché barre','ready','{"id": "bench-press", "title": "Développé couché barre", "aliases": ["Développé couché barre", "Développé couché avec barre", "Barbell bench press"], "steps": ["Allonge-toi sur un banc, pieds au sol, barre au-dessus de la poitrine.", "Descends la barre lentement vers la poitrine.", "Repousse la barre avec contrôle."], "mistake": "Ne fais pas rebondir la barre sur la poitrine.", "source": "everkinetic", "images": ["/exercises/everkinetic/bench-press-1.webp", "/exercises/everkinetic/bench-press-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('developpe couche barre','builtin:bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('developpe couche avec barre','builtin:bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('barbell bench press','builtin:bench-press') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:bench-press-dumbbell','Développé couché haltères','ready','{"id": "bench-press-dumbbell", "title": "Développé couché haltères", "aliases": ["Développé couché haltères", "Développé couché avec haltères", "Dumbbell bench press"], "steps": ["Allonge-toi sur un banc, haltères au-dessus de la poitrine.", "Descends les haltères de chaque côté dans une amplitude confortable.", "Repousse-les au-dessus de la poitrine."], "mistake": "Garde les poignets alignés avec les avant-bras.", "source": "everkinetic", "images": ["/exercises/everkinetic/bench-press-dumbbell-1.webp", "/exercises/everkinetic/bench-press-dumbbell-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('developpe couche halteres','builtin:bench-press-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('developpe couche avec halteres','builtin:bench-press-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('dumbbell bench press','builtin:bench-press-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:dumbbell-shoulder-press','Développé épaules haltères assis','ready','{"id": "dumbbell-shoulder-press", "title": "Développé épaules haltères assis", "aliases": ["Développé épaules haltères assis", "Développé militaire haltères assis", "Seated dumbbell shoulder press"], "steps": ["Assieds-toi sur un banc, haltères à hauteur des épaules.", "Pousse les haltères au-dessus de la tête.", "Redescends lentement à hauteur des épaules."], "mistake": "Ne cambre pas excessivement le bas du dos.", "source": "everkinetic", "images": ["/exercises/everkinetic/dumbbell-shoulder-press-1.webp", "/exercises/everkinetic/dumbbell-shoulder-press-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('developpe epaules halteres assis','builtin:dumbbell-shoulder-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('developpe militaire halteres assis','builtin:dumbbell-shoulder-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('seated dumbbell shoulder press','builtin:dumbbell-shoulder-press') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:seated-cable-rows','Tirage horizontal poulie','ready','{"id": "seated-cable-rows", "title": "Tirage horizontal poulie", "aliases": ["Tirage horizontal poulie", "Rowing poulie basse", "Seated cable row"], "steps": ["Assieds-toi face à la poulie, genoux légèrement fléchis.", "Tire la poignée vers le ventre en gardant le buste stable.", "Laisse revenir les bras avec contrôle."], "mistake": "Évite de donner de l’élan avec le dos.", "source": "everkinetic", "images": ["/exercises/everkinetic/seated-cable-rows-1.webp", "/exercises/everkinetic/seated-cable-rows-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('tirage horizontal poulie','builtin:seated-cable-rows') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('rowing poulie basse','builtin:seated-cable-rows') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('seated cable row','builtin:seated-cable-rows') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:biceps-curl-with-dumbbell','Curl biceps haltères','ready','{"id": "biceps-curl-with-dumbbell", "title": "Curl biceps haltères", "aliases": ["Curl biceps haltères", "Curl haltères", "Dumbbell biceps curl"], "steps": ["Debout, haltères le long du corps, paumes vers l’avant.", "Plie les coudes pour rapprocher les haltères des épaules.", "Redescends lentement."], "mistake": "Garde les coudes près du corps, sans balancer le buste.", "source": "everkinetic", "images": ["/exercises/everkinetic/biceps-curl-with-dumbbell-1.webp", "/exercises/everkinetic/biceps-curl-with-dumbbell-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('curl biceps halteres','builtin:biceps-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('curl halteres','builtin:biceps-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('dumbbell biceps curl','builtin:biceps-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:biceps-hammer-curl-with-dumbbell','Curl marteau','ready','{"id": "biceps-hammer-curl-with-dumbbell", "title": "Curl marteau", "aliases": ["Curl marteau", "Curl marteau haltères", "Hammer curl"], "steps": ["Tiens les haltères avec les paumes face à face.", "Plie les coudes sans tourner les poignets.", "Redescends avec contrôle."], "mistake": "Évite de prendre de l’élan.", "source": "everkinetic", "images": ["/exercises/everkinetic/biceps-hammer-curl-with-dumbbell-1.webp", "/exercises/everkinetic/biceps-hammer-curl-with-dumbbell-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('curl marteau','builtin:biceps-hammer-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('curl marteau halteres','builtin:biceps-hammer-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('hammer curl','builtin:biceps-hammer-curl-with-dumbbell') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:leg-press','Presse à cuisses','ready','{"id": "leg-press", "title": "Presse à cuisses", "aliases": ["Presse à cuisses", "Leg press"], "steps": ["Installe-toi sur la presse, dos et bassin soutenus.", "Fléchis les genoux en gardant les pieds à plat sur la plateforme.", "Repousse sans verrouiller brutalement les genoux."], "mistake": "Ne décolle pas le bassin du siège.", "source": "everkinetic", "images": ["/exercises/everkinetic/leg-press-1.webp", "/exercises/everkinetic/leg-press-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('presse a cuisses','builtin:leg-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('leg press','builtin:leg-press') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:lying-leg-curl-machine','Leg curl allongé','ready','{"id": "lying-leg-curl-machine", "title": "Leg curl allongé", "aliases": ["Leg curl allongé", "Lying leg curl"], "steps": ["Allonge-toi sur la machine, rouleau au-dessus des talons.", "Ramène les talons vers les fesses en pliant les genoux.", "Redescends lentement."], "mistake": "Garde le bassin contre le support.", "source": "everkinetic", "images": ["/exercises/everkinetic/lying-leg-curl-machine-1.webp", "/exercises/everkinetic/lying-leg-curl-machine-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('leg curl allonge','builtin:lying-leg-curl-machine') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('lying leg curl','builtin:lying-leg-curl-machine') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:dumbbell-lunges','Fentes haltères','ready','{"id": "dumbbell-lunges", "title": "Fentes haltères", "aliases": ["Fentes haltères", "Fentes avec haltères", "Dumbbell lunges"], "steps": ["Debout, tiens un haltère dans chaque main.", "Fais un pas en avant et fléchis les deux jambes.", "Repousse dans le pied avant pour revenir puis alterne."], "mistake": "Garde le genou aligné avec le pied et le buste stable.", "source": "everkinetic", "images": ["/exercises/everkinetic/dumbbell-lunges-1.webp", "/exercises/everkinetic/dumbbell-lunges-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('fentes halteres','builtin:dumbbell-lunges') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('fentes avec halteres','builtin:dumbbell-lunges') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('dumbbell lunges','builtin:dumbbell-lunges') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:incline-bench-press','Développé incliné barre','ready','{"id": "incline-bench-press", "title": "Développé incliné barre", "aliases": ["Développé incliné barre", "Développé incliné avec barre", "Incline barbell bench press"], "steps": ["Allonge-toi sur un banc incliné, pieds au sol.", "Descends la barre vers le haut de la poitrine.", "Repousse avec contrôle."], "mistake": "Ne fais pas rebondir la barre.", "source": "everkinetic", "images": ["/exercises/everkinetic/incline-bench-press-1.webp", "/exercises/everkinetic/incline-bench-press-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('developpe incline barre','builtin:incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('developpe incline avec barre','builtin:incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('incline barbell bench press','builtin:incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:dumbbell-incline-bench-press','Développé incliné haltères','ready','{"id": "dumbbell-incline-bench-press", "title": "Développé incliné haltères", "aliases": ["Développé incliné haltères", "Développé incliné avec haltères", "Incline dumbbell bench press"], "steps": ["Allonge-toi sur un banc incliné, haltères près des épaules.", "Pousse les haltères au-dessus de la poitrine.", "Redescends lentement."], "mistake": "Évite de cogner les haltères en haut.", "source": "everkinetic", "images": ["/exercises/everkinetic/dumbbell-incline-bench-press-1.webp", "/exercises/everkinetic/dumbbell-incline-bench-press-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('developpe incline halteres','builtin:dumbbell-incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('developpe incline avec halteres','builtin:dumbbell-incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('incline dumbbell bench press','builtin:dumbbell-incline-bench-press') on conflict do nothing;
insert into ai_private.exercise_demos(key,title,status,guide,reviewed_at) values ('builtin:triceps-pushdown-with-rope-and-cable','Extension triceps corde','ready','{"id": "triceps-pushdown-with-rope-and-cable", "title": "Extension triceps corde", "aliases": ["Extension triceps corde", "Triceps à la corde", "Triceps pushdown corde"], "steps": ["Debout face à une poulie haute, saisis la corde.", "Garde les coudes près du corps et tends les bras vers le bas.", "Reviens lentement sans déplacer les coudes."], "mistake": "Évite de pousser avec tout le buste.", "source": "everkinetic", "images": ["/exercises/everkinetic/triceps-pushdown-with-rope-and-cable-1.webp", "/exercises/everkinetic/triceps-pushdown-with-rope-and-cable-2.webp"]}'::jsonb,now());
insert into ai_private.exercise_demo_aliases values ('extension triceps corde','builtin:triceps-pushdown-with-rope-and-cable') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('triceps a la corde','builtin:triceps-pushdown-with-rope-and-cable') on conflict do nothing;
insert into ai_private.exercise_demo_aliases values ('triceps pushdown corde','builtin:triceps-pushdown-with-rope-and-cable') on conflict do nothing;
commit;
