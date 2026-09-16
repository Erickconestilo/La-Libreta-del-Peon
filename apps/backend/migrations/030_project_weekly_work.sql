-- Planificación semanal operativa de Bitácora, separada de rondas, mediciones
-- y monitoring_work_execution_events. El estado aquí es solo estado del plan.
-- Preparación local únicamente: no aplicar sin autorización explícita.

CREATE TABLE IF NOT EXISTS project_weekly_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('leveling', 'manual', 'other')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done', 'blocked')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  client_request_id UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),
  CONSTRAINT project_weekly_work_items_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT project_weekly_work_items_completed_state CHECK (
    (status = 'done' AND completed_at IS NOT NULL)
    OR (status <> 'done' AND completed_at IS NULL)
  ),
  CONSTRAINT project_weekly_work_items_delete_actor CHECK (
    (deleted_at IS NULL AND deleted_by IS NULL)
    OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  ),
  UNIQUE (created_by, client_request_id)
);

CREATE INDEX IF NOT EXISTS idx_project_weekly_work_items_project_date
  ON project_weekly_work_items(project_id, work_date, created_at, id)
  WHERE deleted_at IS NULL;

ALTER TABLE project_weekly_work_items ENABLE ROW LEVEL SECURITY;

-- La API usa la conexión backend y aplica project_memberships. Las sesiones
-- anon/authenticated no pueden saltarse ese scope escribiendo la tabla directa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'project_weekly_work_items'
      AND policyname = 'legacy deny all'
  ) THEN
    CREATE POLICY "legacy deny all" ON project_weekly_work_items
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END;
$$;
