ALTER TABLE stations
  ADD COLUMN device_type TEXT CHECK (device_type IN ('leica', 'trimble')),
  ADD COLUMN map_status TEXT CHECK (map_status IN ('approximate', 'verified', 'resolved')),
  ADD COLUMN utm_zone TEXT,
  ADD COLUMN utm_easting DOUBLE PRECISION,
  ADD COLUMN utm_northing DOUBLE PRECISION,
  ADD COLUMN elevation DOUBLE PRECISION,
  ADD COLUMN resolved_method TEXT,
  ADD COLUMN display_mode TEXT;

CREATE TABLE station_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('gps_offline', 'mobile_network')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  utm_zone TEXT,
  utm_easting DOUBLE PRECISION,
  utm_northing DOUBLE PRECISION,
  elevation DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  declination DOUBLE PRECISION,
  speed_kmh DOUBLE PRECISION,
  map_url TEXT,
  captured_online BOOLEAN NOT NULL DEFAULT FALSE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE work_sessions (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  notes TEXT,
  coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE capture_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES work_sessions(id) ON DELETE SET NULL,
  device_type TEXT CHECK (device_type IN ('leica', 'trimble')),
  source TEXT CHECK (source IN ('gps_offline', 'mobile_network')),
  raw_payload JSONB NOT NULL,
  is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  suspicious_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_station_readings_station_id ON station_readings(station_id);
CREATE INDEX idx_station_readings_source ON station_readings(source);
CREATE INDEX idx_capture_logs_station_id ON capture_logs(station_id);
CREATE INDEX idx_capture_logs_project_id ON capture_logs(project_id);
CREATE INDEX idx_capture_logs_session_id ON capture_logs(session_id);
CREATE INDEX idx_capture_logs_is_suspicious ON capture_logs(is_suspicious);
