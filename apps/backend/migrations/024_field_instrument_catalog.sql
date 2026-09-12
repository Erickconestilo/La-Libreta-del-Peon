-- Catálogo adicional para protocolos de campo confirmados en TopoField.
-- No aplicar sin autorización explícita. No contiene parámetros ni datos de cliente.

INSERT INTO instrument_types (code, name, default_unit)
VALUES
  ('fissure_witness', 'Fisurómetro testigo (foto)', NULL),
  ('fissure_gauge', 'Fisurómetro digital', 'mm'),
  ('potentiometer', 'Potenciómetro', 'kOhm'),
  ('clinometer', 'Clinómetro', 'deg'),
  ('convergence_tape', 'Cinta de convergencia', 'mm')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    default_unit = EXCLUDED.default_unit,
    is_active = TRUE;
