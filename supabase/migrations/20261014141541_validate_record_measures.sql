-- Existing incomplete records remain available; only new writes are checked.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'personal_records_valid_measure'
      and conrelid = 'public.personal_records'::regclass
  ) then
    alter table public.personal_records
      add constraint personal_records_valid_measure check (
        name is not null and length(btrim(name)) > 0
        and category is not null
        and (weight_kg is null or (weight_kg >= 0 and weight_kg::text not in ('NaN', 'Infinity', '-Infinity')))
        and (reps is null or (reps > 0 and reps = trunc(reps) and reps::text not in ('NaN', 'Infinity', '-Infinity')))
        and (distance_km is null or (distance_km > 0 and distance_km::text not in ('NaN', 'Infinity', '-Infinity')))
        and (time_min is null or (time_min > 0 and time_min::text not in ('NaN', 'Infinity', '-Infinity')))
        and (
          (category = 'force' and weight_kg is not null and reps is not null)
          or (category = 'cardio' and (distance_km is not null or time_min is not null))
          or (category in ('corps', 'autre') and (reps is not null or time_min is not null))
        )
      ) not valid;
  end if;
end $$;
