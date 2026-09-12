import type { OutboxItem } from './outbox';

export type OutboxDiagnosticStatus = 'error' | 'conflict';

export interface OutboxDiagnostic {
  item: OutboxItem;
  status: OutboxDiagnosticStatus;
  statusLabel: string;
  message: string;
  canRetry: boolean;
}

const MAX_DIAGNOSTIC_LENGTH = 240;

const redactSensitiveText = (value: string) =>
  value
    .replace(/Bearer\s+\S+/gi, 'Bearer [oculto]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token oculto]')
    .replace(/(password|contraseña|token|authorization)\s*[:=]\s*\S+/gi, '$1=[oculto]')
    .slice(0, MAX_DIAGNOSTIC_LENGTH);

const getConflictServerError = (item: OutboxItem) => {
  const serverError = item.conflictData?.serverError;
  return serverError && typeof serverError === 'object' ? serverError as Record<string, unknown> : null;
};

const getConflictMessage = (item: OutboxItem) => {
  const serverError = getConflictServerError(item);
  const status = typeof serverError?.status === 'number' ? `HTTP ${serverError.status}` : null;
  const code = typeof serverError?.code === 'string' && /^[A-Z0-9_.-]{1,48}$/i.test(serverError.code)
    ? serverError.code
    : null;
  const detail = status ?? code;

  return detail
    ? `Conflicto de sincronización (${detail}). Revisión necesaria.`
    : 'Conflicto de sincronización. Revisión necesaria.';
};

export const getOutboxDiagnosticMessage = (item: OutboxItem) => {
  if (item.status === 'conflict') {
    return getConflictMessage(item);
  }

  const message = item.errorMessage?.trim();
  return message ? redactSensitiveText(message) : 'Error sin detalle disponible.';
};

export const buildOutboxDiagnostic = (item: OutboxItem): OutboxDiagnostic => ({
  item,
  status: item.status === 'conflict' ? 'conflict' : 'error',
  statusLabel: item.status === 'conflict' ? 'Revisión necesaria' : 'Error de sincronización',
  message: getOutboxDiagnosticMessage(item),
  canRetry: item.status === 'error'
});

