-- ============================================================
-- Migration 001 — Personal records + program start date
-- Applique les deux changements nécessaires pour que les données
-- survivent à un clear cache navigateur.
-- Idempotent : peut être rejoué sans erreur.
-- ============================================================

-- ============================================================
-- 1. Colonne started_at sur programs
--    Stocke la date à laquelle l'utilisateur a démarré son
--    programme (programStartDate dans le store).
-- ============================================================

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS started_at DATE;


-- ============================================================
-- 2. Type ENUM pour les catégories de records
-- ============================================================

DO $$ BEGIN
  CREATE TYPE record_category AS ENUM ('force', 'cardio', 'corps', 'autre');
EXCEPTION WHEN duplicate_object THEN null;
END $$;


-- ============================================================
-- 3. Table personal_records
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_records (
  id           UUID          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT          NOT NULL,
  category     record_category NOT NULL DEFAULT 'force',
  record_date  DATE          NOT NULL,
  weight_kg    NUMERIC(6, 2) CHECK (weight_kg > 0),
  reps         SMALLINT      CHECK (reps > 0),
  distance_km  NUMERIC(7, 3) CHECK (distance_km > 0),
  time_min     NUMERIC(7, 2) CHECK (time_min > 0),
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. Index
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pr_user_id
  ON personal_records(user_id);

CREATE INDEX IF NOT EXISTS idx_pr_user_date
  ON personal_records(user_id, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_pr_user_name
  ON personal_records(user_id, name);


-- ============================================================
-- 5. Row Level Security
-- ============================================================

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_select ON personal_records;
DROP POLICY IF EXISTS pr_insert ON personal_records;
DROP POLICY IF EXISTS pr_delete ON personal_records;

CREATE POLICY pr_select ON personal_records
  FOR SELECT USING (user_id = auth_user_id());

CREATE POLICY pr_insert ON personal_records
  FOR INSERT WITH CHECK (user_id = auth_user_id());

CREATE POLICY pr_delete ON personal_records
  FOR DELETE USING (user_id = auth_user_id());

-- ============================================================
-- 6. Grants — le rôle authenticated doit pouvoir accéder à la table
-- ============================================================

GRANT SELECT, INSERT, DELETE ON personal_records TO authenticated;
