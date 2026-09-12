-- Memoria visual de visitas de montaje, separada de la galería histórica de estación.
-- Preparada para TopoField; NO aplicar en Supabase sin autorización explícita.
-- No contiene nombres de obra, códigos de cliente ni parámetros de medición.

CREATE TABLE IF NOT EXISTS station_mounting_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed', 'blocked')),
  notes TEXT,
  change_summary TEXT,
  recorded_by UUID NOT NULL REFERENCES users(id),
  client_request_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mounting_visit_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES station_mounting_visits(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  prism_id UUID REFERENCES prisms(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'general'
    CHECK (kind IN ('general', 'prism', 'reference', 'access', 'other')),
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  position_x NUMERIC CHECK (position_x IS NULL OR (position_x >= 0 AND position_x <= 1)),
  position_y NUMERIC CHECK (position_y IS NULL OR (position_y >= 0 AND position_y <= 1)),
  client_request_id UUID NOT NULL UNIQUE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_mounting_visits_station_date
  ON station_mounting_visits(station_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_station_mounting_visits_project_date
  ON station_mounting_visits(project_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_mounting_visit_evidence_visit_date
  ON mounting_visit_evidence(visit_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_mounting_visit_evidence_station
  ON mounting_visit_evidence(station_id, uploaded_at DESC);

ALTER TABLE station_mounting_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mounting_visit_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legacy deny all" ON station_mounting_visits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "legacy deny all" ON mounting_visit_evidence
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
