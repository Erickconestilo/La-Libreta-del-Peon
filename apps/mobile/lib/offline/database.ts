/**
 * SQLite database setup and migrations
 * TopoField Fase 2 — Motor offline
 */

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'topofield.db';

let _db: SQLiteDatabase | null = null;

/**
 * Get or create the SQLite database instance (singleton)
 */
export function getDatabase(): SQLiteDatabase {
  if (_db) {
    return _db;
  }

  _db = openDatabaseSync(DB_NAME);
  return _db;
}

/**
 * Apply all pending migrations
 * Should be called once at app startup
 */
export async function applyMigrations(): Promise<void> {
  const db = getDatabase();

  // Get current schema version
  let currentVersion = 0;
  try {
    const result = db.getFirstSync<{ version: number }>('SELECT MAX(version) as version FROM schema_version');
    currentVersion = result?.version ?? 0;
  } catch {
    // Table doesn't exist yet, version is 0
  }

  console.log(`[SQLite] Current schema version: ${currentVersion}`);

  // List of migrations (add new ones at the end)
  const migrations = [
    { version: 1 },
    // Future migrations go here:
    // { version: 2 },
  ];

  // Apply pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[SQLite] Applying migration ${migration.version}...`);

      try {
        // Execute migration directly (SQL inlined)
        if (migration.version === 1) {
          executeMigration001(db);
        }

        console.log(`[SQLite] Migration ${migration.version} applied successfully`);
      } catch (err) {
        console.error(`[SQLite] Failed to apply migration ${migration.version}:`, err);
        throw err;
      }
    }
  }

  console.log('[SQLite] All migrations applied');
}

/**
 * Execute migration 001 (inline for now)
 */
function executeMigration001(db: SQLiteDatabase): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE INDEX IF NOT EXISTS idx_outbox_status
      ON outbox(status)
      WHERE status IN ('pending', 'error');

    CREATE INDEX IF NOT EXISTS idx_outbox_entity_type
      ON outbox(entity_type);

    CREATE INDEX IF NOT EXISTS idx_outbox_created_at
      ON outbox(created_at DESC);

    INSERT OR IGNORE INTO schema_version (version) VALUES (1);
  `);
}

/**
 * Close the database (for cleanup in tests)
 */
export function closeDatabase(): void {
  if (_db) {
    _db.closeSync();
    _db = null;
  }
}
