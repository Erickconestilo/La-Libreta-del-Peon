/**
 * Identificadores usados para aislar operaciones locales por cuenta.
 * Las filas antiguas no se pueden atribuir con seguridad a ninguna cuenta.
 */
export const UNASSIGNED_OUTBOX_SESSION_ID = '__unassigned__';
export const TEST_OUTBOX_SESSION_ID = 'session:test';

export const normalizeOutboxSessionId = (sessionId: string | null | undefined) => {
  const normalized = sessionId?.trim();

  if (normalized) {
    return normalized;
  }

  return process.env.NODE_ENV === 'test' ? TEST_OUTBOX_SESSION_ID : null;
};
