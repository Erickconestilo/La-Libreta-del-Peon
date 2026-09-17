import { describe, expect, it } from '@jest/globals';

import { ApiRequestError } from '@/lib/api';
import {
  canRunDeferredSessionRetry,
  canUseCachedIdentityOffline,
  isInvalidRefreshTokenError,
  isSameStoredSessionIdentity,
  isTransientSessionValidationFailure,
  resolveSessionAfterRefreshFailure
} from '../session-refresh';

describe('session refresh failures', () => {
  it('only discards credentials when Supabase explicitly rejects the refresh token', () => {
    expect(isInvalidRefreshTokenError(new ApiRequestError(401, 'Invalid refresh token', {
      code: 'INVALID_REFRESH_TOKEN'
    }))).toBe(true);
    expect(isInvalidRefreshTokenError(new ApiRequestError(503, 'Service unavailable'))).toBe(false);
    expect(isInvalidRefreshTokenError(new Error('Network timeout'))).toBe(false);
  });

  it('only treats no-response/timeout and 5xx as transient validation failures', () => {
    expect(isTransientSessionValidationFailure(
      new Error('No se pudo conectar. Revisa la conexión y vuelve a intentar.')
    )).toBe(true);
    expect(isTransientSessionValidationFailure(
      new Error('El servidor tardó demasiado en responder. Reintenta en unos segundos.')
    )).toBe(true);
    expect(isTransientSessionValidationFailure(new ApiRequestError(503, 'Service unavailable'))).toBe(true);

    expect(isTransientSessionValidationFailure(new ApiRequestError(403, 'Forbidden'))).toBe(false);
    expect(isTransientSessionValidationFailure(
      new ApiRequestError(401, 'Unauthorized', { code: 'OTHER_AUTH_ERROR' })
    )).toBe(false);
    expect(isTransientSessionValidationFailure(
      new ApiRequestError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' })
    )).toBe(false);
  });

  it('preserves a refreshable session when the refresh request fails transiently', () => {
    const session = { refreshToken: 'refresh-token', token: 'expired-access-token' };

    const transient = resolveSessionAfterRefreshFailure(
      session,
      new Error('No se pudo conectar. Revisa la conexión y vuelve a intentar.')
    );
    expect(transient.session).toBe(session);
    expect(transient.shouldPersistInvalidation).toBe(false);

    const invalid = resolveSessionAfterRefreshFailure(
      session,
      new ApiRequestError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' })
    );
    expect(invalid.session.token).toBe('');
    expect(invalid.shouldPersistInvalidation).toBe(true);
  });

  it('allows cached identity for an expired token when refresh is transiently deferred', () => {
    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: false,
      hasCachedUser: true,
      refreshDeferredByTransientFailure: true,
      tokenUsable: false
    })).toBe(true);

    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: false,
      hasCachedUser: false,
      refreshDeferredByTransientFailure: true,
      tokenUsable: false
    })).toBe(false);
    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: false,
      hasCachedUser: true,
      refreshDeferredByTransientFailure: false,
      tokenUsable: false
    })).toBe(false);
  });

  it('allows cached identity when /auth/me validation is transiently unavailable', () => {
    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: true,
      hasCachedUser: true,
      refreshDeferredByTransientFailure: false,
      tokenUsable: true
    })).toBe(true);

    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: true,
      hasCachedUser: false,
      refreshDeferredByTransientFailure: false,
      tokenUsable: true
    })).toBe(false);
    expect(canUseCachedIdentityOffline({
      authValidationDeferredByTransientFailure: false,
      hasCachedUser: true,
      refreshDeferredByTransientFailure: false,
      tokenUsable: true
    })).toBe(false);
  });

  it('does not let a refreshed identity inherit another stored session namespace', () => {
    expect(isSameStoredSessionIdentity(
      { email: 'one@example.com', userId: 'user-1' },
      { email: 'one@example.com', id: 'user-1' }
    )).toBe(true);
    expect(isSameStoredSessionIdentity(
      { email: 'one@example.com', userId: 'user-1' },
      { email: 'two@example.com', id: 'user-2' }
    )).toBe(false);
    expect(isSameStoredSessionIdentity(
      { email: 'One@Example.com', userId: null },
      { email: 'one@example.com', id: 'user-2' }
    )).toBe(true);
  });

  it('runs a deferred retry only for the same still-active persisted session generation', () => {
    expect(canRunDeferredSessionRetry({
      activeSessionId: 'session-a',
      currentGeneration: 4,
      persistedActiveSessionId: 'session-a',
      retryGeneration: 4,
      sessionId: 'session-a'
    })).toBe(true);

    expect(canRunDeferredSessionRetry({
      activeSessionId: null,
      currentGeneration: 4,
      persistedActiveSessionId: null,
      retryGeneration: 4,
      sessionId: 'session-a'
    })).toBe(false);
    expect(canRunDeferredSessionRetry({
      activeSessionId: 'session-b',
      currentGeneration: 4,
      persistedActiveSessionId: 'session-b',
      retryGeneration: 4,
      sessionId: 'session-a'
    })).toBe(false);
    expect(canRunDeferredSessionRetry({
      activeSessionId: 'session-a',
      currentGeneration: 5,
      persistedActiveSessionId: 'session-a',
      retryGeneration: 4,
      sessionId: 'session-a'
    })).toBe(false);
  });
});
