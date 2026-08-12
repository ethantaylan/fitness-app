-- Migration 005 — Notes personnelles sur les séances quotidiennes
-- Idempotente : peut être rejouée sans erreur.

ALTER TABLE daily_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE daily_sessions
  DROP CONSTRAINT IF EXISTS daily_sessions_notes_length;

ALTER TABLE daily_sessions
  ADD CONSTRAINT daily_sessions_notes_length
  CHECK (notes IS NULL OR char_length(notes) <= 2000);

-- La politique ds_update existante limite déjà la modification au propriétaire
-- de la séance. On la recrée ici pour rendre la migration autonome.
DROP POLICY IF EXISTS ds_update ON daily_sessions;
CREATE POLICY ds_update ON daily_sessions
  FOR UPDATE
  USING (user_id = auth_user_id())
  WITH CHECK (user_id = auth_user_id());

GRANT UPDATE ON daily_sessions TO authenticated;
