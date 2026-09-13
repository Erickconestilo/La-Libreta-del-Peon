type JourneyAutoOpenInput = {
  isJourneyLoading: boolean;
  isSessionLoading: boolean;
  journeyCount: number;
  lastOpenedUserId: string | null;
  userId: string | null;
};

type JourneyAutoOpenDecision = {
  nextOpenedUserId: string | null;
  shouldNavigate: boolean;
};

/**
 * Opens a personal journey once per authenticated user while allowing a
 * later login to start a fresh navigation cycle in the same mounted tree.
 */
export const getJourneyAutoOpenDecision = ({
  isJourneyLoading,
  isSessionLoading,
  journeyCount,
  lastOpenedUserId,
  userId
}: JourneyAutoOpenInput): JourneyAutoOpenDecision => {
  if (!userId) {
    return {
      nextOpenedUserId: null,
      shouldNavigate: false
    };
  }

  if (isSessionLoading || isJourneyLoading || journeyCount === 0 || lastOpenedUserId === userId) {
    return {
      nextOpenedUserId: lastOpenedUserId,
      shouldNavigate: false
    };
  }

  return {
    nextOpenedUserId: userId,
    shouldNavigate: true
  };
};
