-- Migration 002: add a per-game identifier
--
-- A "session" is one browser per day (session_token + date), but a user can
-- play multiple games in that window — and in future we may offer different
-- puzzle sets. game_id groups all rounds + activation tests belonging to a
-- single playthrough, so each game is cleanly separable for analysis.
--
-- It's a plain UUID generated client-side at game start (no FK) so a failed
-- write never blocks gameplay. Per-game score = SUM(round_attempts.score)
-- grouped by game_id.

ALTER TABLE round_attempts   ADD COLUMN IF NOT EXISTS game_id UUID;
ALTER TABLE activation_tests ADD COLUMN IF NOT EXISTS game_id UUID;

CREATE INDEX IF NOT EXISTS idx_round_attempts_game   ON round_attempts(game_id);
CREATE INDEX IF NOT EXISTS idx_activation_tests_game ON activation_tests(game_id);
