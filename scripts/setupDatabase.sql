-- Neurondle v2 Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Explanations Table (synced from Neuronpedia)
CREATE TABLE IF NOT EXISTS explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  feature_index INTEGER NOT NULL,
  description TEXT NOT NULL,
  explanation_model_name TEXT,
  type_name TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (model_id, layer, feature_index)
);

CREATE INDEX IF NOT EXISTS idx_explanations_lookup
  ON explanations(model_id, layer, feature_index);

-- Puzzles Table
CREATE TABLE IF NOT EXISTS puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 3),

  model_id TEXT NOT NULL,
  layer TEXT NOT NULL,
  feature_index INTEGER NOT NULL,

  ground_truth_label TEXT NOT NULL,

  answer_x FLOAT NOT NULL,
  answer_y FLOAT NOT NULL,

  hints JSONB NOT NULL,

  explanation_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (date, round_number)
);

CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(date);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL,
  date DATE NOT NULL,

  current_round INTEGER DEFAULT 1,
  total_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,

  research_consent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (session_token, date)
);

CREATE INDEX IF NOT EXISTS idx_sessions_lookup ON sessions(session_token, date);

-- Round Attempts Table
CREATE TABLE IF NOT EXISTS round_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL,

  -- Groups all rounds of one playthrough (a user may play multiple games
  -- per session). Generated client-side at game start; no FK on purpose.
  game_id UUID,

  pin_x FLOAT NOT NULL,
  pin_y FLOAT NOT NULL,

  distance FLOAT NOT NULL,
  score INTEGER NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round_attempts_session ON round_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_round_attempts_game ON round_attempts(game_id);

-- Activation Tests Table (research data)
-- We store the user's raw custom text (text_input) along with metadata
-- (length / token count / activations) for research use.
CREATE TABLE IF NOT EXISTS activation_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  puzzle_id UUID REFERENCES puzzles(id),
  round_number INTEGER NOT NULL,

  -- Same per-playthrough grouping id as round_attempts.game_id.
  game_id UUID,

  text_input TEXT,
  text_length INTEGER NOT NULL,
  max_activation FLOAT NOT NULL,
  token_count INTEGER NOT NULL,

  token_activations JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_tests_session ON activation_tests(session_id);
CREATE INDEX IF NOT EXISTS idx_activation_tests_puzzle ON activation_tests(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_activation_tests_game ON activation_tests(game_id);

-- Used Features Table (prevents repetition)
CREATE TABLE IF NOT EXISTS used_features (
  id INTEGER PRIMARY KEY DEFAULT 1,
  feature_keys TEXT[] NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize used_features with empty array
INSERT INTO used_features (id, feature_keys)
VALUES (1, '{}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (optional)
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE round_attempts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activation_tests ENABLE ROW LEVEL SECURITY;
