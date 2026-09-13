/**
 * Sync Engine — Motor de sincronización offline
 * TopoField Fase 2
 *
 * Responsabilidades:
 * - Flush outbox cuando hay conectividad
 * - Retry con backoff exponencial
 * - Detección de conectividad
 * - Manejo de errores y conflictos
 */

import * as Network from 'expo-network';
import {
  getPending,
  markSyncing,
  markSynced,
  markError,
  markConflict,
  recoverInterruptedItems,
  markPendingForRetry,
  retryItem
} from './outbox';
import type { OutboxItem } from './outbox';
import { formatSafeErrorForLog } from '../safe-error-log';

// Configuración de retry
const RETRY_DELAYS = [
  1000,      // 1s
  5000,      // 5s
  15000,     // 15s
  30000,     // 30s
  60000,     // 1m
  300000,    // 5m (máximo)
];

const MAX_RETRIES = RETRY_DELAYS.length;

// Estado del sync engine
let isFlushingNow = false;
let connectivityCheckInterval: NodeJS.Timeout | null = null;
let lastConnectivityState: boolean | null = null;
let activeSyncSessionId: string | null = null;
let syncGeneration = 0;

/**
 * Inicializar el motor de sincronización
 * Debe llamarse al arrancar la app
 */
export function initSyncEngine(syncCallback: (item: OutboxItem) => Promise<void>, sessionId: string): void {
  if (!sessionId.trim()) {
    throw new Error('Sync engine sessionId is required');
  }

  console.log('[SyncEngine] Initializing...');
  activeSyncSessionId = sessionId;
  syncGeneration += 1;
  const generation = syncGeneration;

  recoverInterruptedItems(sessionId);

  // Iniciar monitoreo de conectividad
  startConnectivityMonitoring(syncCallback, sessionId, generation);

  // Intentar flush inicial (si hay conectividad)
  void flushOutbox(syncCallback, sessionId, generation);
}

/**
 * Detener el motor de sincronización
 * Útil para tests y cleanup
 */
export function stopSyncEngine(): void {
  syncGeneration += 1;
  activeSyncSessionId = null;
  if (connectivityCheckInterval) {
    clearInterval(connectivityCheckInterval);
    connectivityCheckInterval = null;
  }
  lastConnectivityState = null;
  isFlushingNow = false;
}

/**
 * Verificar si hay conectividad a Internet
 */
export async function hasConnectivity(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected === true && networkState.isInternetReachable === true;
  } catch (err) {
    console.error('[SyncEngine] Failed to check connectivity', formatSafeErrorForLog(err));
    return false;
  }
}

/**
 * Monitorear cambios de conectividad
 */
function startConnectivityMonitoring(
  syncCallback: (item: OutboxItem) => Promise<void>,
  sessionId: string,
  generation: number
): void {
  // Polling cada 30s (no hay listener nativo confiable en expo-network)
  connectivityCheckInterval = setInterval(() => {
    void (async () => {
      const connected = await hasConnectivity();

      if (connected) {
        if (lastConnectivityState === false) {
          console.log('[SyncEngine] Connectivity restored, flushing outbox...');
        }

        // Un fallo transitorio del servidor no cambia la conectividad. Hacer
        // flush en cada sondeo permite que el backoff de la outbox se cumpla.
        void flushOutbox(syncCallback, sessionId, generation);
      }

      lastConnectivityState = connected;
    })();
  }, 30000);

  // Check inicial
  void (async () => {
    lastConnectivityState = await hasConnectivity();
  })();
}

/**
 * Flush outbox: sincronizar todos los items pendientes
 * @returns Número de items sincronizados con éxito
 */
export async function flushOutbox(
  syncCallback: (item: OutboxItem) => Promise<void>,
  sessionId?: string,
  expectedGeneration?: number
): Promise<number> {
  const scopedSessionId = sessionId ?? activeSyncSessionId ?? undefined;
  const generation = expectedGeneration ?? syncGeneration;
  const isCurrentSync = () =>
    generation === syncGeneration && (!activeSyncSessionId || activeSyncSessionId === scopedSessionId);

  if (!isCurrentSync()) {
    console.log('[SyncEngine] Session changed, skipping stale flush');
    return 0;
  }

  // Evitar flush concurrente
  if (isFlushingNow) {
    console.log('[SyncEngine] Flush already in progress, skipping');
    return 0;
  }

  // Verificar conectividad
  const connected = await hasConnectivity();
  if (!connected) {
    console.log('[SyncEngine] No connectivity, skipping flush');
    return 0;
  }

  isFlushingNow = true;

  try {
    const pending = getPending(scopedSessionId);

    if (pending.length === 0) {
      console.log('[SyncEngine] No pending items');
      return 0;
    }

    console.log(`[SyncEngine] Flushing ${pending.length} pending items...`);

    let successCount = 0;

    // Sincronizar items secuencialmente (no en paralelo, para evitar race conditions)
    for (const item of pending) {
      if (!isCurrentSync()) {
        console.log('[SyncEngine] Session changed during flush, stopping stale work');
        break;
      }

      const success = await syncItem(item, syncCallback, scopedSessionId, isCurrentSync);
      if (success) {
        successCount++;
      }
    }

    console.log(`[SyncEngine] Flush complete: ${successCount}/${pending.length} synced`);
    return successCount;
  } finally {
    isFlushingNow = false;
  }
}

/**
 * Sincronizar un item individual
 * @returns true si se sincronizó con éxito
 */
