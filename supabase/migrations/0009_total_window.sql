-- How the combined total carries each lift forward.
--
--   'all' — heaviest ever. Monotonic; the line only climbs.
--   '8w'  — heaviest within the trailing 8 weeks. Decays if a lift drops out
--           of the rotation, so it can step down.
--
-- A single per-user setting rather than a per-lift one: mixing the two rules
-- inside one sum would produce a number that means nothing.

alter table profiles
  add column if not exists total_window text not null default 'all'
    check (total_window in ('all', '8w'));
