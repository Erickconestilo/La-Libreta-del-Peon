/**
 * Tests para Sync Engine
 * TopoField Fase 2 — Motor offline
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as Network from 'expo-network';
import { apiFetch } from '@/lib/api';
import { deletePreparedPhoto, uploadPreparedPhotoToSignedUrl } from '@/lib/photo-upload';
import { getDatabase, closeDatabase, applyMigrations } from '../database';
import * as outbox from '../outbox';
import { flushOutbox, hasConnectivity, stopSyncEngine } from '../sync-engine';
import { syncOutboxItem } from '../sync-handlers';
import type { OutboxItem } from '../outbox';

// Mock de expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn()
}));

jest.mock('@/lib/photo-upload', () => ({
  deletePreparedPhoto: jest.fn(),
  uploadPreparedPhotoToSignedUrl: jest.fn()
}));

const mockGetNetworkStateAsync = Network.getNetworkStateAsync as jest.MockedFunction<
  typeof Network.getNetworkStateAsync
>;
const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockDeletePreparedPhoto = deletePreparedPhoto as jest.MockedFunction<typeof deletePreparedPhoto>;
const mockUploadPreparedPhotoToSignedUrl = uploadPreparedPhotoToSignedUrl as jest.MockedFunction<typeof uploadPreparedPhotoToSignedUrl>;

describe('Sync Engine', () => {
  beforeEach(async () => {
    await applyMigrations();

    const db = getDatabase();
    db.runSync('DELETE FROM outbox');

    // Por defecto, simular conectividad
    mockGetNetworkStateAsync.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    mockApiFetch.mockReset();
    mockDeletePreparedPhoto.mockReset();
    mockUploadPreparedPhotoToSignedUrl.mockReset();
    mockUploadPreparedPhotoToSignedUrl.mockResolvedValue({ status: 200 } as never);
  });

  afterEach(() => {
    stopSyncEngine();
    closeDatabase();
    jest.clearAllMocks();
  });

  describe('hasConnectivity', () => {
    it('debe retornar true cuando hay conectividad', async () => {
      mockGetNetworkStateAsync.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      const connected = await hasConnectivity();
      expect(connected).toBe(true);
    });

    it('debe retornar false cuando no hay conexión', async () => {
      mockGetNetworkStateAsync.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const connected = await hasConnectivity();
      expect(connected).toBe(false);
    });

    it('debe retornar false cuando no hay Internet reachable', async () => {
      mockGetNetworkStateAsync.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false, // conectado a wifi pero sin Internet
      });

      const connected = await hasConnectivity();
      expect(connected).toBe(false);
    });
  });

  describe('flushOutbox', () => {
    it('debe sincronizar items pendientes con éxito', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: { message: 'Test' },
      });

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockResolvedValue(undefined);

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(1);
      expect(mockSyncCallback).toHaveBeenCalledTimes(1);

      const pending = outbox.getPending();
      expect(pending).toHaveLength(0);

      // Verificar que se marcó como synced
      const db = getDatabase();
      const item = db.getFirstSync<{ status: string }>(
        'SELECT status FROM outbox WHERE id = ?',
        ['test-1']
      );
      expect(item?.status).toBe('synced');
    });

    it('no debe sincronizar si no hay conectividad', async () => {
      mockGetNetworkStateAsync.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const mockSyncCallback = jest.fn<(item: OutboxItem) => Promise<void>>();

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);
      expect(mockSyncCallback).not.toHaveBeenCalled();
    });

    it('debe manejar errores de red con retry', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const networkError = new Error('Network timeout');
      (networkError as any).code = 'ETIMEDOUT';

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockRejectedValue(networkError);

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);

      // Item debe volver a pending para retry
      const pending = outbox.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].retryCount).toBeGreaterThan(0);
    });

    it('debe marcar como conflict errores 409', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const conflictError = new Error('Conflict');
      (conflictError as any).status = 409;
      (conflictError as any).code = 'ROUND_VERSION_CONFLICT';
      (conflictError as any).rawMessage = 'body=eyJhbGciOiJ9.abc.def';

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockRejectedValue(conflictError);

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);

      const conflicts = outbox.getConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('test-1');
      expect(conflicts[0].conflictData).toEqual({
        serverError: { status: 409, code: 'ROUND_VERSION_CONFLICT' }
      });
      expect(JSON.stringify(conflicts[0].conflictData)).not.toContain('eyJhbGciOiJ9');
      expect(JSON.stringify(conflicts[0].conflictData)).not.toContain('body=');
    });

    it('debe marcar como error errores de validación (422)', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      const validationError = new Error('Validation failed');
      (validationError as any).status = 422;

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockRejectedValue(validationError);

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);

      const errors = outbox.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe('test-1');
      expect(errors[0].errorMessage).toContain('Validation');
    });

    it('debe sincronizar múltiples items en orden', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: { order: 1 },
      });

      outbox.enqueue({
        id: 'test-2',
        clientRequestId: 'req-2',
        entityType: 'station_message',
        operation: 'insert',
        payload: { order: 2 },
      });

      const syncedItems: OutboxItem[] = [];
      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockImplementation(async (item: OutboxItem) => {
        syncedItems.push(item);
      });

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(2);
      expect(syncedItems).toHaveLength(2);
      expect((syncedItems[0].payload as any).order).toBe(1);
      expect((syncedItems[1].payload as any).order).toBe(2);
    });

    it('reproduce una visita, su estado y su evidencia en orden idempotente', async () => {
      mockApiFetch
        .mockResolvedValueOnce({ data: { id: 'server-visit-id' }, error: null } as never)
        .mockResolvedValueOnce({ data: { id: 'server-visit-id' }, error: null } as never)
        .mockResolvedValueOnce({ data: { id: 'server-visit-id', status: 'completed' }, error: null } as never)
        .mockResolvedValueOnce({
          data: { id: 'server-visit-id' },
          error: null
        } as never)
        .mockResolvedValueOnce({
          data: { path: 'mounting-visits/server-visit-id/evidence/photo.jpg', signedUrl: 'https://storage.example/upload' },
          error: null
        } as never)
        .mockResolvedValueOnce({ data: { id: 'server-evidence-id' }, error: null } as never);

      outbox.enqueue({
        id: 'mounting-create',
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        entityType: 'medicion',
        operation: 'insert',
        sessionId: 'session:test',
        payload: {
          kind: 'mounting_visit',
          stationId: 'station-id',
          visitInput: {
            changeSummary: 'Cambio',
            notes: null,
            status: 'draft',
            visitedAt: '2026-09-13T09:00:00.000Z'
          }
        }
      });
      outbox.enqueue({
        id: 'mounting-update',
        clientRequestId: '22222222-2222-4222-8222-222222222222',
        entityType: 'medicion',
        operation: 'update',
        sessionId: 'session:test',
        payload: {
          kind: 'mounting_visit_update',
          stationId: 'station-id',
          updateInput: { status: 'completed' },
          visitClientRequestId: '11111111-1111-4111-8111-111111111111',
          visitId: 'local-visit-id',
          visitInput: {
            changeSummary: 'Cambio',
            notes: null,
            status: 'draft',
            visitedAt: '2026-09-13T09:00:00.000Z'
          }
        }
      });
      outbox.enqueue({
        id: 'mounting-evidence',
        clientRequestId: '33333333-3333-4333-8333-333333333333',
        entityType: 'medicion',
        operation: 'update',
        sessionId: 'session:test',
        payload: {
          evidenceInput: {
            kind: 'prism',
            notes: null,
            positionX: null,
            positionY: null,
            prismId: null,
            title: 'PR-01'
          },
          kind: 'mounting_evidence',
          photo: {
            contentType: 'image/jpeg',
            fileSizeBytes: 1024,
            height: 800,
            localUri: 'file:///documents/topofield-offline-photos/mounting.jpg',
            width: 1200
          },
          stationId: 'station-id',
          visitClientRequestId: '11111111-1111-4111-8111-111111111111',
          visitId: 'local-visit-id',
          visitInput: {
            changeSummary: 'Cambio',
            notes: null,
            status: 'completed',
            visitedAt: '2026-09-13T09:00:00.000Z'
          }
        }
      });

      const synced = await flushOutbox(syncOutboxItem, 'session:test');

      expect(synced).toBe(3);
      expect(outbox.getPending('session:test')).toHaveLength(0);
      expect(mockApiFetch).toHaveBeenNthCalledWith(1, '/stations/station-id/mounting-visits', expect.objectContaining({ method: 'POST' }));
      expect(mockApiFetch).toHaveBeenNthCalledWith(2, '/stations/station-id/mounting-visits', expect.objectContaining({ method: 'POST' }));
      expect(mockApiFetch).toHaveBeenNthCalledWith(3, '/stations/station-id/mounting-visits/server-visit-id', {
        body: JSON.stringify({ status: 'completed' }),
        method: 'PATCH'
      });
      expect(mockApiFetch).toHaveBeenNthCalledWith(4, '/stations/station-id/mounting-visits', expect.objectContaining({ method: 'POST' }));
      expect(JSON.parse(String(mockApiFetch.mock.calls[3][1]?.body))).toMatchObject({ status: 'draft' });
      expect(mockApiFetch).toHaveBeenNthCalledWith(6, '/stations/station-id/mounting-visits/server-visit-id/evidence', expect.objectContaining({ method: 'POST' }));
      expect(mockDeletePreparedPhoto).toHaveBeenCalledTimes(1);
    });

    it('solo sincroniza los items de la sesión solicitante', async () => {
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

      const syncedItems: OutboxItem[] = [];
      const mockSyncCallback = jest.fn<(item: OutboxItem) => Promise<void>>().mockImplementation(async (item) => {
        syncedItems.push(item);
      });

      await flushOutbox(mockSyncCallback, 'session:a');

      expect(syncedItems.map((item) => item.sessionId)).toEqual(['session:a']);
      expect(outbox.getPending('session:a')).toHaveLength(0);
      expect(outbox.getPending('session:b').map((item) => item.id)).toEqual(['session-b-item']);
    });

    it('no marca como sincronizado un item si la sesión cambia durante la request', async () => {
      outbox.enqueue({
        id: 'stale-item',
        clientRequestId: 'stale-request',
        entityType: 'station_message',
        operation: 'insert',
        sessionId: 'session:a',
        payload: { owner: 'a' }
      });

      const mockSyncCallback = jest.fn<(item: OutboxItem) => Promise<void>>().mockImplementation(async () => {
        stopSyncEngine();
      });

      await flushOutbox(mockSyncCallback, 'session:a');

      const row = getDatabase().getFirstSync<{ status: string }>(
        'SELECT status FROM outbox WHERE id = ?',
        ['stale-item']
      );
      expect(row?.status).toBe('syncing');
      expect(outbox.getPending('session:a')).toHaveLength(0);
      expect(outbox.getPending('session:b')).toHaveLength(0);
    });

    it('debe respetar backoff exponencial entre retries', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      // Simular primer intento fallido
      const db = getDatabase();
      db.runSync(
        `UPDATE outbox SET
          retry_count = 1,
          last_sync_attempt_at = datetime('now'),
          status = 'pending'
        WHERE id = 'test-1'`
      );

      const mockSyncCallback = jest.fn<(item: OutboxItem) => Promise<void>>();

      // Intentar flush inmediatamente (debe saltarse por backoff)
      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);
      expect(mockSyncCallback).not.toHaveBeenCalled();
    });

    it('debe dejar de reintentar tras exceder MAX_RETRIES', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'req-1',
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      // Simular 6 retries previos (excede límite)
      const db = getDatabase();
      db.runSync(
        `UPDATE outbox SET
          retry_count = 6,
          last_sync_attempt_at = datetime('now', '-1 day'),
          status = 'pending'
        WHERE id = 'test-1'`
      );

      const mockSyncCallback = jest.fn<(item: OutboxItem) => Promise<void>>();

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);
      expect(mockSyncCallback).not.toHaveBeenCalled();

      const errors = outbox.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].errorMessage).toContain('Max retries exceeded');
    });
  });

  describe('idempotencia', () => {
    it('debe incluir clientRequestId en el payload para deduplicación', async () => {
      outbox.enqueue({
        id: 'test-1',
        clientRequestId: 'unique-req-id',
        entityType: 'station_message',
        operation: 'insert',
        payload: { message: 'Test' },
      });

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockResolvedValue(undefined);

      await flushOutbox(mockSyncCallback);

      expect(mockSyncCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          clientRequestId: 'unique-req-id',
        })
      );
    });

    it('debe prevenir duplicados con clientRequestId único en outbox', () => {
      const clientRequestId = 'duplicate-id';

      outbox.enqueue({
        id: 'id-1',
        clientRequestId,
        entityType: 'station_message',
        operation: 'insert',
        payload: {},
      });

      expect(() => {
        outbox.enqueue({
          id: 'id-2',
          clientRequestId, // mismo ID
          entityType: 'station_message',
          operation: 'insert',
          payload: {},
        });
      }).toThrow();
    });
  });
});
