-- Hints are free (no score penalty), but usage is research signal: how much
-- evidence a player needed before pinning. hints_available records the scale,
-- since hint counts vary per puzzle. hints_used includes the first hint,
-- which the game auto-reveals at round start.
ALTER TABLE round_attempts
  ADD COLUMN IF NOT EXISTS hints_used INTEGER,
  ADD COLUMN IF NOT EXISTS hints_available INTEGER;
