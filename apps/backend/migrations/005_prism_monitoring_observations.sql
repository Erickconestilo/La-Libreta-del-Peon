ALTER TABLE prisms
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN source_system TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN external_id TEXT,
  ADD COLUMN prism_constant DOUBLE PRECISION,
  ADD COLUMN first_observed_at TIMESTAMPTZ,
  ADD COLUMN last_observed_at TIMESTAMPTZ,
  ADD COLUMN source_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN monitoring_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'missing', 'replaced', 'inactive'));

CREATE UNIQUE INDEX uq_prisms_source_system_external_id
  ON prisms(source_system, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX idx_prisms_project_id ON prisms(project_id);
CREATE INDEX idx_prisms_status ON prisms(status);
CREATE INDEX idx_prisms_external_id ON prisms(external_id);

CREATE TABLE prism_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prism_id UUID NOT NULL REFERENCES prisms(id) ON DELETE CASCADE,
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  source_system TEXT NOT NULL DEFAULT 'manual',
  external_key TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_format TEXT NOT NULL CHECK (source_format IN ('trimble_csv', 'trimble_rpd', 'leica_txt')),
  station_code TEXT,
  face TEXT,
  measured_at TIMESTAMPTZ,
  horizontal_angle DOUBLE PRECISION,
  vertical_angle DOUBLE PRECISION,
  slope_distance DOUBLE PRECISION,
  easting DOUBLE PRECISION,
  northing DOUBLE PRECISION,
  reduced_level DOUBLE PRECISION,
  prism_constant DOUBLE PRECISION,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_prism_observations_source_system_external_key
  ON prism_observations(source_system, external_key);

CREATE INDEX idx_prism_observations_prism_id ON prism_observations(prism_id);
CREATE INDEX idx_prism_observations_station_id ON prism_observations(station_id);
CREATE INDEX idx_prism_observations_station_code ON prism_observations(station_code);
CREATE INDEX idx_prism_observations_measured_at ON prism_observations(measured_at);
