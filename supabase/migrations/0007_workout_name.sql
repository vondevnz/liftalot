-- Gives a logged session a name of its own.
--
-- Until now only templates had names, so the history cards were headed by their
-- date. A workout gets its name when it is loaded from a saved workout, or when
-- it is saved as one. Ad-hoc sessions stay null and the UI derives a label from
-- the muscle groups actually trained — no backfill needed, and nothing breaks
-- for rows logged before this column existed.

alter table workouts add column if not exists name text;

-- Carry the name across when a session is saved as a template, so the history
-- card and the saved workout agree.
create or replace function save_workout_as_template(p_workout_id uuid, p_name text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_template_id uuid;
begin
  if not exists (select 1 from workouts w where w.id = p_workout_id) then
    raise exception 'Workout not found';
  end if;

  insert into workout_templates (user_id, name)
  values (auth.uid(), btrim(p_name))
  returning id into v_template_id;

  insert into template_entries (
    template_id, exercise_id, position, target_sets, target_weight_kg, target_reps
  )
  select
    v_template_id,
    s.exercise_id,
    row_number() over (order by min(s.created_at)),
    count(*),
    mode() within group (order by s.weight_kg),
    mode() within group (order by s.reps)
  from set_entries s
  where s.workout_id = p_workout_id
  group by s.exercise_id;

  update workouts set name = btrim(p_name) where id = p_workout_id;

  return v_template_id;
end;
$$;

grant execute on function save_workout_as_template(uuid, text) to authenticated;
