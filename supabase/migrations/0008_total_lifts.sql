-- The home screen's combined-total chart.
--
-- Up to five lifts, each contributing its heaviest-to-date, summed. The total
-- is monotonic by construction: a lift's contribution never falls, so the line
-- only climbs. That is the classic powerlifting-total reading, and it means the
-- card can't be knocked down by one light technique day.

create table total_lifts (
  user_id     uuid not null references auth.users on delete cascade,
  exercise_id uuid not null references exercises on delete cascade,
  position    int not null,
  primary key (user_id, exercise_id)
);

alter table total_lifts enable row level security;

create policy total_lifts_all on total_lifts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on total_lifts to authenticated;

-- Heaviest set of each lift on each day. The chart needs one number per
-- exercise per day, not every set — aggregating here keeps a year of training
-- to a few hundred rows over the wire instead of a few thousand.
--
-- Null weights are excluded: a bodyweight movement has nothing to contribute to
-- a sum of kilograms, which is also why the picker hides them.
create view exercise_day_tops with (security_invoker = true) as
select
  w.user_id,
  s.exercise_id,
  w.date,
  max(s.weight_kg) as top_weight
from set_entries s
join workouts w on w.id = s.workout_id
where s.weight_kg is not null
group by w.user_id, s.exercise_id, w.date;

grant select on exercise_day_tops to authenticated;
