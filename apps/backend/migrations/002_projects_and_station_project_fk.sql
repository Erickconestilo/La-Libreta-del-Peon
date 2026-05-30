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
  ('campus-nord', 'Campus Nord', 'Obra base para estaciones de Campus Nord'),
  ('sarria', 'Sarrià', 'Obra base para estaciones de Sarrià'),
  ('sant-gervasi-de-casoles', 'Sant Gervasi de Casoles', 'Obra base para estaciones de Sant Gervasi de Casoles'),
  ('putxe', 'Putxe', 'Obra base para estaciones de Putxe'),
  ('sanllehy', 'Sanllehy', 'Obra base para estaciones de Sanllehy'),
  ('maragall', 'Maragall', 'Obra base para estaciones de Maragall')
ON CONFLICT (code) DO NOTHING;
