/**
 * Tests para Outbox API
 * TopoField Fase 2 — Motor offline
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDatabase, closeDatabase, applyMigrations } from '../database';
import * as outbox from '../outbox';

describe('Outbox API', () => {
  beforeEach(async () => {
    // Inicializar base de datos antes de cada test
    await applyMigrations();

    // Limpiar outbox
    const db = getDatabase();
    db.runSync('DELETE FROM outbox');
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('enqueue', () => {
    it('debe encolar un item correctamente', () => {
      const id = 'test-id-1';
      const clientRequestId = 'client-req-1';

      outbox.enqueue({
        id,
        clientRequestId,
        entityType: 'station_message',
        operation: 'insert',
        payload: { message: 'Test message', stationId: 'station-1' },
      });

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(id);
      expect(pending[0].clientRequestId).toBe(clientRequestId);
      expect(pending[0].entityType).toBe('station_message');
      expect(pending[0].status).toBe('pending');
      expect(pending[0].payload).toEqual({ message: 'Test message', stationId: 'station-1' });
    });

    it('debe fallar si el client_request_id es duplicado', () => {
      const clientRequestId = 'duplicate-req-id';

      outbox.enqueue({
        id: 'id-1',
        clientRequestId,
        entityType: 'station_message',
        operation: 'insert',
        payload: { message: 'First' },
      });

      expect(() => {
        outbox.enqueue({
          id: 'id-2',
          clientRequestId, // mismo clientRequestId
          entityType: 'station_message',
          operation: 'insert',
          payload: { message: 'Second' },
        });
      }).toThrow();
    });

    it('debe encolar lectura y adjunto de forma atómica', () => {
      expect(() => {
        outbox.enqueueMany([
          {
            id: 'reading-id',
            clientRequestId: 'reading-request-id',
            entityType: 'medicion',
            operation: 'insert',
            payload: { valueNumeric: 2.4 }
          },
          {
            id: 'attachment-id',
            clientRequestId: 'reading-request-id',
            entityType: 'medicion',
            operation: 'update',
            payload: { kind: 'reading_attachment' }
          }
        ]);
      }).toThrow();

      expect(outbox.getPending()).toHaveLength(0);
    });
  });

  describe('getPending', () => {
    it('debe retornar solo items con status pending', () => {
      outbox.enqueue({
        id: 'pending-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.enqueue({
        id: 'pending-2',
        clientRequestId: 'req-2',
        entityType: 'incident',
        operation: 'insert',
        payload: {},
      });

      // Marcar uno como synced
      outbox.markSynced('pending-1');

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('pending-2');
    });

    it('debe retornar items ordenados por created_at ASC', () => {
      outbox.enqueue({
        id: 'first',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      // Pequeño delay para asegurar orden de timestamps
      const db = getDatabase();
      db.runSync("UPDATE outbox SET created_at = datetime('now', '-1 minute') WHERE id = 'first'");

      outbox.enqueue({
        id: 'second',
        clientRequestId: 'req-2',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const pending = outbox.getPending();
      expect(pending).toHaveLength(2);
      expect(pending[0].id).toBe('first');
      expect(pending[1].id).toBe('second');
    });

    it('separa las operaciones pendientes por sesión local', () => {
      outbox.enqueue({
        id: 'session-a-item',
        clientRequestId: 'session-a-request',
        entityType: 'station_message',
        operation: 'insert',
        sessionId: 'session:a',
        payload: { owner: 'a' }
      });
      outbox.enqueue({
        id: 'session-b-item',
        clientRequestId: 'session-b-request',
        entityType: 'station_message',
        operation: 'insert',
        sessionId: 'session:b',
        payload: { owner: 'b' }
      });

      expect(outbox.getPending('session:a').map((item) => item.id)).toEqual(['session-a-item']);
      expect(outbox.getPending('session:b').map((item) => item.id)).toEqual(['session-b-item']);
      expect(outbox.getPending('session:a')[0].sessionId).toBe('session:a');
    });

    it('no permite cambiar el estado de una operación desde otra sesión', () => {
      outbox.enqueue({
        id: 'owned-item',
        clientRequestId: 'owned-request',
        entityType: 'station_message',
        operation: 'insert',
        sessionId: 'session:a',
        payload: {}
      });

      outbox.markError('owned-item', 'wrong session', 'session:b');
      expect(outbox.getPending('session:a')).toHaveLength(1);
      expect(outbox.getErrors('session:a')).toHaveLength(0);
    });
  });

  it('aísla en cuarentena las filas creadas por una versión anterior sin sesión', async () => {
    const db = getDatabase();
    db.runSync('DELETE FROM schema_version');
    db.execSync('DROP TABLE outbox');
    db.execSync(`
      CREATE TABLE outbox (
        id TEXT PRIMARY KEY,
        client_request_id TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT,
        last_sync_attempt_at TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        conflict_data TEXT
      );
      INSERT INTO outbox (id, client_request_id, entity_type, operation, payload)
      VALUES ('legacy-item', 'legacy-request', 'station_message', 'insert', '{}');
    `);

    await applyMigrations();

    expect(outbox.getPending('session:a')).toHaveLength(0);
    expect(db.getFirstSync<{ session_id: string }>('SELECT session_id FROM outbox WHERE id = ?', ['legacy-item'])?.session_id)
      .toBe('__unassigned__');
  });

  describe('markSyncing', () => {
    it('debe marcar item como syncing e incrementar retry_count', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.markSyncing('test-id');

      const db = getDatabase();
      const item = db.getFirstSync<{ status: string; retry_count: number }>(
        'SELECT status, retry_count FROM outbox WHERE id = ?',
        ['test-id']
      );

      expect(item?.status).toBe('syncing');
      expect(item?.retry_count).toBe(1);
    });
  });

  describe('recoverInterruptedItems', () => {
    it('debe devolver a pending lo que quedó syncing tras cerrar la app', () => {
      outbox.enqueue({
        id: 'interrupted-id',
        clientRequestId: 'interrupted-req',
        entityType: 'medicion',
        operation: 'update',
        payload: { kind: 'reading_attachment' },
      });

      outbox.markSyncing('interrupted-id');

      expect(outbox.recoverInterruptedItems()).toBe(1);

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('interrupted-id');
      expect(pending[0].status).toBe('pending');
      expect(pending[0].lastSyncAttemptAt).toBeNull();
    });
  });

  describe('markSynced', () => {
    it('debe marcar item como synced y limpiar error_message', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.markError('test-id', 'Some error');
      outbox.markSynced('test-id');

      const db = getDatabase();
      const item = db.getFirstSync<{ status: string; error_message: string | null }>(
        'SELECT status, error_message FROM outbox WHERE id = ?',
        ['test-id']
      );

      expect(item?.status).toBe('synced');
      expect(item?.error_message).toBeNull();
    });
  });

  describe('markError', () => {
    it('debe marcar item como error con mensaje', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.markError('test-id', 'Network timeout');

      const errors = outbox.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe('test-id');
      expect(errors[0].status).toBe('error');
      expect(errors[0].errorMessage).toBe('Network timeout');
    });
  });

  describe('markConflict', () => {
    it('debe marcar item como conflict con datos del servidor', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const conflictData = { serverVersion: 'v2', reason: 'Modified by other user' };
      outbox.markConflict('test-id', conflictData);

      const conflicts = outbox.getConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('test-id');
      expect(conflicts[0].status).toBe('conflict');
      expect(conflicts[0].conflictData).toEqual(conflictData);
    });

    it('tolera conflict_data local corrupto sin ocultar el diagnóstico', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const db = getDatabase();
      db.runSync('UPDATE outbox SET status = ?, conflict_data = ? WHERE id = ?', [
        'conflict',
        '{not-json',
        'test-id'
      ]);

      expect(outbox.getConflicts()[0].conflictData).toEqual({});
    });
  });

  describe('retryItem', () => {
    it('debe resetear item a pending y limpiar errores', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.markError('test-id', 'Some error');
      outbox.retryItem('test-id');

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
      expect(pending[0].errorMessage).toBeNull();
    });

    it('debe reiniciar el backoff y el límite de intentos al reintentar', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const db = getDatabase();
      db.runSync(
        `UPDATE outbox
         SET status = 'error',
             retry_count = 6,
             last_sync_attempt_at = datetime('now', '-1 day'),
             synced_at = datetime('now', '-1 day'),
             error_message = 'Attempts exhausted'
         WHERE id = ?`,
        ['test-id']
      );

      outbox.retryItem('test-id');

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
      expect(pending[0].retryCount).toBe(0);
      expect(pending[0].lastSyncAttemptAt).toBeNull();
      expect(pending[0].syncedAt).toBeNull();
      expect(pending[0].errorMessage).toBeNull();
    });
  });

  describe('deleteItem', () => {
    it('debe eliminar item del outbox', () => {
      outbox.enqueue({
        id: 'test-id',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      outbox.deleteItem('test-id');

      const pending = outbox.getPending();
      expect(pending).toHaveLength(0);
    });
  });

  describe('getPendingCount', () => {
    it('debe retornar el número correcto de items pendientes', () => {
      expect(outbox.getPendingCount()).toBe(0);

      outbox.enqueue({
        id: 'id-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      expect(outbox.getPendingCount()).toBe(1);

      outbox.enqueue({
        id: 'id-2',
        clientRequestId: 'req-2',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      expect(outbox.getPendingCount()).toBe(2);

      outbox.markSynced('id-1');
      expect(outbox.getPendingCount()).toBe(1);
    });
  });

  describe('persistencia', () => {
    it('debe persistir datos tras cerrar y reabrir la base', async () => {
      outbox.enqueue({
        id: 'persistent-id',
        clientRequestId: 'persistent-req',
        entityType: 'station_message',
        operation: 'insert',
        payload: { message: 'Persistent message' },
      });

      // Cerrar y reabrir base de datos (simula reinicio de app)
      closeDatabase();
      await applyMigrations();

      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('persistent-id');
      expect(pending[0].payload).toEqual({ message: 'Persistent message' });
    });
  });
});
