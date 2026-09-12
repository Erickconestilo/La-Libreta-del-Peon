-- Parte idempotente de finalización de visita/zona.
-- Preparación local únicamente: no aplicar sin autorización explícita.
-- No sustituye el estado de una ronda ni certifica una medición.

CREATE TABLE IF NOT EXISTS work_completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES monitoring_rounds(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  zone_label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('partial', 'completed', 'blocked')),
  completed_point_count INTEGER NOT NULL CHECK (completed_point_count >= 0),
  pending_point_count INTEGER NOT NULL CHECK (pending_point_count >= 0),
  pending_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_request_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_completion_reports_round
  ON work_completion_reports(round_id, reported_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_completion_reports_project_date
  ON work_completion_reports(project_id, reported_at DESC);

-- La API aplica el scope de obra. Supabase no debe exponer esta tabla
-- directamente a los roles anon/authenticated.
ALTER TABLE work_completion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legacy deny all" ON work_completion_reports
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
