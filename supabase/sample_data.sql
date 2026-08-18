-- Sample data: 12 weeks of training, walks, and three saved workouts.
--
-- Run in the Supabase SQL Editor. Safe to re-run — it clears its own rows first.
--
-- ┌─ BEFORE RUNNING ────────────────────────────────────────────────────────┐
-- │ 1. Set v_email below to the account you sign in with.                   │
-- │ 2. If your timezone is far from UTC, set v_today explicitly — the        │
-- │    server's current_date is UTC and may be a day off from your own       │
-- │    calendar day, which is the whole reason the app computes dates on     │
-- │    the client.                                                          │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- To remove it afterwards:
--   delete from workouts where notes = 'Sample data';
--   delete from workout_templates where name in ('Push', 'Pull', 'Legs');
--   -- walks are plain day_logs with nothing to distinguish them from real
--   -- ones, so delete by date range if you want them gone:
--   -- delete from day_logs where date >= current_date - 84;

do $$
declare
  v_email text := 'vondevnz@proton.me';   -- ← your sign-in email
  v_today date := current_date;           -- ← override if UTC ≠ your local day
  v_user  uuid;
  v_start date;
  v_template uuid;
  v_session text;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No account found for %. Set v_email to your sign-in address.', v_email;
  end if;

  -- Monday, 11 weeks back — so the grid is full rather than starting mid-week.
  v_start := date_trunc('week', v_today)::date - 77;

  -- Clean up a previous run. Only rows this script created.
  delete from workouts where user_id = v_user and notes = 'Sample data';
  delete from workout_templates where user_id = v_user and name in ('Push', 'Pull', 'Legs');

  ---------------------------------------------------------------- the plan

  create temp table _plan (
    ord       int,     -- exercise order within the session
    session   text,
    day_shift int,     -- 0 = Monday, 2 = Wednesday, 4 = Friday
    exercise  text,
    base_kg   numeric, -- null = bodyweight
    step_kg   numeric, -- added per week of training
    reps      int,
    sets      int
  ) on commit drop;

  insert into _plan values
    (1, 'Push', 0, 'Bench Press',              60,  1.25, 8, 4),
    (2, 'Push', 0, 'Incline Dumbbell Press', 22.5,   0.5, 10, 3),
    (3, 'Push', 0, 'Overhead Press',           35,  0.75, 8, 3),
    (4, 'Push', 0, 'Tricep Pushdown',          25,   0.5, 12, 3),
    (5, 'Push', 0, 'Lateral Raise',            10,  0.25, 15, 3),

    (1, 'Pull', 2, 'Deadlift',                100,   2.5, 5, 3),
    (2, 'Pull', 2, 'Barbell Row',              60,  1.25, 8, 4),
    (3, 'Pull', 2, 'Lat Pulldown',             50,     1, 10, 3),
    (4, 'Pull', 2, 'Pull-Up',                null,  null, 8, 3),
    (5, 'Pull', 2, 'Dumbbell Curl',            12,  0.25, 12, 3),

    (1, 'Legs', 4, 'Back Squat',               80,   2.5, 6, 4),
    (2, 'Legs', 4, 'Leg Press',               140,     5, 10, 3),
    (3, 'Legs', 4, 'Leg Curl',                 40,  0.75, 12, 3),
    (4, 'Legs', 4, 'Bulgarian Split Squat',    16,   0.5, 10, 3),
    (5, 'Legs', 4, 'Calf Raise',               60,   1.5, 15, 3);

  ------------------------------------------------------------- the sessions

  -- Week 6 is skipped: a deliberate 10-day gap, so the streak break, the
  -- heatmap's empty run, and the chart's calendar-time spacing all have
  -- something real to show.
  create temp table _days on commit drop as
  select distinct
    p.session,
    w.week,
    (v_start + (w.week * 7) + p.day_shift)::date as date
  from _plan p
  cross join generate_series(0, 11) as w(week)
  where w.week <> 6
    and (v_start + (w.week * 7) + p.day_shift)::date <= v_today;

  -- The session name is what history cards are headed by. Without it these
  -- fall back to a derived muscle-group label rather than reading Push/Pull/Legs.
  insert into workouts (user_id, date, started_at, name, notes)
  select v_user, d.date, d.date + time '18:15', d.session, 'Sample data'
  from _days d;

  insert into set_entries (workout_id, exercise_id, set_number, weight_kg, reps, created_at)
  select
    wo.id,
    ex.id,
    s.n,
    case
      when p.base_kg is null then null
      -- Linear progression, snapped to the half-kilo, with the top set of the
      -- day carrying a little more than the back-off sets.
      else round(((p.base_kg + p.step_kg * d.week) + case when s.n = 1 then 2.5 else 0 end) * 2) / 2
    end,
    -- Reps drift down slightly as the weight climbs, and the last set fades.
    greatest(1, p.reps - (d.week / 4)::int - case when s.n = p.sets then 1 else 0 end),
    -- created_at drives the exercise order on the logging screen and in
    -- save_workout_as_template, so it has to follow the planned order.
    d.date + time '18:15'
      + ((p.ord - 1) * interval '8 minutes')
      + ((s.n - 1) * interval '2 minutes')
  from _days d
  join _plan p on p.session = d.session
  join workouts wo on wo.user_id = v_user and wo.date = d.date and wo.notes = 'Sample data'
  join exercises ex on ex.name = p.exercise and ex.user_id is null
  cross join generate_series(1, p.sets) as s(n);

  ---------------------------------------------------------------- the walks

  -- Roughly 70% of days, deterministically chosen so a re-run produces the
  -- same picture. Skips the gap week so the streak actually breaks there.
  insert into day_logs (user_id, date, walked)
  select v_user, g.day::date, true
  from generate_series(v_start, v_today, interval '1 day') as g(day)
  where (extract(doy from g.day)::int * 7919) % 10 < 7
    and g.day::date not between (v_start + 42) and (v_start + 51)
  on conflict (user_id, date) do update set walked = true;

  -- Guarantee the last few days are alive, so the streak card and the ring on
  -- today's cell both have something to show.
  insert into day_logs (user_id, date, walked)
  select v_user, d::date, true
  from generate_series(v_today - 2, v_today, interval '1 day') as d
  on conflict (user_id, date) do update set walked = true;

  ------------------------------------------------------- the saved workouts

  foreach v_session in array array['Push', 'Pull', 'Legs'] loop
    insert into workout_templates (user_id, name)
    values (v_user, v_session)
    returning id into v_template;

    insert into template_entries (
      template_id, exercise_id, position, target_sets, target_weight_kg, target_reps
    )
    select
      v_template,
      ex.id,
      p.ord,
      p.sets,
      case when p.base_kg is null then null
           else round((p.base_kg + p.step_kg * 11) * 2) / 2 end,
      p.reps
    from _plan p
    join exercises ex on ex.name = p.exercise and ex.user_id is null
    where p.session = v_session;
  end loop;

  raise notice 'Sample data created for % — % workouts, % sets, % walk days.',
    v_email,
    (select count(*) from workouts where user_id = v_user and notes = 'Sample data'),
    (select count(*) from set_entries s join workouts w on w.id = s.workout_id
      where w.user_id = v_user and w.notes = 'Sample data'),
    (select count(*) from day_logs where user_id = v_user and walked);
end $$;
