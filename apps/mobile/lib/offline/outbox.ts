/**
 * Outbox API — Cola persistente de sincronización offline
 * TopoField Fase 2
 */

import { getDatabase } from './database';

const MAX_PERSISTED_ERROR_LENGTH = 240;
const redactPersistedError = (value: string) => value
  .replace(/Bearer\s+\S+/gi, 'Bearer [oculto]')
  .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token oculto]')
  .replace(/(password|contraseña|token|authorization)\s*[:=]\s*\S+/gi, '$1=[oculto]')
  .slice(0, MAX_PERSISTED_ERROR_LENGTH);
import { normalizeOutboxSessionId, UNASSIGNED_OUTBOX_SESSION_ID } from './session-scope';
import type { OfflineQueueEntityType, OfflineQueueStatus } from '@shared/types';

export interface OutboxItem {
  id: string;
  clientRequestId: string;
  sessionId: string;
  entityType: OfflineQueueEntityType;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status: OfflineQueueStatus;
  createdAt: string;
  syncedAt: string | null;
  lastSyncAttemptAt: string | null;
  retryCount: number;
  errorMessage: string | null;
  conflictData: Record<string, unknown> | null;
}

interface OutboxRow {
  id: string;
  client_request_id: string;
  session_id: string;
  entity_type: string;
  operation: string;
  payload: string; // JSON string
  status: string;
  created_at: string;
  synced_at: string | null;
  last_sync_attempt_at: string | null;
  retry_count: number;
  error_message: string | null;
  conflict_data: string | null; // JSON string
}

export interface EnqueueParams {
  id: string;
  clientRequestId: string;
  /** Required in production. Tests may omit it and use the test scope. */
  sessionId?: string;
  entityType: OfflineQueueEntityType;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

function rowToItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    clientRequestId: row.client_request_id,
    sessionId: row.session_id,
    entityType: row.entity_type as OfflineQueueEntityType,
    operation: row.operation as 'insert' | 'update' | 'delete',
    payload: parseJsonRecord(row.payload),
    status: row.status as OfflineQueueStatus,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    lastSyncAttemptAt: row.last_sync_attempt_at,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    conflictData: row.conflict_data ? parseJsonRecord(row.conflict_data) : null,
  };
}

const parseJsonRecord = (value: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
};

/**
 * Enqueue a new item for sync
 */
export function enqueue(params: EnqueueParams): void {
  enqueueMany([params]);
}

/**
 * Enqueue related operations as one SQLite transaction.
 * A reading and its photo must be all-or-nothing so a process interruption
 * cannot leave a server reading without its local attachment operation.
 */
