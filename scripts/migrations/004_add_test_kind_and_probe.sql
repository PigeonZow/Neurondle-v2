-- Distinguish what an activation_tests row was aimed at:
--   'mystery'   — the round's hidden neuron (existing behavior, default)
--   'candidate' — an arbitrary map neuron tested from the inspector
--   'probe'     — a map-wide search-all probe (top features stored in probe_results)
ALTER TABLE activation_tests
  ADD COLUMN IF NOT EXISTS test_kind TEXT NOT NULL DEFAULT 'mystery',
  ADD COLUMN IF NOT EXISTS target_feature_index INTEGER,
  ADD COLUMN IF NOT EXISTS probe_results JSONB;
