-- Collapses "find today's empty workout, else create one" into a single round
-- trip. The client previously did getUser + select + insert — three sequential
-- network calls before navigation could even begin.
--
-- security invoker, so RLS still applies and auth.uid() is the caller. That
-- also means the client no longer needs to fetch the user just to learn its own
-- id for the insert.

create or replace function start_workout(p_date date)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Reuse a session started today that never got a set, so tapping + twice
  -- doesn't litter the day. One with sets is never reused.
  select w.id into v_id
  from workouts w
  where w.user_id = auth.uid()
    and w.date = p_date
    and not exists (select 1 from set_entries s where s.workout_id = w.id)
  order by w.started_at desc
  limit 1;

  if v_id is null then
    insert into workouts (user_id, date)
    values (auth.uid(), p_date)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function start_workout(date) to authenticated;
