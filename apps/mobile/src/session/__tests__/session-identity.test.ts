import { describe, expect, it } from '@jest/globals';

import { findStoredSessionForUser } from '../session-identity';

describe('findStoredSessionForUser', () => {
  it('does not reuse a topografo session for another user with the same role', () => {
    const sessions = [
      { id: 'session-a', email: 'a@example.test', userId: 'user-a' },
      { id: 'session-b', email: 'b@example.test', userId: 'user-b' }
    ];

    expect(findStoredSessionForUser(sessions, { email: 'b@example.test', id: 'user-b' })?.id).toBe('session-b');
    expect(findStoredSessionForUser(sessions, { email: 'c@example.test', id: 'user-c' })).toBeUndefined();
  });

  it('matches legacy sessions by normalized email until they receive a user id', () => {
    const sessions = [{ id: 'legacy', email: 'Operator@Example.test', userId: null }];

    expect(findStoredSessionForUser(sessions, { email: ' operator@example.test ', id: 'user-a' })?.id).toBe('legacy');
  });
});
