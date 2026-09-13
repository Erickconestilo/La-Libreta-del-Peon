-- Registro append-only del resultado operativo de cada punto de una ronda.
-- Preparación local únicamente: no aplicar sin autorización explícita.
-- No sustituye la lectura metrológica ni el estado de cierre de la ronda.

CREATE TABLE IF NOT EXISTS monitoring_work_execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES monitoring_rounds(id) ON DELETE CASCADE,
  round_point_id UUID NOT NULL REFERENCES monitoring_round_points(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'completed', 'not_done', 'repeat_required', 'blocked')),
  reason TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES users(id),
  client_request_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    event_type IN ('started', 'completed')
    OR length(trim(coalesce(reason, ''))) > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_monitoring_work_execution_events_point_time
  ON monitoring_work_execution_events(round_point_id, occurred_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_work_execution_events_project_time
  ON monitoring_work_execution_events(project_id, occurred_at DESC);

ALTER TABLE monitoring_work_execution_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'monitoring_work_execution_events'
      AND policyname = 'legacy deny all'
  ) THEN
    CREATE POLICY "legacy deny all" ON monitoring_work_execution_events
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END;
$$;
