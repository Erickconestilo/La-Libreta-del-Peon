CREATE TABLE IF NOT EXISTS station_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1200),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_messages_station_created
ON station_messages(station_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_station_messages_created_by
ON station_messages(created_by);
