-- Player verdicts on auto-labels, cast on the reveal card after lock-in.
-- Append-only: every verdict tap (including changes of mind) inserts a row,
-- and offering a better label inserts another row with the suggestion set.
-- Analysis takes the latest row per (session_id, puzzle_id, game_id).
CREATE TABLE IF NOT EXISTS label_verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL,

  -- Same per-playthrough grouping id as round_attempts.game_id.
  game_id UUID,

  verdict TEXT NOT NULL CHECK (verdict IN ('fits', 'off', 'unsure')),
  suggested_label TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_label_verdicts_session ON label_verdicts(session_id);
CREATE INDEX IF NOT EXISTS idx_label_verdicts_puzzle ON label_verdicts(puzzle_id);
