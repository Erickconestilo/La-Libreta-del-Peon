CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_is_active ON projects(is_active);

ALTER TABLE stations
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX idx_stations_project_id ON stations(project_id);

INSERT INTO projects (code, name, description)
VALUES
  ('campus-nord', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***'),
  ('sarria', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***'),
  ('sant-gervasi-de-casoles', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***'),
  ('putxe', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***'),
  ('sanllehy', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***'),
  ('maragall', '***REMOVED***', 'Obra base para estaciones de ***REMOVED***')
ON CONFLICT (code) DO NOTHING;
