-- Memoria visual de visitas de montaje, separada de la galería histórica de estación.
-- Preparada para TopoField; NO aplicar en Supabase sin autorización explícita.
-- No contiene nombres de obra, códigos de cliente ni parámetros de medición.

-- Integridad de tenant: evita asociar una visita a una obra distinta de la
-- estación mediante una escritura directa fuera del backend.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_id_project_id
  ON stations(id, project_id);

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'station_mounting_visits_station_project_fk'
      AND conrelid = 'public.station_mounting_visits'::regclass
  ) THEN
    ALTER TABLE station_mounting_visits
      ADD CONSTRAINT station_mounting_visits_station_project_fk
      FOREIGN KEY (station_id, project_id)
      REFERENCES stations(id, project_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

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

-- La estación de una evidencia debe ser la misma estación de su visita.
CREATE UNIQUE INDEX IF NOT EXISTS idx_station_mounting_visits_id_station_id
  ON station_mounting_visits(id, station_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'mounting_visit_evidence_visit_station_fk'
      AND conrelid = 'public.mounting_visit_evidence'::regclass
  ) THEN
    ALTER TABLE mounting_visit_evidence
      ADD CONSTRAINT mounting_visit_evidence_visit_station_fk
      FOREIGN KEY (visit_id, station_id)
      REFERENCES station_mounting_visits(id, station_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

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

-- PostgreSQL no admite CREATE POLICY IF NOT EXISTS; las guardas permiten
-- reintentar la migración después de una aplicación parcial.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'station_mounting_visits'
      AND policyname = 'legacy deny all'
  ) THEN
    CREATE POLICY "legacy deny all" ON station_mounting_visits
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mounting_visit_evidence'
      AND policyname = 'legacy deny all'
  ) THEN
    CREATE POLICY "legacy deny all" ON mounting_visit_evidence
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;
