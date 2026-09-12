/** Build a React Query namespace that cannot be shared by two local sessions. */
export const getSessionCacheKey = (activeSessionId: string | null | undefined) =>
  activeSessionId ? `session:${activeSessionId}` : 'guest';
