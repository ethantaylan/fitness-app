-- ============================================================
-- Vincere � Sch�ma PostgreSQL complet
-- Compatible : PostgreSQL 14+ / Supabase
-- Auth       : Supabase Auth (auth.uid() = users.id)
-- Idempotent : peut �tre rejou� sans erreur (IF NOT EXISTS, etc.)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES �NUM�R�S
-- ============================================================

DO $$ BEGIN CREATE TYPE objective_type AS ENUM (
  'perte-poids','prise-masse','entretien','competition',
  'hyrox','crossfit','running','yoga','remise-en-forme'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE level_type AS ENUM (
  'd�butant','interm�diaire','avanc�'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE gender_type AS ENUM (
  'homme','femme','autre'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE availability_type AS ENUM (
  'matin','midi','soir','indiff�rent'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE feedback_type AS ENUM (
  'good','normal','hard'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE subscription_status AS ENUM (
  'free','premium','cancelled'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- TABLE : users
-- Profil public li� � auth.users (Supabase Auth).
-- L'id = auth.uid() : les deux UUIDs sont identiques.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              UUID                NOT NULL PRIMARY KEY,  -- = auth.uid()
  email           TEXT                NOT NULL,
  first_name      TEXT,
  subscription    subscription_status NOT NULL DEFAULT 'free',
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Migration : suppression de la colonne clerk_user_id (vestige Clerk)
ALTER TABLE users DROP COLUMN IF EXISTS clerk_user_id;

-- ============================================================
-- TABLE : user_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id                     UUID                NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective              objective_type      NOT NULL,
  gender                 gender_type         NOT NULL,
  level                  level_type          NOT NULL,
  age                    SMALLINT            NOT NULL CHECK (age BETWEEN 10 AND 120),
  height_cm              SMALLINT            NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
  weight_kg              NUMERIC(5, 2)       NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),
  weekly_frequency       SMALLINT            NOT NULL DEFAULT 3 CHECK (weekly_frequency BETWEEN 1 AND 7),
  session_duration       SMALLINT[]          NOT NULL DEFAULT '{45}',
  equipment              TEXT[]              NOT NULL DEFAULT '{}',
  liked_exercises        TEXT[]              NOT NULL DEFAULT '{}',
  disliked_exercises     TEXT[]              NOT NULL DEFAULT '{}',
  availability           availability_type[] NOT NULL DEFAULT '{}',
  injuries               TEXT,
  nutrition_restrictions TEXT,
  target_weight_kg       NUMERIC(5, 2),
  target_date            DATE,
  created_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================
-- TABLE : programs
-- ============================================================

CREATE TABLE IF NOT EXISTS programs (
  id                       UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duration_weeks           SMALLINT    NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  training_days_per_week   SMALLINT    NOT NULL CHECK (training_days_per_week BETWEEN 1 AND 7),
  summary                  TEXT        NOT NULL,
  agent_used               TEXT,
  general_advice           TEXT,
  legal_disclaimer         TEXT,
  nutrition_daily_calories INTEGER     CHECK (nutrition_daily_calories > 0),
  nutrition_protein_g      INTEGER     CHECK (nutrition_protein_g > 0),
  nutrition_water_l        NUMERIC(3, 1) CHECK (nutrition_water_l > 0),
  nutrition_notes          TEXT,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  profile_snapshot         JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_one_active
  ON programs(user_id)
  WHERE is_active = TRUE;

-- ============================================================
-- TABLE : program_weeks
-- ============================================================

CREATE TABLE IF NOT EXISTS program_weeks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id  UUID     NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL CHECK (week_number >= 1),
  focus       TEXT     NOT NULL,
  UNIQUE (program_id, week_number)
);

-- ============================================================
-- TABLE : program_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS program_sessions (
  id            UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_id       UUID     NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
  day           TEXT     NOT NULL,
  session_label TEXT     NOT NULL,
  type          TEXT     NOT NULL,
  duration_min  SMALLINT NOT NULL CHECK (duration_min > 0),
  intensity     TEXT     NOT NULL,
  warmup        JSONB    NOT NULL DEFAULT '[]',
  cooldown      JSONB    NOT NULL DEFAULT '[]',
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : program_session_blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS program_session_blocks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  UUID     NOT NULL REFERENCES program_sessions(id) ON DELETE CASCADE,
  block_name  TEXT     NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : exercises
-- ============================================================

CREATE TABLE IF NOT EXISTS exercises (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  block_id    UUID     NOT NULL REFERENCES program_session_blocks(id) ON DELETE CASCADE,
  name        TEXT     NOT NULL,
  sets        SMALLINT NOT NULL CHECK (sets > 0),
  reps        TEXT     NOT NULL,
  load_kg     TEXT,
  tempo       TEXT,
  rest_sec    SMALLINT CHECK (rest_sec >= 0),
  alternative TEXT,
  notes       TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : daily_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_sessions (
  id                 UUID          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  session_date_label TEXT          NOT NULL,
  intensity          TEXT          NOT NULL,
  goal               TEXT          NOT NULL,
  duration_min       SMALLINT      NOT NULL CHECK (duration_min > 0),
  motivation_message TEXT,
  feedback           feedback_type,
  warmup             JSONB         NOT NULL DEFAULT '[]',
  cooldown           JSONB         NOT NULL DEFAULT '[]',
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : daily_session_blocks
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_session_blocks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  UUID     NOT NULL REFERENCES daily_sessions(id) ON DELETE CASCADE,
  block_name  TEXT     NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : daily_session_exercises
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_session_exercises (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  block_id    UUID     NOT NULL REFERENCES daily_session_blocks(id) ON DELETE CASCADE,
  name        TEXT     NOT NULL,
  sets        SMALLINT NOT NULL CHECK (sets > 0),
  reps        TEXT     NOT NULL,
  load_kg     TEXT,
  tempo       TEXT,
  rest_sec    SMALLINT CHECK (rest_sec >= 0),
  alternative TEXT,
  notes       TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : onboarding_progress
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_step SMALLINT    NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 12),
  is_complete  BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID                NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id     TEXT                UNIQUE,
  stripe_subscription_id TEXT                UNIQUE,
  status                 subscription_status NOT NULL DEFAULT 'free',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : chat_messages
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : contact
-- Messages envoyés depuis le drawer de contact.
-- user_id est optionnel pour autoriser les visiteurs anonymes.
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

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id     ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_objective   ON user_profiles(objective);
CREATE INDEX IF NOT EXISTS idx_programs_user_id     ON programs(user_id);
CREATE INDEX IF NOT EXISTS idx_programs_active      ON programs(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pw_program_id        ON program_weeks(program_id);
CREATE INDEX IF NOT EXISTS idx_ps_week_id           ON program_sessions(week_id);
CREATE INDEX IF NOT EXISTS idx_ps_day               ON program_sessions(week_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_psb_session_id       ON program_session_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_ex_block_id          ON exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_ds_user_id           ON daily_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ds_user_date         ON daily_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_ds_feedback          ON daily_sessions(user_id, feedback) WHERE feedback IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsb_session_id       ON daily_session_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_dse_block_id         ON daily_session_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_id         ON chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_created_at   ON contact(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_user_id      ON contact(user_id, created_at DESC);

-- ============================================================
-- TRIGGERS � mise � jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at         ON users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at      ON user_profiles;
DROP TRIGGER IF EXISTS trg_programs_updated_at      ON programs;
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS trg_onboarding_updated_at    ON onboarding_progress;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER : cr�ation automatique de la ligne users � l'inscription
-- Supabase appelle cette fonction juste apr�s auth.users INSERT.
-- SECURITY DEFINER court-circuite le RLS pour la cr�ation initiale.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'first_name',
      NULLIF(split_part(
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        ' ', 1
      ), '')
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_session_blocks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises                ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_session_blocks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_session_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact                  ENABLE ROW LEVEL SECURITY;

-- Fonction helper : retourne l'UUID de l'utilisateur connect�
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT auth.uid();
$$;

-- users
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_select ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE USING (id = auth.uid());

-- user_profiles
DROP POLICY IF EXISTS profiles_select ON user_profiles;
DROP POLICY IF EXISTS profiles_insert ON user_profiles;
DROP POLICY IF EXISTS profiles_update ON user_profiles;
DROP POLICY IF EXISTS profiles_delete ON user_profiles;
CREATE POLICY profiles_select ON user_profiles FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY profiles_insert ON user_profiles FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY profiles_update ON user_profiles FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY profiles_delete ON user_profiles FOR DELETE USING (user_id = auth_user_id());

-- programs
DROP POLICY IF EXISTS programs_select ON programs;
DROP POLICY IF EXISTS programs_insert ON programs;
DROP POLICY IF EXISTS programs_update ON programs;
DROP POLICY IF EXISTS programs_delete ON programs;
CREATE POLICY programs_select ON programs FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY programs_insert ON programs FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY programs_update ON programs FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY programs_delete ON programs FOR DELETE USING (user_id = auth_user_id());

-- program_weeks
DROP POLICY IF EXISTS pw_select ON program_weeks;
DROP POLICY IF EXISTS pw_insert ON program_weeks;
DROP POLICY IF EXISTS pw_delete ON program_weeks;
CREATE POLICY pw_select ON program_weeks FOR SELECT USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);
CREATE POLICY pw_insert ON program_weeks FOR INSERT WITH CHECK (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);
CREATE POLICY pw_delete ON program_weeks FOR DELETE USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);

-- program_sessions
DROP POLICY IF EXISTS ps_select ON program_sessions;
DROP POLICY IF EXISTS ps_insert ON program_sessions;
DROP POLICY IF EXISTS ps_update ON program_sessions;
DROP POLICY IF EXISTS ps_delete ON program_sessions;
CREATE POLICY ps_select ON program_sessions FOR SELECT USING (
  week_id IN (
    SELECT pw.id FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY ps_insert ON program_sessions FOR INSERT WITH CHECK (
  week_id IN (
    SELECT pw.id FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY ps_update ON program_sessions FOR UPDATE USING (
  week_id IN (
    SELECT pw.id FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY ps_delete ON program_sessions FOR DELETE USING (
  week_id IN (
    SELECT pw.id FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);

-- program_session_blocks
DROP POLICY IF EXISTS psb_select ON program_session_blocks;
DROP POLICY IF EXISTS psb_insert ON program_session_blocks;
DROP POLICY IF EXISTS psb_delete ON program_session_blocks;
CREATE POLICY psb_select ON program_session_blocks FOR SELECT USING (
  session_id IN (
    SELECT ps.id FROM program_sessions ps
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY psb_insert ON program_session_blocks FOR INSERT WITH CHECK (
  session_id IN (
    SELECT ps.id FROM program_sessions ps
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY psb_delete ON program_session_blocks FOR DELETE USING (
  session_id IN (
    SELECT ps.id FROM program_sessions ps
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);

-- exercises
DROP POLICY IF EXISTS ex_select ON exercises;
DROP POLICY IF EXISTS ex_insert ON exercises;
DROP POLICY IF EXISTS ex_delete ON exercises;
CREATE POLICY ex_select ON exercises FOR SELECT USING (
  block_id IN (
    SELECT psb.id FROM program_session_blocks psb
    JOIN program_sessions ps ON ps.id = psb.session_id
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY ex_insert ON exercises FOR INSERT WITH CHECK (
  block_id IN (
    SELECT psb.id FROM program_session_blocks psb
    JOIN program_sessions ps ON ps.id = psb.session_id
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
CREATE POLICY ex_delete ON exercises FOR DELETE USING (
  block_id IN (
    SELECT psb.id FROM program_session_blocks psb
    JOIN program_sessions ps ON ps.id = psb.session_id
    JOIN program_weeks pw ON pw.id = ps.week_id
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);

-- daily_sessions
DROP POLICY IF EXISTS ds_select ON daily_sessions;
DROP POLICY IF EXISTS ds_insert ON daily_sessions;
DROP POLICY IF EXISTS ds_update ON daily_sessions;
DROP POLICY IF EXISTS ds_delete ON daily_sessions;
CREATE POLICY ds_select ON daily_sessions FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY ds_insert ON daily_sessions FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY ds_update ON daily_sessions FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY ds_delete ON daily_sessions FOR DELETE USING (user_id = auth_user_id());

-- daily_session_blocks
DROP POLICY IF EXISTS dsb_select ON daily_session_blocks;
DROP POLICY IF EXISTS dsb_insert ON daily_session_blocks;
DROP POLICY IF EXISTS dsb_delete ON daily_session_blocks;
CREATE POLICY dsb_select ON daily_session_blocks FOR SELECT USING (
  session_id IN (SELECT id FROM daily_sessions WHERE user_id = auth_user_id())
);
CREATE POLICY dsb_insert ON daily_session_blocks FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM daily_sessions WHERE user_id = auth_user_id())
);
CREATE POLICY dsb_delete ON daily_session_blocks FOR DELETE USING (
  session_id IN (SELECT id FROM daily_sessions WHERE user_id = auth_user_id())
);

-- daily_session_exercises
DROP POLICY IF EXISTS dse_select ON daily_session_exercises;
DROP POLICY IF EXISTS dse_insert ON daily_session_exercises;
DROP POLICY IF EXISTS dse_delete ON daily_session_exercises;
CREATE POLICY dse_select ON daily_session_exercises FOR SELECT USING (
  block_id IN (
    SELECT dsb.id FROM daily_session_blocks dsb
    JOIN daily_sessions ds ON ds.id = dsb.session_id
    WHERE ds.user_id = auth_user_id()
  )
);
CREATE POLICY dse_insert ON daily_session_exercises FOR INSERT WITH CHECK (
  block_id IN (
    SELECT dsb.id FROM daily_session_blocks dsb
    JOIN daily_sessions ds ON ds.id = dsb.session_id
    WHERE ds.user_id = auth_user_id()
  )
);
CREATE POLICY dse_delete ON daily_session_exercises FOR DELETE USING (
  block_id IN (
    SELECT dsb.id FROM daily_session_blocks dsb
    JOIN daily_sessions ds ON ds.id = dsb.session_id
    WHERE ds.user_id = auth_user_id()
  )
);

-- onboarding_progress
DROP POLICY IF EXISTS ob_select ON onboarding_progress;
DROP POLICY IF EXISTS ob_insert ON onboarding_progress;
DROP POLICY IF EXISTS ob_update ON onboarding_progress;
CREATE POLICY ob_select ON onboarding_progress FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY ob_insert ON onboarding_progress FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY ob_update ON onboarding_progress FOR UPDATE USING (user_id = auth_user_id());

-- subscriptions
DROP POLICY IF EXISTS sub_select ON subscriptions;
CREATE POLICY sub_select ON subscriptions FOR SELECT USING (user_id = auth_user_id());

-- chat_messages
DROP POLICY IF EXISTS chat_select ON chat_messages;
DROP POLICY IF EXISTS chat_insert ON chat_messages;
CREATE POLICY chat_select ON chat_messages FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (user_id = auth_user_id());

-- contact
DROP POLICY IF EXISTS contact_insert ON contact;
CREATE POLICY contact_insert ON contact
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ============================================================
-- VUES
-- ============================================================

DROP VIEW IF EXISTS v_user_dashboard CASCADE;
CREATE VIEW v_user_dashboard AS
SELECT
  u.id                   AS user_id,
  u.email,
  u.first_name,
  u.subscription,
  up.objective,
  up.level,
  up.weight_kg,
  up.weekly_frequency,
  p.id                   AS program_id,
  p.duration_weeks,
  p.training_days_per_week,
  p.summary              AS program_summary,
  (
    SELECT COUNT(*)::INTEGER FROM daily_sessions ds WHERE ds.user_id = u.id
  )                      AS total_sessions,
  (
    SELECT COUNT(*)::INTEGER FROM daily_sessions ds
    WHERE ds.user_id = u.id AND ds.feedback = 'good'
  )                      AS good_sessions,
  (
    SELECT COUNT(*)::INTEGER FROM daily_sessions ds
    WHERE ds.user_id = u.id
      AND ds.session_date >= DATE_TRUNC('week', CURRENT_DATE)
  )                      AS sessions_this_week
FROM users u
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN programs p       ON p.user_id = u.id AND p.is_active = TRUE;

DROP VIEW IF EXISTS v_daily_session_full CASCADE;
CREATE VIEW v_daily_session_full AS
SELECT
  ds.id                 AS session_id,
  ds.user_id,
  ds.session_date,
  ds.session_date_label,
  ds.intensity,
  ds.goal,
  ds.duration_min,
  ds.motivation_message,
  ds.feedback,
  dsb.id                AS block_id,
  dsb.block_name,
  dsb.sort_order        AS block_order,
  dse.id                AS exercise_id,
  dse.name              AS exercise_name,
  dse.sets,
  dse.reps,
  dse.load_kg,
  dse.tempo,
  dse.rest_sec,
  dse.alternative,
  dse.notes             AS exercise_notes,
  dse.sort_order        AS exercise_order
FROM daily_sessions ds
LEFT JOIN daily_session_blocks dsb    ON dsb.session_id = ds.id
LEFT JOIN daily_session_exercises dse ON dse.block_id = dsb.id
ORDER BY ds.session_date DESC, dsb.sort_order, dse.sort_order;

DROP VIEW IF EXISTS v_program_full CASCADE;
CREATE VIEW v_program_full AS
SELECT
  p.id                  AS program_id,
  p.user_id,
  p.summary,
  p.duration_weeks,
  p.training_days_per_week,
  p.agent_used,
  pw.week_number,
  pw.focus,
  ps.day,
  ps.session_label,
  ps.type               AS session_type,
  ps.duration_min,
  ps.intensity,
  ps.completed_at,
  psb.block_name,
  psb.sort_order        AS block_order,
  e.name                AS exercise_name,
  e.sets,
  e.reps,
  e.load_kg,
  e.tempo,
  e.rest_sec,
  e.alternative,
  e.notes               AS exercise_notes,
  e.sort_order          AS exercise_order
FROM programs p
JOIN program_weeks pw            ON pw.program_id = p.id
JOIN program_sessions ps         ON ps.week_id = pw.id
JOIN program_session_blocks psb  ON psb.session_id = ps.id
JOIN exercises e                 ON e.block_id = psb.id
WHERE p.is_active = TRUE
ORDER BY pw.week_number, ps.sort_order, psb.sort_order, e.sort_order;

-- ============================================================
-- GRANTS  (role authenticated = utilisateur connecte via Supabase Auth)
-- Le RLS controle les lignes ; le GRANT controle l'acces a la table.
-- Sans GRANT, PostgreSQL renvoie 42501 meme avec des policies RLS valides.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users                   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_profiles           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE programs                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE program_weeks           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE program_sessions        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE program_session_blocks  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exercises               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE daily_sessions          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE daily_session_blocks    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE daily_session_exercises TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE onboarding_progress     TO authenticated;
GRANT SELECT                          ON TABLE subscriptions          TO authenticated;
GRANT SELECT, INSERT                  ON TABLE chat_messages          TO authenticated;
GRANT INSERT                          ON TABLE contact                TO anon, authenticated;

GRANT SELECT ON v_user_dashboard      TO authenticated;
GRANT SELECT ON v_daily_session_full  TO authenticated;
GRANT SELECT ON v_program_full        TO authenticated;

GRANT EXECUTE ON FUNCTION upsert_user(UUID, TEXT, TEXT)                                                                                                                          TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_user_profile(UUID, objective_type, gender_type, SMALLINT, SMALLINT, NUMERIC, level_type, SMALLINT, SMALLINT[], TEXT[], TEXT[], TEXT[], availability_type[], TEXT, TEXT, NUMERIC, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_program(UUID)                                                                                                                             TO authenticated;
GRANT EXECUTE ON FUNCTION set_session_feedback(UUID, DATE, feedback_type)                                                                                                    TO authenticated;
GRANT EXECUTE ON FUNCTION sessions_this_week(UUID)                                                                                                                           TO authenticated;
GRANT EXECUTE ON FUNCTION streak_days(UUID)                                                                                                                                  TO authenticated;
GRANT EXECUTE ON FUNCTION auth_user_id()                                                                                                                                     TO authenticated;

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

CREATE OR REPLACE FUNCTION sessions_this_week(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER
  FROM daily_sessions
  WHERE user_id = p_user_id
    AND session_date >= DATE_TRUNC('week', CURRENT_DATE);
$$;

CREATE OR REPLACE FUNCTION streak_days(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql STABLE AS $$
DECLARE
  streak  INTEGER := 0;
  cur_day DATE    := CURRENT_DATE;
  has_row BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM daily_sessions
      WHERE user_id = p_user_id AND session_date = cur_day
    ) INTO has_row;
    EXIT WHEN NOT has_row;
    streak  := streak + 1;
    cur_day := cur_day - INTERVAL '1 day';
  END LOOP;
  RETURN streak;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_user_profile(
  p_user_id              UUID,
  p_objective            objective_type,
  p_gender               gender_type,
  p_age                  SMALLINT,
  p_height_cm            SMALLINT,
  p_weight_kg            NUMERIC,
  p_level                level_type,
  p_weekly_frequency     SMALLINT,
  p_session_duration     SMALLINT[],
  p_equipment            TEXT[],
  p_liked_exercises      TEXT[],
  p_disliked_exercises   TEXT[],
  p_availability         availability_type[],
  p_injuries             TEXT    DEFAULT NULL,
  p_nutrition            TEXT    DEFAULT NULL,
  p_target_weight_kg     NUMERIC DEFAULT NULL,
  p_target_date          DATE    DEFAULT NULL
)
RETURNS user_profiles LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result user_profiles;
BEGIN
  INSERT INTO user_profiles (
    user_id, objective, gender, age, height_cm, weight_kg, level,
    weekly_frequency, session_duration, equipment, liked_exercises,
    disliked_exercises, availability, injuries, nutrition_restrictions,
    target_weight_kg, target_date
  ) VALUES (
    p_user_id, p_objective, p_gender, p_age, p_height_cm, p_weight_kg,
    p_level, p_weekly_frequency, p_session_duration, p_equipment,
    p_liked_exercises, p_disliked_exercises, p_availability,
    p_injuries, p_nutrition, p_target_weight_kg, p_target_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    objective              = EXCLUDED.objective,
    gender                 = EXCLUDED.gender,
    age                    = EXCLUDED.age,
    height_cm              = EXCLUDED.height_cm,
    weight_kg              = EXCLUDED.weight_kg,
    level                  = EXCLUDED.level,
    weekly_frequency       = EXCLUDED.weekly_frequency,
    session_duration       = EXCLUDED.session_duration,
    equipment              = EXCLUDED.equipment,
    liked_exercises        = EXCLUDED.liked_exercises,
    disliked_exercises     = EXCLUDED.disliked_exercises,
    availability           = EXCLUDED.availability,
    injuries               = EXCLUDED.injuries,
    nutrition_restrictions = EXCLUDED.nutrition_restrictions,
    target_weight_kg       = EXCLUDED.target_weight_kg,
    target_date            = EXCLUDED.target_date,
    updated_at             = NOW()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_user(
  p_user_id    UUID,
  p_email      TEXT,
  p_first_name TEXT DEFAULT NULL
)
RETURNS users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result users;
BEGIN
  -- Vérifie que l'appelant ne peut modifier que sa propre ligne
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  INSERT INTO public.users (id, email, first_name, updated_at)
  VALUES (p_user_id, p_email, p_first_name, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
    updated_at = NOW()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION activate_program(p_program_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM programs WHERE id = p_program_id;
  UPDATE programs SET is_active = FALSE
  WHERE user_id = v_user_id AND id <> p_program_id;
  UPDATE programs SET is_active = TRUE WHERE id = p_program_id;
END;
$$;

CREATE OR REPLACE FUNCTION set_session_feedback(
  p_user_id  UUID,
  p_date     DATE,
  p_feedback feedback_type
)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE daily_sessions
  SET feedback = p_feedback
  WHERE user_id = p_user_id AND session_date = p_date;
$$;

-- ============================================================
-- FIN DU SCH�MA
-- ============================================================
