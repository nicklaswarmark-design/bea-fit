## Architecture rules
- Data access uses the browser Supabase client with RLS via react-query hooks in `src/lib/data.ts`; every private table is scoped by `user_id = auth.uid()`.
- Default program is seeded per user by the `seed_default_program` DB function (signup trigger + `reset_my_program` RPC) so templates stay user-editable.
- Active workouts autosave their player state to `workout_sessions.state` (plus localStorage backup); sets are written to `exercise_sets` only on finish.
- Progression suggestions (`suggestProgression` in `src/lib/program.ts`) are never auto-applied; the user confirms.
- Number inputs for weight/reps use `DecimalInput` (text field, accepts comma decimals, empty instead of 0) so iPhone Safari users can type values like 7,5.
- Goals live in the `goals` table (kind: race|strength|weight|habit); strength progress is derived from personal_records, never stored.
