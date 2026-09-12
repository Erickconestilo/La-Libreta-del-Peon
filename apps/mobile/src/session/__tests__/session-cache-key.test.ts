import { describe, expect, it } from '@jest/globals';

import { getSessionCacheKey } from '../session-cache-key';

describe('getSessionCacheKey', () => {
  it('namespaces authenticated queries by the local session id', () => {
    expect(getSessionCacheKey('session-a')).toBe('session:session-a');
  });

  it('uses the guest namespace only when there is no active session', () => {
    expect(getSessionCacheKey(null)).toBe('guest');
    expect(getSessionCacheKey(undefined)).toBe('guest');
  });
});
