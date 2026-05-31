CREATE TABLE IF NOT EXISTS project_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_memberships_user_id ON project_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_project_id ON project_memberships(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memberships_user_active
  ON project_memberships(user_id, is_active)
  WHERE is_active = TRUE;

INSERT INTO project_memberships (user_id, project_id, assigned_by, is_active)
SELECT u.id, p.id, NULL, TRUE
FROM users u
INNER JOIN projects p ON TRUE
WHERE u.role = 'topografo'
  AND NOT EXISTS (
    SELECT 1
    FROM project_memberships pm
    WHERE pm.user_id = u.id
      AND pm.project_id = p.id
  );
