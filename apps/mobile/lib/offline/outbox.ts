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
export function enqueue(params: {
  id: string;
  clientRequestId: string;
  entityType: OfflineQueueEntityType;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
}): void {
  const db = getDatabase();

  db.runSync(
    `INSERT INTO outbox (id, client_request_id, entity_type, operation, payload)
     VALUES (?, ?, ?, ?, ?)`,
    [params.id, params.clientRequestId, params.entityType, params.operation, JSON.stringify(params.payload)]
  );
}

/**
 * Get all pending items (status = 'pending')
 */
export function getPending(): OutboxItem[] {
  const db = getDatabase();

  const rows = db.getAllSync<OutboxRow>('SELECT * FROM outbox WHERE status = ? ORDER BY created_at ASC', ['pending']);

  return rows.map(rowToItem);
}

/**
 * Get all items with errors
 */
export function getErrors(): OutboxItem[] {
  const db = getDatabase();

  const rows = db.getAllSync<OutboxRow>('SELECT * FROM outbox WHERE status = ? ORDER BY created_at DESC', ['error']);

  return rows.map(rowToItem);
}

/**
 * Get all items with conflicts
 */
export function getConflicts(): OutboxItem[] {
  const db = getDatabase();

  const rows = db.getAllSync<OutboxRow>('SELECT * FROM outbox WHERE status = ? ORDER BY created_at DESC', ['conflict']);

  return rows.map(rowToItem);
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
