/**
 * Tests para Sync Engine
 * TopoField Fase 2 — Motor offline
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as Network from 'expo-network';
import { getDatabase, closeDatabase, applyMigrations } from '../database';
import * as outbox from '../outbox';
import { flushOutbox, hasConnectivity, stopSyncEngine } from '../sync-engine';
import type { OutboxItem } from '../outbox';

// Mock de expo-network
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(),
}));

const mockGetNetworkStateAsync = Network.getNetworkStateAsync as jest.MockedFunction<
  typeof Network.getNetworkStateAsync
>;

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

      const mockSyncCallback = jest
        .fn<(item: OutboxItem) => Promise<void>>()
        .mockRejectedValue(conflictError);

      const synced = await flushOutbox(mockSyncCallback);

      expect(synced).toBe(0);

      const conflicts = outbox.getConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].id).toBe('test-1');
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
