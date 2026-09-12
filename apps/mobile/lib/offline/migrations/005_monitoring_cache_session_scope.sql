-- =====================================================
-- Migración SQLite 005: separar caché de auscultación por sesión
-- =====================================================
-- Las tablas 003/004 no guardaban el propietario de la sesión local. Se
-- invalidan al migrar para impedir que una cuenta reutilice datos de otra.

DROP TABLE IF EXISTS monitoring_round_list_cache_scoped;
CREATE TABLE monitoring_round_list_cache_scoped (
  cache_key TEXT NOT NULL,
  project_id TEXT NOT NULL,
  rounds_json TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (cache_key, project_id)
);

DROP TABLE IF EXISTS monitoring_round_cache_scoped;
CREATE TABLE monitoring_round_cache_scoped (
  cache_key TEXT NOT NULL,
  round_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  cached_at TEXT NOT NULL,
  PRIMARY KEY (cache_key, round_id)
);

DROP TABLE IF EXISTS monitoring_round_list_cache;
ALTER TABLE monitoring_round_list_cache_scoped RENAME TO monitoring_round_list_cache;

DROP TABLE IF EXISTS monitoring_round_cache;
ALTER TABLE monitoring_round_cache_scoped RENAME TO monitoring_round_cache;

INSERT OR IGNORE INTO schema_version (version) VALUES (5);
