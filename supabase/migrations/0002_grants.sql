-- Fixes: "permission denied for view activity_days"
--
-- RLS and GRANT are two separate gates and both have to be open. The policies
-- in 0001 decide which *rows* a user sees; a GRANT decides whether the role may
-- touch the relation at all. Supabase's default privileges cover objects created
-- by the postgres role, so a view created by a different DDL role arrives with
-- no grants and fails before RLS is ever consulted.
--
-- security_invoker on activity_days means the underlying tables are read with
-- the caller's own rights, so those need grants too. Safe to re-run.

grant select on exercises to authenticated;
grant select, insert, update, delete on day_logs to authenticated;
grant select, insert, update, delete on workouts to authenticated;
grant select, insert, update, delete on set_entries to authenticated;
grant select on activity_days to authenticated;
