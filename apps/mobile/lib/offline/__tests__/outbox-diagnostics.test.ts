import { describe, expect, it } from '@jest/globals';

import { buildOutboxDiagnostic, getOutboxDiagnosticMessage } from '../outbox-diagnostics';
import type { OutboxItem } from '../outbox';

const createItem = (overrides: Partial<OutboxItem> = {}): OutboxItem => ({
  id: 'item-1',
  clientRequestId: 'request-1',
  sessionId: 'session-1',
  entityType: 'medicion',
  operation: 'insert',
  payload: {},
  status: 'error',
  createdAt: '2026-09-13 10:00:00',
  syncedAt: null,
  lastSyncAttemptAt: '2026-09-13 10:00:00',
  retryCount: 3,
  errorMessage: null,
  conflictData: null,
  ...overrides
});

describe('outbox diagnostics', () => {
  it('permite reintentar errores y oculta tokens de un mensaje defectuoso', () => {
    const diagnostic = buildOutboxDiagnostic(createItem({
      errorMessage: 'Authorization: Bearer secret-token y token=eyJhbGciOiJ9.abc.def'
    }));

    expect(diagnostic.status).toBe('error');
    expect(diagnostic.canRetry).toBe(true);
    expect(diagnostic.message).toContain('[oculto]');
    expect(diagnostic.message).not.toContain('secret-token');
    expect(diagnostic.message).not.toContain('eyJhbGciOiJ9');
  });

  it('no expone el payload del conflicto y bloquea el reintento automático', () => {
    const diagnostic = buildOutboxDiagnostic(createItem({
      status: 'conflict',
      conflictData: {
        serverError: {
          status: 409,
          code: 'ROUND_VERSION_CONFLICT',
          body: 'contenido privado que no debe aparecer'
        },
        localPayload: { secret: 'no mostrar' }
      }
    }));

    expect(diagnostic.status).toBe('conflict');
    expect(diagnostic.statusLabel).toBe('Revisión necesaria');
    expect(diagnostic.canRetry).toBe(false);
    expect(diagnostic.message).toBe('Conflicto de sincronización (HTTP 409). Revisión necesaria.');
    expect(diagnostic.message).not.toContain('contenido privado');
    expect(diagnostic.message).not.toContain('no mostrar');
  });

  it('usa un texto genérico cuando el conflicto no contiene metadatos seguros', () => {
    expect(getOutboxDiagnosticMessage(createItem({
      status: 'conflict',
      conflictData: { serverError: { message: 'detalle interno' } }
    }))).toBe('Conflicto de sincronización. Revisión necesaria.');
  });
});
