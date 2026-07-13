-- Migration 001: drop activation_tests.text_input
--
-- The consent modal promises we never collect the user's raw custom text.
-- The `text_input` column made it possible to store exactly that, so we remove
-- it to make the privacy guarantee structurally impossible to violate. We keep
-- the metadata columns (text_length, token_count, max_activation,
-- token_activations) which are safe to collect.
--
-- Safe to run: activation_tests is empty in production (0 rows) at time of writing.
-- Run this in the Supabase SQL editor (or via your migration tooling).

ALTER TABLE activation_tests DROP COLUMN IF EXISTS text_input;
