-- ============================================================
-- NutriClinic Pro — production database schema (PostgreSQL 14+)
-- Purpose: server deployment path for the clinical platform.
-- The standalone browser build keeps the same logical model
-- (see js/store.js) and can be migrated via Settings → Data export.
-- ============================================================

BEGIN;

-- ---------- Identity & access ----------
CREATE TABLE clinics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  physician_name  TEXT,
  physician_title TEXT,
  contact         TEXT,
  address         TEXT,
  logo_file_id    UUID,
  accent          TEXT DEFAULT '#14213D',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,              -- Argon2id / bcrypt
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','clinician','assistant','readonly')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,                  -- store hash, never raw token
  ip         INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- ---------- Patients ----------
CREATE TABLE patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  public_id         TEXT NOT NULL,           -- e.g. CNP-2026-0001
  full_name         TEXT NOT NULL,
  dob               DATE,
  sex               TEXT CHECK (sex IN ('male','female')),
  phone             TEXT,
  email             TEXT,
  occupation        TEXT,
  reg_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  emergency_contact TEXT,
  height_cm         NUMERIC(5,1),
  initial_weight_kg NUMERIC(5,1),
  target_weight_kg  NUMERIC(5,1),
  current_weight_kg NUMERIC(5,1),
  waist_cm          NUMERIC(5,1),
  hip_cm            NUMERIC(5,1),
  body_fat_pct      NUMERIC(4,1),
  muscle_kg         NUMERIC(5,1),
  visceral_fat      NUMERIC(4,1),
  tbw_kg            NUMERIC(5,1),
  device_bmr        INTEGER,
  conditions        TEXT[],                  -- normalized into patient_conditions if preferred
  surgeries         TEXT,
  family_history    TEXT,
  supplements       TEXT,
  gi_conditions     TEXT,
  notes             TEXT,
  pregnancy_status  TEXT CHECK (pregnancy_status IN ('na','pregnant','lactating')) DEFAULT 'na',
  goal              TEXT CHECK (goal IN ('loss','maintain','gain','therapeutic')) DEFAULT 'loss',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  custom            JSONB NOT NULL DEFAULT '{}',
  consent_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, public_id)
);
CREATE INDEX patients_name_idx ON patients(clinic_id, lower(full_name));
CREATE INDEX patients_status_idx ON patients(clinic_id, status);

CREATE TABLE patient_weights (          -- longitudinal weight timeline
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  kg         NUMERIC(5,1) NOT NULL,
  source     TEXT,                      -- clinic / device / patient
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX patient_weights_pid_idx ON patient_weights(patient_id, date);

CREATE TABLE patient_medications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dose       TEXT,
  freq       TEXT,
  active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE patient_allergies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  kind       TEXT CHECK (kind IN ('allergy','intolerance','preference','note')) DEFAULT 'allergy',
  notes      TEXT
);

CREATE TABLE patient_restrictions (     -- clinician-defined exclusions
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  term       TEXT NOT NULL
);

-- ---------- Clinical assessment ----------
CREATE TABLE assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  bp_sys     INTEGER, bp_dia INTEGER, pulse INTEGER,
  notes      TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assessments_pid_idx ON assessments(patient_id, date DESC);

CREATE TABLE assessment_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  label         TEXT NOT NULL,
  value         NUMERIC(12,4),
  value_text    TEXT,
  unit          TEXT,
  ref_low       NUMERIC(12,4),
  ref_high      NUMERIC(12,4),
  ref_notes     TEXT
);

-- ---------- Measurements (body composition) ----------
CREATE TABLE measurements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  weight_kg    NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  muscle_kg    NUMERIC(5,1),
  visceral     NUMERIC(4,1),
  tbw_kg       NUMERIC(5,1),
  waist_cm     NUMERIC(5,1),
  hip_cm       NUMERIC(5,1),
  bmr_device   INTEGER,
  source       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX measurements_pid_idx ON measurements(patient_id, date DESC);

