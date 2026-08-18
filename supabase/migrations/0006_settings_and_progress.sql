-- Unit preference, manual exercise ordering, and the aggregate the progress
-- list reads.
--
-- Weights stay stored in kilograms, always. Pounds is a display conversion at
-- render time, not a second column and not a rewrite of existing rows — so
-- switching the setting back and forth is lossless and nothing needs migrating.

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  unit       text not null default 'kg' check (unit in ('kg', 'lb')),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy profiles_all on profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select, insert, update on profiles to authenticated;

-- No row until the setting is first changed; a missing row reads as 'kg'. That
-- avoids a trigger on auth.users just to seed a default.

-- --------------------------------------------------------- manual ordering

create table exercise_order (
  user_id     uuid not null references auth.users on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position    int not null,
  primary key (user_id, exercise_id)
);

alter table exercise_order enable row level security;

create policy exercise_order_all on exercise_order
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on exercise_order to authenticated;

-- ------------------------------------------------------------- the totals

-- Drives the progress list: which movements you actually train, how much, and
-- when you last did them. Aggregating here rather than shipping every set row
-- to the client and counting in JavaScript.
--
-- security_invoker so the underlying RLS decides whose sets are counted.
create view exercise_totals with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  count(*)                 as sets,
  count(distinct w.date)   as sessions,
  max(w.date)              as last_done
from set_entries s
join workouts w on w.id = s.workout_id
group by w.user_id, s.exercise_id;

grant select on exercise_totals to authenticated;
