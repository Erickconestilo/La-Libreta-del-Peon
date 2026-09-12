/**
 * Outbox API — Cola persistente de sincronización offline
 * TopoField Fase 2
 */

import { getDatabase } from './database';
import type { OfflineQueueEntityType, OfflineQueueStatus } from '@shared/types';

export interface OutboxItem {
  id: string;
  clientRequestId: string;
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
  entityType: OfflineQueueEntityType;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
}

function rowToItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    clientRequestId: row.client_request_id,
    entityType: row.entity_type as OfflineQueueEntityType,
    operation: row.operation as 'insert' | 'update' | 'delete',
    payload: JSON.parse(row.payload),
    status: row.status as OfflineQueueStatus,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    lastSyncAttemptAt: row.last_sync_attempt_at,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    conflictData: row.conflict_data ? JSON.parse(row.conflict_data) : null,
  };
}

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
      db.runSync(
        `INSERT INTO outbox (id, client_request_id, entity_type, operation, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [item.id, item.clientRequestId, item.entityType, item.operation, JSON.stringify(item.payload)]
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
export function getPending(): OutboxItem[] {
  const db = getDatabase();

  // Desempate por rowid: created_at solo tiene precisión de 1 segundo, así que
  // dos items encolados en el mismo segundo no tendrían orden garantizado sin
  // esto. rowid (columna implícita de SQLite) crece de forma monótona con
  // cada INSERT, así que sí refleja el orden real de encolado.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE status = ? ORDER BY created_at ASC, rowid ASC',
    ['pending']
  );

  return rows.map(rowToItem);
}

/**
 * Get all items with errors
 */
export function getErrors(): OutboxItem[] {
  const db = getDatabase();

  // Mismo desempate por rowid que en getPending() — ver comentario allí.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE status = ? ORDER BY created_at DESC, rowid DESC',
    ['error']
  );

  return rows.map(rowToItem);
}

/**
 * Get all items with conflicts
 */
export function getConflicts(): OutboxItem[] {
  const db = getDatabase();

  // Mismo desempate por rowid que en getPending() — ver comentario allí.
  const rows = db.getAllSync<OutboxRow>(
    'SELECT * FROM outbox WHERE status = ? ORDER BY created_at DESC, rowid DESC',
    ['conflict']
  );

  return rows.map(rowToItem);
}

export function getRoundOutboxItems(roundId: string): OutboxItem[] {
  const rows = getDatabase().getAllSync<OutboxRow>(
    `SELECT * FROM outbox
     WHERE status IN ('pending', 'syncing', 'error', 'conflict')
       AND entity_type = 'medicion'
     ORDER BY created_at ASC, rowid ASC`
  );

  return rows
    .map(rowToItem)
    .filter((item) => item.payload.roundId === roundId);
}

/**
 * Mark item as syncing (before sync attempt)
 */
export function markSyncing(id: string): void {
  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'syncing', last_sync_attempt_at = datetime('now'), retry_count = retry_count + 1
     WHERE id = ?`,
    [id]
  );
}

/**
 * Recover items left in `syncing` when the previous app process stopped.
 * Retrying is safe because server mutations use clientRequestId idempotency.
 */
export function recoverInterruptedItems(): number {
  const db = getDatabase();
  const result = db.runSync(
    `UPDATE outbox
     SET status = 'pending', last_sync_attempt_at = NULL, error_message = NULL, conflict_data = NULL
     WHERE status = 'syncing'`
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
export function markSynced(id: string): void {
  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'synced', synced_at = datetime('now'), error_message = NULL
     WHERE id = ?`,
    [id]
  );
}

/**
 * Mark item as error (after failed sync)
 */
export function markError(id: string, errorMessage: string): void {
  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'error', error_message = ?
     WHERE id = ?`,
    [errorMessage, id]
  );
}

/**
 * Mark item as conflict (after 409 response)
 */
export function markConflict(id: string, conflictData: Record<string, unknown>): void {
  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'conflict', conflict_data = ?
     WHERE id = ?`,
    [JSON.stringify(conflictData), id]
  );
}

/**
 * Retry item (reset to pending)
 */
export function retryItem(id: string): void {
  const db = getDatabase();

  db.runSync(
    `UPDATE outbox
     SET status = 'pending', error_message = NULL, conflict_data = NULL
     WHERE id = ?`,
    [id]
  );
}

/**
 * Delete item from outbox (after conflict resolution or manual discard)
 */
export function deleteItem(id: string): void {
  const db = getDatabase();

  db.runSync('DELETE FROM outbox WHERE id = ?', [id]);
}

/**
 * Get count of pending items
 */
export function getPendingCount(): number {
  const db = getDatabase();

  const result = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM outbox WHERE status = ?', [
    'pending',
  ]);

  return result?.count ?? 0;
}
