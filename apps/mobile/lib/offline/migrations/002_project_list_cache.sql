-- =====================================================
-- Migración SQLite 002: caché de lista de Obras
-- =====================================================
-- La lista se guarda por sesión local para permitir arranque sin red sin
-- mezclar el alcance de distintas cuentas técnicas en el mismo dispositivo.

CREATE TABLE IF NOT EXISTS project_list_cache (
  cache_key TEXT PRIMARY KEY,
  projects_json TEXT NOT NULL,
  cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_version (version) VALUES (2);
