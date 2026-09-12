-- Preparación de permisos por obra. No aplicar sin autorización explícita.
-- `write` conserva el comportamiento actual; `read` permite consulta autenticada
-- sin habilitar ninguna escritura ni el token público de visitante.

ALTER TABLE project_memberships
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'write';

ALTER TABLE project_memberships
  DROP CONSTRAINT IF EXISTS project_memberships_access_level_check;

ALTER TABLE project_memberships
  ADD CONSTRAINT project_memberships_access_level_check
  CHECK (access_level IN ('read', 'write'));

CREATE INDEX IF NOT EXISTS idx_project_memberships_project_access
  ON project_memberships(project_id, access_level)
  WHERE is_active = TRUE;
