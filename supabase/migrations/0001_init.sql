-- Liftalot v1 schema.
--
-- Two things here are load-bearing and easy to undo by accident:
--
-- 1. Every `date` column holds a LOCAL calendar date computed on the client.
--    Nothing in this file calls now()::date or current_date, because the
--    server's idea of "today" is UTC and the user's is not. A 10pm Auckland
--    session written with a server date lands on tomorrow and silently breaks
--    the streak. Postgres `date` is timezone-free, so the client string
--    round-trips untouched.
--
-- 2. The heatmap level is derived in the activity_days view, never stored.
--    One source of truth, no rows to keep in sync.

-- ---------------------------------------------------------------- exercises

create table exercises (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  muscle_group  text not null,
  equipment     text not null,
  is_bodyweight boolean not null default false,
  -- null = global preset visible to everyone. Per-user custom exercises are a
  -- v2 feature; the column exists so adding them needs no migration.
  user_id       uuid references auth.users on delete cascade
);

create index exercises_user_id_idx on exercises (user_id);

-- Lets seed.sql be re-run without duplicating the preset library.
create unique index exercises_preset_name_idx
  on exercises (name) where user_id is null;

-- ----------------------------------------------------------------- day_logs

create table day_logs (
  user_id      uuid not null references auth.users on delete cascade,
  date         date not null,
  walked       boolean not null default false,
  -- Optional and deliberately unused in v1: a duration field implies a timer,
  -- and a timer implies the app is open during the walk.
  walk_minutes int,
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);

-- ----------------------------------------------------------------- workouts

create table workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  started_at timestamptz not null default now(),
  notes      text
);

create index workouts_user_date_idx on workouts (user_id, date desc);

-- -------------------------------------------------------------- set_entries

create table set_entries (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts on delete cascade,
  exercise_id uuid not null references exercises,
  set_number  int not null,
  -- null for bodyweight movements. kg is the only stored unit; a lb display
  -- setting is a v2 conversion at render time, not a second column.
  weight_kg   numeric(6, 2),
  reps        int not null check (reps > 0),
  -- Gives the logging screen a stable order for the exercises in a session;
  -- set_number only orders within one exercise.
  created_at  timestamptz not null default now()
);

create index set_entries_workout_idx on set_entries (workout_id);

-- ------------------------------------------------------------ activity_days

-- The grid reads from this view. level = (has_workout ? 2 : 0) + (walked ? 1 : 0)
-- is computed client-side from these two booleans.
--
-- The `exists` guard matters: "Start workout" inserts a workouts row up front,
-- so a session that is opened and abandoned would otherwise paint a workout
-- cell on a day where nothing was lifted. A workout counts once it has a set.
--
-- security_invoker makes the view honour the underlying tables' RLS instead of
-- running with the owner's rights, which would leak every user's grid.
create view activity_days with (security_invoker = true) as
select
  user_id,
  date,
  bool_or(walked)      as walked,
  bool_or(has_workout) as has_workout
from (
  select user_id, date, walked, false as has_workout
  from day_logs
  union all
  select w.user_id, w.date, false, true
  from workouts w
  where exists (select 1 from set_entries s where s.workout_id = w.id)
) t
group by user_id, date;

-- ---------------------------------------------------------------------- RLS

alter table exercises   enable row level security;
alter table day_logs    enable row level security;
alter table workouts    enable row level security;
alter table set_entries enable row level security;

-- Presets are readable by every signed-in user; custom rows only by their
-- owner. No insert/update/delete policy in v1, so the table is read-only from
-- the client and the seed is the only writer.
create policy exercises_select on exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy day_logs_all on day_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy workouts_all on workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- set_entries has no user_id of its own; ownership is inherited through the
-- parent workout. Wrapped in exists() so it stays a single index lookup.
create policy set_entries_all on set_entries
  for all to authenticated
  using (
    exists (
      select 1 from workouts w
      where w.id = set_entries.workout_id
        and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = set_entries.workout_id
        and w.user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------------- GRANTS

-- RLS and GRANT are separate gates and both must be open. The policies above
-- choose which rows a user sees; these decide whether the role may read the
-- relation at all. Granted explicitly rather than leaning on Supabase's default
-- privileges, which depend on which role happened to run the DDL — the usual
-- cause of "permission denied for view activity_days" on an otherwise correct
-- schema.
grant select on exercises to authenticated;
grant select, insert, update, delete on day_logs to authenticated;
grant select, insert, update, delete on workouts to authenticated;
grant select, insert, update, delete on set_entries to authenticated;
grant select on activity_days to authenticated;
