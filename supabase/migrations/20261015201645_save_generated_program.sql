begin;

-- One RPC is one transaction: a rejected child or activation rolls back the
-- complete replacement. The client retains p_program_id across retries.
create or replace function public.save_generated_program(
  p_program_id uuid,
  p_program jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_week jsonb;
  v_session record;
  v_block record;
  v_week_id uuid;
  v_session_id uuid;
  v_block_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_program_id is null then
    raise exception 'Program identifier required' using errcode = '22023';
  end if;
  if p_program ? 'user_id' and (p_program->>'user_id')::uuid is distinct from v_user_id then
    raise exception 'Program owner must match the authenticated account' using errcode = '42501';
  end if;

  -- Serialize replacements for this account, including when no active plan
  -- exists yet. The lock is released automatically on commit or rollback.
  perform 1 from public.users where id = v_user_id for update;
  if not found then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;

  select user_id into v_owner_id from public.programs where id = p_program_id;
  if found then
    if v_owner_id is distinct from v_user_id then
      raise exception 'Program belongs to another account' using errcode = '42501';
    end if;
    -- A lost response must not duplicate children or reactivate an older plan
    -- after a subsequent replacement has already succeeded.
    return p_program_id;
  end if;

  if jsonb_typeof(p_program) is distinct from 'object'
    or jsonb_typeof(p_program->'program_overview') is distinct from 'object'
    or jsonb_typeof(p_program->'weeks') is distinct from 'array' then
    raise exception 'Invalid program structure' using errcode = '22023';
  end if;
  if jsonb_array_length(p_program->'weeks') = 0 then
    raise exception 'Program requires at least one week' using errcode = '22023';
  end if;

  insert into public.programs (
    id, user_id, duration_weeks, training_days_per_week, summary, agent_used,
    general_advice, legal_disclaimer, nutrition_daily_calories,
    nutrition_protein_g, nutrition_water_l, nutrition_notes, is_active,
    started_at, profile_snapshot
  ) values (
    p_program_id, v_user_id,
    (p_program#>>'{program_overview,duration_weeks}')::smallint,
    (p_program#>>'{program_overview,training_days_per_week}')::smallint,
    p_program#>>'{program_overview,summary}',
    p_program#>>'{program_overview,agent_used}',
    p_program->>'general_advice', p_program->>'legal_disclaimer',
    (p_program#>>'{nutrition_recommendations,daily_calories_estimate}')::integer,
    (p_program#>>'{nutrition_recommendations,protein_target_g}')::integer,
    (p_program#>>'{nutrition_recommendations,water_intake_l}')::numeric,
    p_program#>>'{nutrition_recommendations,notes}', false,
    coalesce((p_program->>'started_at')::date, current_date),
    nullif(p_program->'user_profile', 'null'::jsonb)
  );

  for v_week in select value from jsonb_array_elements(p_program->'weeks') loop
    insert into public.program_weeks (program_id, week_number, focus)
    values (p_program_id, (v_week->>'week_number')::smallint, v_week->>'focus')
    returning id into v_week_id;

    if jsonb_typeof(v_week->'sessions') is distinct from 'array' then
      raise exception 'Week requires a sessions array' using errcode = '22023';
    end if;
    for v_session in
      select value, ordinality from jsonb_array_elements(v_week->'sessions') with ordinality
    loop
      insert into public.program_sessions (
        week_id, day, session_label, type, duration_min, intensity,
        warmup, cooldown, notes, sort_order
      ) values (
        v_week_id, v_session.value->>'day', v_session.value->>'session_id',
        v_session.value->>'type', (v_session.value->>'duration_min')::smallint,
        v_session.value->>'intensity',
        coalesce(nullif(v_session.value->'warmup', 'null'::jsonb), '[]'::jsonb),
        coalesce(nullif(v_session.value->'cooldown', 'null'::jsonb), '[]'::jsonb),
        v_session.value->>'notes', v_session.ordinality - 1
      ) returning id into v_session_id;

      if jsonb_typeof(v_session.value->'blocks') is distinct from 'array' then
        raise exception 'Session requires a blocks array' using errcode = '22023';
      end if;
      for v_block in
        select value, ordinality
        from jsonb_array_elements(v_session.value->'blocks') with ordinality
      loop
        insert into public.program_session_blocks (session_id, block_name, sort_order)
        values (v_session_id, v_block.value->>'block_name', v_block.ordinality - 1)
        returning id into v_block_id;

        if jsonb_typeof(v_block.value->'exercises') is distinct from 'array' then
          raise exception 'Block requires an exercises array' using errcode = '22023';
        end if;
        insert into public.exercises (
          block_id, name, sets, reps, load_kg, tempo, rest_sec,
          alternative, notes, sort_order
        )
        select v_block_id, value->>'name', (value->>'sets')::smallint,
          value->>'reps', value->>'load_kg', value->>'tempo',
          (value->>'rest_sec')::smallint, value->>'alternative',
          value->>'notes', ordinality - 1
        from jsonb_array_elements(v_block.value->'exercises') with ordinality;
      end loop;
    end loop;
  end loop;

  update public.programs set is_active = false
  where user_id = v_user_id and is_active = true;
  update public.programs set is_active = true
  where id = p_program_id and user_id = v_user_id;
  if not found then
    raise exception 'Program activation denied' using errcode = '42501';
  end if;
  return p_program_id;
end;
$$;

revoke all on function public.save_generated_program(uuid, jsonb) from public, anon;
grant execute on function public.save_generated_program(uuid, jsonb) to authenticated;

commit;
