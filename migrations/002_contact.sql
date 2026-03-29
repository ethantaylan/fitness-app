-- ============================================================
-- Migration 002 — Contact V1
-- Table de messages de contact accessible aux visiteurs
-- comme aux utilisateurs connectés.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact (
  id         UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  first_name TEXT        NOT NULL,
  last_name  TEXT,
  email      TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_created_at
  ON contact(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_user_id
  ON contact(user_id, created_at DESC);

ALTER TABLE contact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_insert ON contact;
CREATE POLICY contact_insert ON contact
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

GRANT INSERT ON TABLE contact TO anon, authenticated;