async function syncItem(
  item: OutboxItem,
  syncCallback: (item: OutboxItem) => Promise<void>,
  sessionId: string | undefined,
  isCurrentSync: () => boolean
): Promise<boolean> {
  if (!isCurrentSync()) return false;

  // Verificar si debe reintentar (backoff exponencial)
  if (item.retryCount > 0 && item.lastSyncAttemptAt) {
    const delayMs = getRetryDelay(item.retryCount - 1);
    const nextRetryAt = parseSqliteUtcDate(item.lastSyncAttemptAt) + delayMs;
    const now = Date.now();

    if (now < nextRetryAt) {
      console.log(`[SyncEngine] Item ${item.id} not ready for retry yet (${Math.round((nextRetryAt - now) / 1000)}s remaining)`);
      return false;
    }
  }

  // Verificar límite de reintentos
  if (item.retryCount >= MAX_RETRIES) {
    console.warn(`[SyncEngine] Item ${item.id} exceeded max retries, marking as error`);
    markError(item.id, `Max retries exceeded (${MAX_RETRIES})`, sessionId);
    return false;
  }

  // Marcar como syncing
  if (!isCurrentSync()) return false;
  markSyncing(item.id, sessionId);

  try {
    // Ejecutar el callback de sincronización (inyectado desde el hook)
    if (!isCurrentSync()) return false;
    await syncCallback(item);

    if (!isCurrentSync()) {
      console.log(`[SyncEngine] Session changed while syncing item ${item.id}; leaving it recoverable`);
      return false;
    }

    // Éxito: marcar como synced
    markSynced(item.id, sessionId);
    console.log(`[SyncEngine] Item ${item.id} synced successfully`);
    return true;
  } catch (err: unknown) {
    if (!isCurrentSync()) {
      console.log(`[SyncEngine] Session changed after item ${item.id} started; leaving it recoverable`);
      return false;
    }

    const error = err as { code?: string; message?: string; rawMessage?: string | null; status?: number };

    console.error(
      `[SyncEngine] Failed to sync item ${item.id}`,
      formatSafeErrorForLog(error)
    );

    // Clasificar el error
    const errorType = classifyError(error);

    switch (errorType) {
      case 'conflict':
        // 409 Conflict: requiere intervención manual
        markConflict(item.id, { serverError: toPersistedConflictData(error) }, sessionId);
        console.warn(`[SyncEngine] Conflict detected for item ${item.id}`);
        break;

      case 'validation':
        // 422 Validation error: no retry automático
        markError(item.id, error.message || 'Validation error', sessionId);
        console.warn(`[SyncEngine] Validation error for item ${item.id}`);
        break;

      case 'network':
      case 'server':
        // Errores transitorios: volver a pending para retry
        markPendingForRetry(item.id, sessionId);
        console.log(`[SyncEngine] Item ${item.id} will retry (${errorType})`);
        break;

      default:
        // Error desconocido: marcar como error sin retry
        markError(item.id, error.message || 'Unknown error', sessionId);
        console.error(`[SyncEngine] Unknown error for item ${item.id}`);
    }

    return false;
  }
}

/**
 * Clasificar tipo de error para decidir estrategia de retry
 */
function classifyError(error: { message?: string; status?: number; code?: string }): 'network' | 'server' | 'conflict' | 'validation' | 'unknown' {
  // Error HTTP con status
  if (error.status) {
    if (error.status === 409) return 'conflict';
    if (error.status === 422 || error.status === 400) return 'validation';
    if (error.status >= 500) return 'server';
  }

  // Errores de red (timeout, no connection)
  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    error.message?.includes('timeout') ||
    error.message?.includes('network') ||
    error.message?.includes('connection')
  ) {
    return 'network';
  }

  return 'unknown';
}

const toPersistedConflictData = (error: { status?: number; code?: string }) => {
  const safeData: Record<string, number | string> = {};

  if (typeof error.status === 'number' && Number.isInteger(error.status)) {
    safeData.status = error.status;
  }

  if (typeof error.code === 'string' && /^[A-Z0-9_.-]{1,48}$/i.test(error.code)) {
    safeData.code = error.code;
  }

  return safeData;
};

/**
 * Obtener el delay en ms para un retry específico
 */
function getRetryDelay(retryIndex: number): number {
  return RETRY_DELAYS[Math.min(retryIndex, RETRY_DELAYS.length - 1)];
}

/**
 * Parsear un timestamp de SQLite (formato `datetime('now')`: "YYYY-MM-DD HH:MM:SS",
 * siempre en UTC, sin sufijo de zona) como milisegundos desde epoch.
 *
 * `new Date("YYYY-MM-DD HH:MM:SS")` lo interpreta como hora LOCAL del dispositivo,
 * no UTC. Fuera de UTC (p. ej. Europe/Madrid, UTC+2 en verano) eso desfasa el
 * cálculo por el offset de la zona y rompe el backoff exponencial: cree que ya
 * pasó el tiempo de espera cuando en realidad faltan horas. Insertar 'T' y 'Z'
 * fuerza el parseo ISO en UTC, que es lo que el string realmente representa.
 */
function parseSqliteUtcDate(sqliteDatetime: string): number {
  return new Date(`${sqliteDatetime.replace(' ', 'T')}Z`).getTime();
}

/**
 * Forzar retry de un item con error
 */
export function forceRetry(itemId: string, sessionId?: string): void {
  retryItem(itemId, sessionId);
  console.log(`[SyncEngine] Item ${itemId} marked for retry`);
}
