-- Migration 006 - Objectif precis du profil sportif
-- Idempotente : peut etre rejouee sans erreur.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS goal_detail TEXT;

ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_goal_detail_length;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_goal_detail_length
  CHECK (goal_detail IS NULL OR char_length(goal_detail) <= 500);
