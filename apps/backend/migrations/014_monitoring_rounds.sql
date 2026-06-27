CREATE TABLE IF NOT EXISTS instrument_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO instrument_types (code, name, default_unit)
VALUES
  ('total_station', 'Estacion total', NULL),
  ('digital_level', 'Nivel digital', 'mm'),
  ('piezometer', 'Piezometro', 'm'),
  ('distometer', 'Distanciometro', 'mm'),
  ('linometer', 'Linometro', 'mm'),
  ('inclinometer', 'Inclinometro', 'deg'),
  ('cant_rule', 'Regla de peralte', 'mm')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS control_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  environment TEXT NOT NULL CHECK (environment IN ('surface', 'tunnel', 'other')),
  pk TEXT,
  tramo TEXT,
  zona TEXT,
  seccion TEXT,
  side TEXT CHECK (side IN ('left', 'right', 'axis', 'crown', 'invert', 'other')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS monitoring_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  round_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  operator_id UUID REFERENCES users(id),
  instrument_serial TEXT,
  field_conditions TEXT CHECK (field_conditions IN ('good', 'regular', 'adverse')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_round_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES monitoring_rounds(id) ON DELETE CASCADE,
  control_point_id UUID NOT NULL REFERENCES control_points(id) ON DELETE RESTRICT,
  expected_instrument_type TEXT NOT NULL REFERENCES instrument_types(code),
  status TEXT NOT NULL CHECK (status IN ('pending', 'taken', 'skipped', 'cancelled')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, control_point_id, expected_instrument_type)
);

CREATE TABLE IF NOT EXISTS instrument_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_point_id UUID NOT NULL REFERENCES monitoring_round_points(id) ON DELETE CASCADE,
  control_point_id UUID NOT NULL REFERENCES control_points(id) ON DELETE RESTRICT,
  instrument_type TEXT NOT NULL REFERENCES instrument_types(code),
  reading_status TEXT NOT NULL CHECK (reading_status IN ('draft', 'confirmed', 'reviewed', 'rejected')),
  client_request_id UUID NOT NULL,
  value_numeric DOUBLE PRECISION,
  value_text TEXT,
  unit TEXT,
  measured_at TIMESTAMPTZ NOT NULL,
  measured_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (measured_by, client_request_id)
);

CREATE TABLE IF NOT EXISTS reading_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id UUID NOT NULL REFERENCES instrument_readings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('photo', 'note', 'file')),
  title TEXT,
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS control_point_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_point_id UUID NOT NULL REFERENCES control_points(id) ON DELETE CASCADE,
  instrument_type TEXT NOT NULL REFERENCES instrument_types(code),
  warning_value DOUBLE PRECISION,
  alarm_value DOUBLE PRECISION,
  unit TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  CHECK (
    warning_value IS NULL
    OR alarm_value IS NULL
    OR alarm_value >= warning_value
  )
);

CREATE TABLE IF NOT EXISTS project_code_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  zone TEXT NOT NULL,
  zone_color TEXT CHECK (zone_color IN ('blue', 'pink', 'green')),
  itinerary_number INTEGER NOT NULL,
  itinerary_order INTEGER NOT NULL DEFAULT 0,
  environment TEXT CHECK (environment IN ('surface', 'tunnel', 'other')),
  pk TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS project_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  value TEXT NOT NULL,
  configured_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, rule_type)
);

CREATE INDEX IF NOT EXISTS idx_control_points_project ON control_points(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rounds_project_status ON monitoring_rounds(project_id, status, round_date DESC);
CREATE INDEX IF NOT EXISTS idx_round_points_round_status ON monitoring_round_points(round_id, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_readings_round_point ON instrument_readings(round_point_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_control_point_history ON instrument_readings(control_point_id, instrument_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_attachments_reading ON reading_attachments(reading_id);
CREATE INDEX IF NOT EXISTS idx_thresholds_point_type_date ON control_point_thresholds(control_point_id, instrument_type, valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_code_catalog_project_zone
  ON project_code_catalog(project_id, zone_color, itinerary_order);
