-- ============================================================
-- SportAI — Schéma PostgreSQL complet
-- Compatible : PostgreSQL 14+ / Supabase
-- Auth       : Clerk (clerk_user_id = auth.uid() depuis le JWT)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TYPES ÉNUMÉRÉS
-- ============================================================

CREATE TYPE objective_type AS ENUM (
  'perte-poids',
  'prise-masse',
  'entretien',
  'competition',
  'hyrox',
  'crossfit',
  'running',
  'yoga',
  'remise-en-forme'
);

CREATE TYPE level_type AS ENUM (
  'débutant',
  'intermédiaire',
  'avancé'
);

CREATE TYPE gender_type AS ENUM (
  'homme',
  'femme',
  'autre'
);

CREATE TYPE availability_type AS ENUM (
  'matin',
  'midi',
  'soir',
  'indifférent'
);

CREATE TYPE feedback_type AS ENUM (
  'good',
  'normal',
  'hard'
);

CREATE TYPE subscription_status AS ENUM (
  'free',
  'premium',
  'cancelled'
);

-- ============================================================
-- TABLE : users
-- Miroir léger du compte Clerk — créé à la 1re connexion.
-- ============================================================

CREATE TABLE users (
  id              UUID                NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id   TEXT                NOT NULL UNIQUE,
  email           TEXT                NOT NULL,
  first_name      TEXT,
  subscription    subscription_status NOT NULL DEFAULT 'free',
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : user_profiles
-- Données saisies pendant l'onboarding (12 étapes).
-- Un seul profil actif par utilisateur (UNIQUE user_id).
-- ============================================================

CREATE TABLE user_profiles (
  id                     UUID            NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Étape 1 : Objectif
  objective              objective_type  NOT NULL,

  -- Étape 2 : Genre
  gender                 gender_type     NOT NULL,

  -- Étape 3 : Niveau
  level                  level_type      NOT NULL,

  -- Étape 4 : Mensurations
  age                    SMALLINT        NOT NULL CHECK (age BETWEEN 10 AND 120),
  height_cm              SMALLINT        NOT NULL CHECK (height_cm BETWEEN 100 AND 250),
  weight_kg              NUMERIC(5, 2)   NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),

  -- Étape 5 : Fréquence hebdomadaire
  weekly_frequency       SMALLINT        NOT NULL DEFAULT 3 CHECK (weekly_frequency BETWEEN 1 AND 7),

  -- Étape 6 : Durées de séance (tableau de minutes ex: {45, 60})
  session_duration       SMALLINT[]      NOT NULL DEFAULT '{45}',

  -- Étape 7 : Matériel disponible
  equipment              TEXT[]          NOT NULL DEFAULT '{}',

  -- Étape 8 : Exercices aimés / à éviter
  liked_exercises        TEXT[]          NOT NULL DEFAULT '{}',
  disliked_exercises     TEXT[]          NOT NULL DEFAULT '{}',

  -- Étape 9 : Disponibilité horaire
  availability           availability_type[] NOT NULL DEFAULT '{}',

  -- Étape 10 : Contraintes (blessures, nutrition)
  injuries               TEXT,
  nutrition_restrictions TEXT,

  -- Étape 11 : Objectif chiffré (optionnel)
  target_weight_kg       NUMERIC(5, 2),
  target_date            DATE,

  created_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

-- ============================================================
-- TABLE : programs
-- Programme sportif complet généré par l'IA (via GPT-4o).
-- Un seul programme actif par utilisateur (is_active = TRUE).
-- ============================================================

CREATE TABLE programs (
  id                       UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- program_overview
  duration_weeks           SMALLINT    NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  training_days_per_week   SMALLINT    NOT NULL CHECK (training_days_per_week BETWEEN 1 AND 7),
  summary                  TEXT        NOT NULL,
  agent_used               TEXT,                   -- ex: "Coach-Muscu-AI"

  -- Conseils globaux & disclaimer légal
  general_advice           TEXT,
  legal_disclaimer         TEXT,

  -- Recommandations nutritionnelles
  nutrition_daily_calories INTEGER     CHECK (nutrition_daily_calories > 0),
  nutrition_protein_g      INTEGER     CHECK (nutrition_protein_g > 0),
  nutrition_water_l        NUMERIC(3, 1) CHECK (nutrition_water_l > 0),
  nutrition_notes          TEXT,

  -- Programme actif ou archivé
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,

  -- Snapshot du profil au moment de la génération (JSON pour audit)
  profile_snapshot         JSONB,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contrainte : un seul programme actif par utilisateur
CREATE UNIQUE INDEX idx_programs_one_active
  ON programs(user_id)
  WHERE is_active = TRUE;

-- ============================================================
-- TABLE : program_weeks
-- Semaines d'un programme (week_number, focus).
-- ============================================================

CREATE TABLE program_weeks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id  UUID     NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL CHECK (week_number >= 1),
  focus       TEXT     NOT NULL,     -- ex: "Adaptation", "Progression", "Déload"

  UNIQUE (program_id, week_number)
);

-- ============================================================
-- TABLE : program_sessions
-- Séances définies dans le programme (Lundi, Mardi…).
-- warmup et cooldown sont stockés en JSONB car leur schéma
-- est fixe et non interrogé individuellement.
-- ============================================================

CREATE TABLE program_sessions (
  id            UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_id       UUID     NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
  day           TEXT     NOT NULL,         -- "Lundi", "Mardi", etc.
  session_label TEXT     NOT NULL,         -- "W1D1", "W2D3"
  type          TEXT     NOT NULL,         -- "Full Body", "Push", "Cardio HIIT"
  duration_min  SMALLINT NOT NULL CHECK (duration_min > 0),
  intensity     TEXT     NOT NULL,         -- "Légère", "Modérée", "Intense"
  warmup        JSONB    NOT NULL DEFAULT '[]',   -- [{ name, duration_sec?, reps? }]
  cooldown      JSONB    NOT NULL DEFAULT '[]',   -- [{ name, duration_sec?, reps? }]
  notes         TEXT,
  sort_order    SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : program_session_blocks
-- Blocs d'exercices dans une séance programme.
-- Exemple : "Bloc A – Compound", "Bloc B – Isolation"
-- ============================================================

CREATE TABLE program_session_blocks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  UUID     NOT NULL REFERENCES program_sessions(id) ON DELETE CASCADE,
  block_name  TEXT     NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : exercises
-- Exercices dans un bloc de séance programme.
-- reps stocké en TEXT pour gérer "12", "10-12", "AMRAP", "45 sec"
-- ============================================================

CREATE TABLE exercises (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  block_id    UUID     NOT NULL REFERENCES program_session_blocks(id) ON DELETE CASCADE,
  name        TEXT     NOT NULL,
  sets        SMALLINT NOT NULL CHECK (sets > 0),
  reps        TEXT     NOT NULL,           -- "12", "10-12", "AMRAP", "45 sec"
  load_kg     TEXT,                        -- "20-25 kg", "Poids du corps", "RPE 7"
  tempo       TEXT,                        -- "2-0-2-1"
  rest_sec    SMALLINT CHECK (rest_sec >= 0),
  alternative TEXT,
  notes       TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : daily_sessions
-- Séances quotidiennes générées par l'IA à la demande.
-- 1 séance max par utilisateur par jour (UNIQUE user_id, session_date).
-- ============================================================

CREATE TABLE daily_sessions (
  id                 UUID          NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id            UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  session_date_label TEXT          NOT NULL,   -- "lundi 14 mars" (format français affiché)
  intensity          TEXT          NOT NULL,
  goal               TEXT          NOT NULL,
  duration_min       SMALLINT      NOT NULL CHECK (duration_min > 0),
  motivation_message TEXT,
  feedback           feedback_type,             -- renseigné après la séance
  warmup             JSONB         NOT NULL DEFAULT '[]',
  cooldown           JSONB         NOT NULL DEFAULT '[]',
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, session_date)
);

-- ============================================================
-- TABLE : daily_session_blocks
-- Blocs d'exercices dans une séance quotidienne.
-- ============================================================

CREATE TABLE daily_session_blocks (
  id          UUID     NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  UUID     NOT NULL REFERENCES daily_sessions(id) ON DELETE CASCADE,
  block_name  TEXT     NOT NULL,
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- TABLE : daily_session_exercises
-- Exercices dans un bloc de séance quotidienne.
-- ============================================================

CREATE TABLE daily_session_exercises (
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
-- Mémorise l'étape courante de l'onboarding (0 à 12).
-- Permet de reprendre là où l'utilisateur s'est arrêté.
-- ============================================================

CREATE TABLE onboarding_progress (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_step SMALLINT    NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 12),
  is_complete  BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE : subscriptions
-- Abonnement Premium (structure prête pour Stripe).
-- ============================================================

CREATE TABLE subscriptions (
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
-- Historique du ChatWidget (Support IA).
-- role : 'user' | 'assistant'
-- ============================================================

CREATE TABLE chat_messages (
  id         UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEX
-- ============================================================

-- users
CREATE INDEX idx_users_clerk_id      ON users(clerk_user_id);
CREATE INDEX idx_users_email         ON users(email);

-- user_profiles
CREATE INDEX idx_profiles_user_id    ON user_profiles(user_id);
CREATE INDEX idx_profiles_objective  ON user_profiles(objective);

-- programs
CREATE INDEX idx_programs_user_id    ON programs(user_id);
CREATE INDEX idx_programs_active     ON programs(user_id) WHERE is_active = TRUE;

-- program_weeks
CREATE INDEX idx_pw_program_id       ON program_weeks(program_id);

-- program_sessions
CREATE INDEX idx_ps_week_id          ON program_sessions(week_id);
CREATE INDEX idx_ps_day              ON program_sessions(week_id, sort_order);

-- program_session_blocks
CREATE INDEX idx_psb_session_id      ON program_session_blocks(session_id);

-- exercises
CREATE INDEX idx_ex_block_id         ON exercises(block_id);

-- daily_sessions
CREATE INDEX idx_ds_user_id          ON daily_sessions(user_id);
CREATE INDEX idx_ds_user_date        ON daily_sessions(user_id, session_date DESC);
CREATE INDEX idx_ds_feedback         ON daily_sessions(user_id, feedback) WHERE feedback IS NOT NULL;

-- daily_session_blocks
CREATE INDEX idx_dsb_session_id      ON daily_session_blocks(session_id);

-- daily_session_exercises
CREATE INDEX idx_dse_block_id        ON daily_session_exercises(block_id);

-- chat_messages
CREATE INDEX idx_chat_user_id        ON chat_messages(user_id, created_at DESC);

-- ============================================================
-- TRIGGERS — mise à jour automatique de updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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
-- ROW LEVEL SECURITY (Supabase)
-- L'identité Clerk est transmise dans le JWT via auth.uid().
-- auth_user_id() mappe clerk_user_id → users.id (UUID interne).
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

-- Fonction helper : retourne l'UUID interne de l'utilisateur connecté
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM users WHERE clerk_user_id = auth.uid()::text LIMIT 1;
$$;

-- users
CREATE POLICY users_select ON users FOR SELECT USING (clerk_user_id = auth.uid()::text);
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (clerk_user_id = auth.uid()::text);
CREATE POLICY users_update ON users FOR UPDATE USING (clerk_user_id = auth.uid()::text);

-- user_profiles
CREATE POLICY profiles_select ON user_profiles FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY profiles_insert ON user_profiles FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY profiles_update ON user_profiles FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY profiles_delete ON user_profiles FOR DELETE USING (user_id = auth_user_id());

-- programs
CREATE POLICY programs_select ON programs FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY programs_insert ON programs FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY programs_update ON programs FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY programs_delete ON programs FOR DELETE USING (user_id = auth_user_id());

-- program_weeks (accès via programs)
CREATE POLICY pw_select ON program_weeks FOR SELECT USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);
CREATE POLICY pw_insert ON program_weeks FOR INSERT WITH CHECK (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);
CREATE POLICY pw_delete ON program_weeks FOR DELETE USING (
  program_id IN (SELECT id FROM programs WHERE user_id = auth_user_id())
);

-- program_sessions (accès via program_weeks → programs)
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
CREATE POLICY ps_delete ON program_sessions FOR DELETE USING (
  week_id IN (
    SELECT pw.id FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);

-- program_session_blocks
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
CREATE POLICY ds_select ON daily_sessions FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY ds_insert ON daily_sessions FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY ds_update ON daily_sessions FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY ds_delete ON daily_sessions FOR DELETE USING (user_id = auth_user_id());

-- daily_session_blocks
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
CREATE POLICY ob_select ON onboarding_progress FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY ob_insert ON onboarding_progress FOR INSERT WITH CHECK (user_id = auth_user_id());
CREATE POLICY ob_update ON onboarding_progress FOR UPDATE USING (user_id = auth_user_id());

-- subscriptions
CREATE POLICY sub_select ON subscriptions FOR SELECT USING (user_id = auth_user_id());

-- chat_messages
CREATE POLICY chat_select ON chat_messages FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (user_id = auth_user_id());

-- ============================================================
-- VUES
-- ============================================================

-- Vue tableau de bord : stats consolidées par utilisateur
CREATE VIEW v_user_dashboard AS
SELECT
  u.id                   AS user_id,
  u.clerk_user_id,
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
    SELECT COUNT(*)::INTEGER
    FROM daily_sessions ds
    WHERE ds.user_id = u.id
  )                      AS total_sessions,
  (
    SELECT COUNT(*)::INTEGER
    FROM daily_sessions ds
    WHERE ds.user_id = u.id AND ds.feedback = 'good'
  )                      AS good_sessions,
  (
    SELECT COUNT(*)::INTEGER
    FROM daily_sessions ds
    WHERE ds.user_id = u.id
      AND ds.session_date >= DATE_TRUNC('week', CURRENT_DATE)
  )                      AS sessions_this_week
FROM users u
LEFT JOIN user_profiles up ON up.user_id = u.id
LEFT JOIN programs p       ON p.user_id = u.id AND p.is_active = TRUE;

-- Vue séance quotidienne complète avec blocs + exercices
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

-- Vue programme complet avec semaines, séances, blocs et exercices
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
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Nombre de séances de la semaine en cours pour un utilisateur
CREATE OR REPLACE FUNCTION sessions_this_week(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(*)::INTEGER
  FROM daily_sessions
  WHERE user_id = p_user_id
    AND session_date >= DATE_TRUNC('week', CURRENT_DATE);
$$;

-- Streak : nombre de jours consécutifs avec une séance (en remontant depuis aujourd'hui)
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

-- Upsert du profil utilisateur (create ou update depuis l'onboarding)
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

-- Upsert d'un utilisateur à la connexion Clerk
CREATE OR REPLACE FUNCTION upsert_user(
  p_clerk_user_id TEXT,
  p_email         TEXT,
  p_first_name    TEXT DEFAULT NULL
)
RETURNS users LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result users;
BEGIN
  INSERT INTO users (clerk_user_id, email, first_name)
  VALUES (p_clerk_user_id, p_email, p_first_name)
  ON CONFLICT (clerk_user_id) DO UPDATE SET
    email      = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    updated_at = NOW()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Désactiver l'ancien programme et insérer le nouveau
-- (appelée côté serveur après génération IA)
CREATE OR REPLACE FUNCTION activate_program(p_program_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM programs WHERE id = p_program_id;
  -- Désactiver tous les autres programmes de ce user
  UPDATE programs SET is_active = FALSE
  WHERE user_id = v_user_id AND id <> p_program_id;
  -- Activer le nouveau
  UPDATE programs SET is_active = TRUE WHERE id = p_program_id;
END;
$$;

-- Ajouter le feedback à une séance quotidienne
CREATE OR REPLACE FUNCTION set_session_feedback(
  p_user_id    UUID,
  p_date       DATE,
  p_feedback   feedback_type
)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE daily_sessions
  SET feedback = p_feedback
  WHERE user_id = p_user_id AND session_date = p_date;
$$;

-- ============================================================
-- FIN DU SCHÉMA
-- ============================================================
