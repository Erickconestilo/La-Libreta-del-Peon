import { isApiRequestError } from '@/lib/api';

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
