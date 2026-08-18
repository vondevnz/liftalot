-- Groundwork for per-exercise progress charts.
--
-- No structural change is needed for that feature — set_entries already records
-- exercise_id, weight_kg, reps and created_at, and workouts carries the local
-- date. The history of any movement is a join away:
--
--   select w.date,
--          max(s.weight_kg)              as top_weight,
--          sum(s.weight_kg * s.reps)     as volume,
--          count(*)                      as sets
--   from set_entries s
--   join workouts w on w.id = s.workout_id
--   where s.exercise_id = $1
--   group by w.date
--   order by w.date;
--
-- What is missing is the index. set_entries is only indexed by workout_id, so
-- that query is a sequential scan over every set the user has ever logged —
-- fine at a few hundred rows, not fine after a year of training.

create index if not exists set_entries_exercise_idx
  on set_entries (exercise_id);
