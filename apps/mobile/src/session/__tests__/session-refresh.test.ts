import { describe, expect, it } from '@jest/globals';

import { ApiRequestError } from '@/lib/api';
import { isInvalidRefreshTokenError, resolveSessionAfterRefreshFailure } from '../session-refresh';

describe('session refresh failures', () => {
  it('only discards credentials when Supabase explicitly rejects the refresh token', () => {
    expect(isInvalidRefreshTokenError(new ApiRequestError(401, 'Invalid refresh token', {
      code: 'INVALID_REFRESH_TOKEN'
    }))).toBe(true);
    expect(isInvalidRefreshTokenError(new ApiRequestError(503, 'Service unavailable'))).toBe(false);
    expect(isInvalidRefreshTokenError(new Error('Network timeout'))).toBe(false);
  });

  it('preserves a refreshable session when the refresh request fails transiently', () => {
    const session = { refreshToken: 'refresh-token', token: 'expired-access-token' };

    const transient = resolveSessionAfterRefreshFailure(session, new Error('Network timeout'));
    expect(transient.session).toBe(session);
    expect(transient.shouldPersistInvalidation).toBe(false);

    const invalid = resolveSessionAfterRefreshFailure(
      session,
      new ApiRequestError(401, 'Invalid refresh token', { code: 'INVALID_REFRESH_TOKEN' })
    );
    expect(invalid.session.token).toBe('');
    expect(invalid.shouldPersistInvalidation).toBe(true);
  });
});
