CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);

CREATE INDEX IF NOT EXISTS idx_prism_observations_unmapped_station_code
  ON prism_observations(station_code)
  WHERE station_id IS NULL AND station_code IS NOT NULL;
