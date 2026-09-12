export interface StoredSessionIdentity {
  email?: string | null;
  userId?: string | null;
}

/** Match a saved local session to the Auth user without reusing sessions by role. */
export const findStoredSessionForUser = <T extends StoredSessionIdentity>(
  sessions: T[],
  user: { email: string | null; id: string }
) => {
  const normalizedEmail = user.email?.trim().toLowerCase() ?? null;

  return sessions.find((session) => {
    if (session.userId) {
      return session.userId === user.id;
    }

    return Boolean(normalizedEmail && session.email?.trim().toLowerCase() === normalizedEmail);
  });
};
