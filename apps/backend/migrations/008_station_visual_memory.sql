CREATE TABLE station_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('general', 'point', 'reference', 'access', 'obstacle', 'other')),
  title TEXT,
  notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_station_photos_station_id ON station_photos(station_id);
CREATE INDEX idx_station_photos_uploaded_by ON station_photos(uploaded_by);
CREATE INDEX idx_station_photos_kind ON station_photos(kind);
