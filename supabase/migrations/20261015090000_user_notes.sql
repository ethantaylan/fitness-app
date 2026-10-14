-- Migration 007 — Notes libres de l'utilisateur
-- Une note n'est pas rattachée à une séance : elle peut être ajoutée à tout moment.
-- Idempotente : peut être rejouée sans erreur.

CREATE TABLE IF NOT EXISTS user_notes (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        CHECK (title IS NULL OR char_length(title) <= 120),
  content     TEXT        NOT NULL CHECK (char_length(btrim(content)) > 0 AND char_length(content) <= 2000),
  note_date   DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_un_user_date
  ON user_notes(user_id, note_date DESC);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS un_select ON user_notes;
DROP POLICY IF EXISTS un_insert ON user_notes;
DROP POLICY IF EXISTS un_update ON user_notes;
DROP POLICY IF EXISTS un_delete ON user_notes;

CREATE POLICY un_select ON user_notes
  FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY un_insert ON user_notes
  FOR INSERT WITH CHECK (user_id = auth_user_id());

CREATE POLICY un_update ON user_notes
  FOR UPDATE USING (user_id = auth_user_id()) WITH CHECK (user_id = auth_user_id());

CREATE POLICY un_delete ON user_notes
  FOR DELETE USING (user_id = auth_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON user_notes TO authenticated;