-- ---------- Energy plans (approved targets) ----------
CREATE TABLE energy_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  equation      TEXT NOT NULL,
  weight_basis  NUMERIC(5,1),
  bmr           INTEGER, activity TEXT, factor NUMERIC(4,3), tdee INTEGER,
  goal          TEXT,
  deficit       INTEGER DEFAULT 0,
  surplus       INTEGER DEFAULT 0,
  target        INTEGER NOT NULL,
  macros        JSONB NOT NULL,          -- {mode,p,c,f,proteinPerKg,fiber,sodium,fluids}
  safety        JSONB,
  explanation   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  approved_by   UUID REFERENCES users(id),
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX energy_plans_pid_idx ON energy_plans(patient_id, date DESC);

-- ---------- Diet plans (versioned) ----------
CREATE TABLE diet_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  group_id    UUID NOT NULL,             -- stable across versions
  version     INTEGER NOT NULL DEFAULT 1,
  based_on    UUID REFERENCES diet_plans(id),
  title       TEXT,
  approach_ids TEXT[] NOT NULL DEFAULT '{}',
  config      JSONB NOT NULL,            -- days, meals, snacks, window, cuisine, budget, exclusions…
  targets     JSONB NOT NULL,            -- kcal, pG, cG, fG, fiber, sodium
  notes       TEXT[] NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, version)
);
CREATE INDEX diet_plans_pid_idx ON diet_plans(patient_id, updated_at DESC);

CREATE TABLE plan_days (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id  UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  idx      INTEGER NOT NULL,
  UNIQUE (plan_id, idx)
);

CREATE TABLE plan_meals (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id   UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  meal_key TEXT,                          -- meal.breakfast … or custom
  name     TEXT, time TEXT, note TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_items (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id   UUID NOT NULL REFERENCES plan_meals(id) ON DELETE CASCADE,
  food_id   TEXT NOT NULL,                -- references food catalog (id)
  qty       NUMERIC(6,2) NOT NULL,        -- portions of the reference serving (~100 kcal)
  position  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE plan_item_alternatives (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id  UUID NOT NULL REFERENCES plan_items(id) ON DELETE CASCADE,
  food_id  TEXT NOT NULL,
  qty      NUMERIC(6,2) NOT NULL
);

-- ---------- Follow-ups ----------
CREATE TABLE followups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  weight_kg    NUMERIC(5,1),
  waist_cm     NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  muscle_kg    NUMERIC(5,1),
  visceral     NUMERIC(4,1),
  adherence    TEXT, appetite TEXT,
  gi           TEXT, feedback TEXT, observations TEXT, med_changes TEXT,
  labs_note    TEXT,
  next_date    DATE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX followups_pid_idx ON followups(patient_id, date DESC);

-- ---------- Knowledge base, files, templates ----------
CREATE TABLE kb_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  mime        TEXT, size_bytes BIGINT,
  text_content TEXT,                      -- extracted text for retrieval
  storage_key TEXT,                       -- object-storage pointer for the raw file
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id  UUID REFERENCES patients(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  kind        TEXT,                       -- logo / lab / comp / kb / other
  name        TEXT NOT NULL,
  mime        TEXT, size_bytes BIGINT,
  storage_key TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name         TEXT NOT NULL, name_ar TEXT,
  approach_ids TEXT[] NOT NULL DEFAULT '{}',
  config       JSONB NOT NULL,
  structure    JSONB NOT NULL,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Governance ----------
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  clinic_id  UUID,
  user_id    UUID,
  action     TEXT NOT NULL,               -- login, patient.create, plan.approve, data.export…
  entity     TEXT, entity_id TEXT,
  detail     JSONB,
  ip         INET,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_at_idx ON audit_log(at DESC);

CREATE TABLE consents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,               -- data_storage, research_deidentified…
  granted    BOOLEAN NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  document_key TEXT
);

-- updated_at triggers (abbreviated)
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE TRIGGER patients_touch BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER diet_plans_touch BEFORE UPDATE ON diet_plans FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;

-- Notes:
--  * All patient data tables are scoped to a clinic; enforce row-level security (RLS) per clinic_id.
--  * Files/backups: encrypt at rest (PG TDE / disk encryption) + object storage server-side encryption.
--  * The standalone build's JSON export maps 1:1 onto these tables (see docs/backend-and-security.md).
