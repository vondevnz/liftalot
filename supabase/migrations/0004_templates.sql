-- Saved workouts.
--
-- These live in their own tables and never touch `workouts`. That separation is
-- the point: activity_days counts any workout that has sets, so a template
-- parked in that table — even behind an is_template flag — would paint heatmap
-- cells and inflate streaks. Nothing here is visible to the grid.
--
-- One row per exercise rather than per set. "Bench Press — 3 sets, 60kg × 8" is
-- how people describe a session, and it maps onto the logging screen's single
-- input row per exercise without reworking it.

create table workout_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive, so "Monday" and "monday" can't both exist and leave you
-- guessing which is which in the picker.
create unique index workout_templates_user_name_idx
  on workout_templates (user_id, lower(btrim(name)));

create table template_entries (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references workout_templates on delete cascade,
  exercise_id      uuid not null references exercises,
  position         int not null,
  target_sets      int not null default 3 check (target_sets > 0),
  -- Null for bodyweight movements, same convention as set_entries.
  target_weight_kg numeric(6, 2),
  target_reps      int check (target_reps is null or target_reps > 0)
);

create index template_entries_template_idx
  on template_entries (template_id, position);

-- ---------------------------------------------------------------------- RLS

alter table workout_templates enable row level security;
alter table template_entries  enable row level security;

create policy workout_templates_all on workout_templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Ownership inherited through the parent template, as set_entries does through
-- its workout.
create policy template_entries_all on template_entries
  for all to authenticated
  using (
    exists (
      select 1 from workout_templates t
      where t.id = template_entries.template_id
        and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from workout_templates t
      where t.id = template_entries.template_id
        and t.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on workout_templates to authenticated;
grant select, insert, update, delete on template_entries  to authenticated;

-- ------------------------------------------------------- save from a session

-- Collapses "read the workout's sets, aggregate them, insert a template and N
-- entries" into one round trip, and does the aggregation where the data already
-- is. security invoker, so RLS decides which workout the caller may read.
create or replace function save_workout_as_template(p_workout_id uuid, p_name text)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_template_id uuid;
begin
  -- RLS makes another user's workout invisible rather than forbidden, so a
  -- missing row covers both "gone" and "not yours".
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
    -- Exercise order follows when each first appeared in the session.
    row_number() over (order by min(s.created_at)),
    count(*),
    -- A varied session collapses to its most common numbers. mode() skips
    -- nulls, so a bodyweight movement correctly yields null.
    mode() within group (order by s.weight_kg),
    mode() within group (order by s.reps)
  from set_entries s
  where s.workout_id = p_workout_id
  group by s.exercise_id;

  return v_template_id;
end;
$$;

grant execute on function save_workout_as_template(uuid, text) to authenticated;
