ALTER TABLE stations
  ADD COLUMN source_system TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN external_id TEXT;

CREATE UNIQUE INDEX uq_stations_source_system_external_id
  ON stations(source_system, external_id);

ALTER TABLE station_readings
  ADD COLUMN source_system TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN external_key TEXT;

CREATE UNIQUE INDEX uq_station_readings_source_system_external_key
  ON station_readings(source_system, external_key);
