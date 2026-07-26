-- =====================================================
-- Migración SQLite 001: Esquema inicial del motor offline
-- =====================================================
-- TopoField Fase 2 — Motor offline persistente
-- Fecha: 2026-07-26
--
-- Esta migración crea la tabla outbox para cola de sincronización
-- y la tabla de control de versiones de esquema.
-- =====================================================

-- Tabla de control de versiones
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabla outbox (cola de escritura persistente)
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  client_request_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'station_message',
    'incident',
    'station_photo',
    'prism_observation',
    'medicion',
    'campana',
    'sensor'
  )),
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'syncing',
    'synced',
    'error',
    'conflict'
  )),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT,
  last_sync_attempt_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  conflict_data TEXT
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_outbox_status
  ON outbox(status)
  WHERE status IN ('pending', 'error');

CREATE INDEX IF NOT EXISTS idx_outbox_entity_type
  ON outbox(entity_type);

CREATE INDEX IF NOT EXISTS idx_outbox_created_at
  ON outbox(created_at DESC);

-- Registrar esta migración
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
