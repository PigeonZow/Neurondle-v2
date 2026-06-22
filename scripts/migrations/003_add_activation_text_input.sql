-- Migration 003: re-add activation_tests.text_input
--
-- Migration 001 dropped this column to make storing the user's raw custom text
-- impossible. We now collect that text again for research (the consent modal has
-- been updated accordingly), so we add the column back. It is nullable so a
-- missing value never blocks an insert.
--
-- Run this in the Supabase SQL editor (or via your migration tooling).

ALTER TABLE activation_tests ADD COLUMN IF NOT EXISTS text_input TEXT;
