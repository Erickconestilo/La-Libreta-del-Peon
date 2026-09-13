import { describe, expect, it } from '@jest/globals';

import { getJourneyAutoOpenDecision } from '../journey-navigation';

describe('journey auto navigation', () => {
  it('waits for session and journey data before navigating', () => {
    expect(
      getJourneyAutoOpenDecision({
        isJourneyLoading: true,
        isSessionLoading: false,
        journeyCount: 1,
        lastOpenedUserId: null,
        userId: 'user-a'
      })
    ).toEqual({ nextOpenedUserId: null, shouldNavigate: false });

    expect(
      getJourneyAutoOpenDecision({
        isJourneyLoading: false,
        isSessionLoading: true,
        journeyCount: 1,
        lastOpenedUserId: null,
        userId: 'user-a'
      })
    ).toEqual({ nextOpenedUserId: null, shouldNavigate: false });
  });

  it('does not consume the cycle when a user has no assigned rounds', () => {
    expect(
      getJourneyAutoOpenDecision({
        isJourneyLoading: false,
        isSessionLoading: false,
        journeyCount: 0,
        lastOpenedUserId: null,
        userId: 'user-a'
      })
    ).toEqual({ nextOpenedUserId: null, shouldNavigate: false });
  });

  it('opens once for a user and opens again after switching accounts', () => {
    const firstLogin = getJourneyAutoOpenDecision({
      isJourneyLoading: false,
      isSessionLoading: false,
      journeyCount: 1,
      lastOpenedUserId: null,
      userId: 'user-a'
    });
    const repeatedRender = getJourneyAutoOpenDecision({
      isJourneyLoading: false,
      isSessionLoading: false,
      journeyCount: 1,
      lastOpenedUserId: firstLogin.nextOpenedUserId,
      userId: 'user-a'
    });
    const secondLogin = getJourneyAutoOpenDecision({
      isJourneyLoading: false,
      isSessionLoading: false,
      journeyCount: 1,
      lastOpenedUserId: repeatedRender.nextOpenedUserId,
      userId: 'user-b'
    });

    expect(firstLogin).toEqual({ nextOpenedUserId: 'user-a', shouldNavigate: true });
    expect(repeatedRender).toEqual({ nextOpenedUserId: 'user-a', shouldNavigate: false });
    expect(secondLogin).toEqual({ nextOpenedUserId: 'user-b', shouldNavigate: true });
  });

  it('resets the cycle when the app returns to guest mode', () => {
    expect(
      getJourneyAutoOpenDecision({
        isJourneyLoading: false,
        isSessionLoading: false,
        journeyCount: 0,
        lastOpenedUserId: 'user-a',
        userId: null
      })
    ).toEqual({ nextOpenedUserId: null, shouldNavigate: false });
  });
});