export function enqueueMany(items: EnqueueParams[]): void {
  if (items.length === 0) {
    return;
  }

  const db = getDatabase();

  db.execSync('BEGIN');

  try {
    for (const item of items) {
      const sessionId = normalizeOutboxSessionId(item.sessionId);
      if (!sessionId && process.env.NODE_ENV !== 'test') {
        throw new Error('Outbox sessionId is required for production writes');
      }

      db.runSync(
        `INSERT INTO outbox (id, client_request_id, session_id, entity_type, operation, payload)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.clientRequestId,
          sessionId ?? UNASSIGNED_OUTBOX_SESSION_ID,
          item.entityType,
          item.operation,
          JSON.stringify(item.payload)
        ]
      );
    }

    db.execSync('COMMIT');
  } catch (error) {
    try {
      db.execSync('ROLLBACK');
    } catch {
      // Preserve the original insert error if rollback itself is unavailable.
    }
    throw error;
  }
}

/**
 * Get all pending items (status = 'pending')
 */
export function getPending(sessionId?: string): OutboxItem[] {
  const db = getDatabase();
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return [];

  // Desempate por rowid: created_at solo tiene precisión de 1 segundo, así que
  // dos items encolados en el mismo segundo no tendrían orden garantizado sin
  // esto. rowid (columna implícita de SQLite) crece de forma monótona con
  // cada INSERT, así que sí refleja el orden real de encolado.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE session_id = ? AND status = ? ORDER BY created_at ASC, rowid ASC',
    [scopedSessionId, 'pending']
  );

  return rows.map(rowToItem);
}

/**
 * Get all items with errors
 */
export function getErrors(sessionId?: string): OutboxItem[] {
  const db = getDatabase();
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return [];

  // Mismo desempate por rowid que en getPending() — ver comentario allí.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE session_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC',
    [scopedSessionId, 'error']
  );

  return rows.map(rowToItem);
}

/**
 * Get all items with conflicts
 */
export function getConflicts(sessionId?: string): OutboxItem[] {
  const db = getDatabase();
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return [];

  // Mismo desempate por rowid que en getPending() — ver comentario allí.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE session_id = ? AND status = ? ORDER BY created_at DESC, rowid DESC',
    [scopedSessionId, 'conflict']
  );

  return rows.map(rowToItem);
}

export function getRoundOutboxItems(roundId: string, sessionId?: string): OutboxItem[] {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return [];

  const rows = getDatabase().getAllSync<OutboxRow>(
    `SELECT * FROM outbox
     WHERE session_id = ?
       AND status IN ('pending', 'syncing', 'error', 'conflict')
       AND entity_type = 'medicion'
     ORDER BY created_at ASC, rowid ASC`,
    [scopedSessionId]
  );

  return rows
    .map(rowToItem)
    .filter((item) => item.payload.roundId === roundId);
}

/**
 * Mark item as syncing (before sync attempt)
 */
export function markSyncing(id: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'syncing', last_sync_attempt_at = datetime('now'), retry_count = retry_count + 1
     WHERE id = ? AND session_id = ?`,
    [id, scopedSessionId]
  );
}

/**
 * Recover items left in `syncing` when the previous app process stopped.
 * Retrying is safe because server mutations use clientRequestId idempotency.
 */
export function recoverInterruptedItems(sessionId?: string): number {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return 0;

  const db = getDatabase();
  const result = db.runSync(
    `UPDATE outbox
     SET status = 'pending', last_sync_attempt_at = NULL, error_message = NULL, conflict_data = NULL
     WHERE status = 'syncing' AND session_id = ?`,
    [scopedSessionId]
  );
  const recovered = typeof result.changes === 'number' ? result.changes : 0;

  if (recovered > 0) {
    console.log(`[Outbox] Recovered ${recovered} interrupted syncing item(s)`);
  }

  return recovered;
}

/**
 * Mark item as synced (after successful sync)
 */
export function markSynced(id: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'synced', synced_at = datetime('now'), error_message = NULL
     WHERE id = ? AND session_id = ?`,
    [id, scopedSessionId]
  );
}

/**
 * Mark item as error (after failed sync)
 */
export function markError(id: string, errorMessage: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();
  const safeErrorMessage = redactPersistedError(errorMessage);

  db.runSync(
    `UPDATE outbox
     SET status = 'error', error_message = ?
     WHERE id = ? AND session_id = ?`,
    [safeErrorMessage, id, scopedSessionId]
  );
}

/**
 * Mark item as conflict (after 409 response)
 */
export function markConflict(id: string, conflictData: Record<string, unknown>, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'conflict', conflict_data = ?
     WHERE id = ? AND session_id = ?`,
    [JSON.stringify(conflictData), id, scopedSessionId]
  );
}

/**
 * Retry item (reset to pending)
 */
export function retryItem(id: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'pending',
         retry_count = 0,
         last_sync_attempt_at = NULL,
         synced_at = NULL,
         error_message = NULL,
         conflict_data = NULL
     WHERE id = ? AND session_id = ?`,
    [id, scopedSessionId]
  );
}

/**
 * Return an automatically failed item to pending without resetting retry state.
 * The next flush must respect the backoff calculated from the last attempt.
 */
export function markPendingForRetry(id: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'pending', error_message = NULL, conflict_data = NULL
     WHERE id = ? AND session_id = ?`,
    [id, scopedSessionId]
  );
}

/**
 * Delete item from outbox (after conflict resolution or manual discard)
 */
export function deleteItem(id: string, sessionId?: string): void {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return;

  const db = getDatabase();

  db.runSync('DELETE FROM outbox WHERE id = ? AND session_id = ?', [id, scopedSessionId]);
}

/**
 * Get count of pending items
 */
export function getPendingCount(sessionId?: string): number {
  const scopedSessionId = normalizeOutboxSessionId(sessionId);
  if (!scopedSessionId) return 0;

  const db = getDatabase();

  const result = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM outbox WHERE session_id = ? AND status = ?',
    [scopedSessionId, 'pending']
  );

  return result?.count ?? 0;
}
