import { isApiRequestError } from '@/lib/api';

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar. Revisa la conexión y vuelve a intentar.';
const TIMEOUT_ERROR_FRAGMENT = 'tardó demasiado';

/** Only an explicit refresh-token rejection should discard persisted credentials. */
export const isInvalidRefreshTokenError = (error: unknown) =>
  isApiRequestError(error) && error.status === 401 && error.code === 'INVALID_REFRESH_TOKEN';

export const resolveSessionAfterRefreshFailure = <T extends { token: string }>(session: T, error: unknown) => {
  if (!isInvalidRefreshTokenError(error)) {
    return { session, shouldPersistInvalidation: false };
  }

  return {
    session: { ...session, token: '' },
    shouldPersistInvalidation: true
  };
};

/**
 * Cached identity is only allowed when remote validation is temporarily
 * unavailable: no HTTP response / timeout, or a server-side 5xx response.
 * Client-side 4xx responses are authoritative and must not unlock local
 * identity merely because the device has an older validated cache.
 */
export const isTransientSessionValidationFailure = (error: unknown) => {
  if (isApiRequestError(error)) {
    return error.status >= 500;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.message === NETWORK_ERROR_MESSAGE || error.message.includes(TIMEOUT_ERROR_FRAGMENT);
};

export const isSameStoredSessionIdentity = (
  stored: { email?: string | null; userId?: string | null },
  refreshed: { email: string | null; id: string }
) => {
  if (stored.userId) {
    return stored.userId === refreshed.id;
  }

  const storedEmail = stored.email?.trim().toLowerCase() ?? null;
  const refreshedEmail = refreshed.email?.trim().toLowerCase() ?? null;
  if (storedEmail) {
    return storedEmail === refreshedEmail;
  }

  return true;
};

export const canRunDeferredSessionRetry = ({
  activeSessionId,
  currentGeneration,
  persistedActiveSessionId,
  retryGeneration,
  sessionId
}: {
  activeSessionId: string | null;
  currentGeneration: number;
  persistedActiveSessionId: string | null;
  retryGeneration: number;
  sessionId: string;
}) =>
  activeSessionId === sessionId &&
  persistedActiveSessionId === sessionId &&
  currentGeneration === retryGeneration;

/**
 * A transient remote-validation failure may happen either while refreshing an
 * expired token or while validating an otherwise usable token with /auth/me.
 * In both cases the last server-validated identity may be used for local
 * cache/outbox access only. The caller must keep the bearer token disabled
 * until the session is revalidated remotely.
 */
export const canUseCachedIdentityOffline = ({
  authValidationDeferredByTransientFailure,
  hasCachedUser,
  refreshDeferredByTransientFailure,
  tokenUsable
}: {
  authValidationDeferredByTransientFailure: boolean;
  hasCachedUser: boolean;
  refreshDeferredByTransientFailure: boolean;
  tokenUsable: boolean;
}) =>
  hasCachedUser &&
  (
    (!tokenUsable && refreshDeferredByTransientFailure) ||
    (tokenUsable && authValidationDeferredByTransientFailure)
  );
