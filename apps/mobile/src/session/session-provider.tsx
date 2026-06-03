import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { AuthSessionUser } from '@shared/types';
import * as SecureStore from 'expo-secure-store';
import { Storage } from 'expo-sqlite/kv-store';

import { apiFetch, setApiBearerToken } from '@/lib/api';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

type AuthLoginPayload = {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string | null;
  };
  user: AuthSessionUser;
};

type StoredTechSession = {
  createdAt: string;
  email: string | null;
  fullName: string | null;
  id: string;
  label: string;
  lastUsedAt: string;
  refreshToken?: string | null;
  role: AuthSessionUser['role'];
  token: string;
};

type SessionStore = {
  activeSessionId: string | null;
  sessions: StoredTechSession[];
};

type SessionContextValue = {
  activateSession: (sessionId: string) => Promise<void>;
  connectWithCredentials: (email: string, password: string) => Promise<void>;
  connectWithToken: (token: string) => Promise<void>;
  currentUser: AuthSessionUser | null;
  errorMessage: string | null;
  isLoading: boolean;
  isSessionInvalid: boolean;
  revalidateActiveSession: () => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  activeSessionId: string | null;
  resetToGuest: () => Promise<void>;
  savedSessions: StoredTechSession[];
  sessionWarning: string | null;
  storedToken: string | null;
};

const LEGACY_SESSION_KEY = 'topofield_admin_bearer_token';
const SESSION_STATE_KEY = 'topofield_technical_sessions_v1';
const TOKEN_EXPIRY_WARNING_SECONDS = 10 * 60;

const SessionContext = createContext<SessionContextValue | null>(null);

const nowIso = () => new Date().toISOString();
const newSessionId = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;

const isTechnicalRole = (role: AuthSessionUser['role']) => role === 'admin' || role === 'topografo';

const roleLabel = (role: AuthSessionUser['role']) => {
  if (role === 'admin') return 'Administrador';
  if (role === 'topografo') return 'Topógrafo';
  return 'Visitante';
};

const normalizeLabel = (role: AuthSessionUser['role'], fullName: string | null) => {
  const base = roleLabel(role);
  return fullName ? `${base} · ${fullName}` : base;
};

const sortSessions = (sessions: StoredTechSession[]) =>
  [...sessions].sort((a, b) => {
    if (a.role === b.role) {
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    }

    return a.role.localeCompare(b.role);
  });

const parseSessionStore = (raw: string | null): SessionStore => {
  if (!raw) {
    return { activeSessionId: null, sessions: [] };
  }

  try {
    const parsed = JSON.parse(raw) as SessionStore;
    const sessions = Array.isArray(parsed?.sessions)
      ? parsed.sessions
          .filter((entry): entry is StoredTechSession => {
            if (!entry || typeof entry !== 'object') return false;

            return (
              typeof entry.id === 'string' &&
              typeof entry.token === 'string' &&
              typeof entry.label === 'string' &&
              typeof entry.createdAt === 'string' &&
              typeof entry.lastUsedAt === 'string' &&
              (entry.role === 'admin' || entry.role === 'topografo' || entry.role === 'visitante')
            );
          })
          .map((entry) => ({
            ...entry,
            createdAt: String(entry.createdAt),
            email: typeof entry.email === 'string' ? entry.email : null,
            fullName: typeof entry.fullName === 'string' ? entry.fullName : null,
            id: String(entry.id),
            label: String(entry.label),
            lastUsedAt: String(entry.lastUsedAt),
            refreshToken: typeof entry.refreshToken === 'string' ? entry.refreshToken : null,
            role: entry.role,
            token: String(entry.token)
          }))
      : [];

    const activeSessionId =
      typeof parsed?.activeSessionId === 'string' && sessions.some((session) => session.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : sessions[0]?.id ?? null;

    return { activeSessionId, sessions: sortSessions(sessions) };
  } catch {
    return { activeSessionId: null, sessions: [] };
  }
};

const loadStateFromStorage = async (): Promise<SessionStore> => {
  const raw = await SecureStore.getItemAsync(SESSION_STATE_KEY);
  const stored = parseSessionStore(raw);

  if (stored.sessions.length > 0) {
    return stored;
  }

  const legacyToken = await SecureStore.getItemAsync(LEGACY_SESSION_KEY);
  if (!legacyToken) {
    return { activeSessionId: null, sessions: [] };
  }

  const fallbackSession: StoredTechSession = {
    createdAt: nowIso(),
    email: null,
    fullName: null,
    id: newSessionId(),
    label: 'Sesión técnica',
    lastUsedAt: nowIso(),
    role: 'admin',
    token: legacyToken
  };

  return { activeSessionId: fallbackSession.id, sessions: [fallbackSession] };
};

const persistState = async (state: SessionStore) => {
  const normalized = {
    activeSessionId:
      state.activeSessionId ?? (state.sessions.length > 0 ? state.sessions[0].id : null),
    sessions: sortSessions(state.sessions)
  };

  await SecureStore.setItemAsync(SESSION_STATE_KEY, JSON.stringify(normalized));
  await Storage.removeItemAsync(SESSION_STATE_KEY);

  return normalized;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    if (typeof globalThis.atob !== 'function') {
      return null;
    }

    const decoded = decodeURIComponent(
      globalThis
        .atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const getTokenWarning = (token: string | null) => {
  if (!token) {
    return {
      expiresAt: null as string | null,
      isExpired: false,
      warning: null as string | null,
      isExpiringSoon: false
    };
  }

  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === 'number' ? payload.exp : null;
  if (!exp) {
    return {
      expiresAt: null as string | null,
      isExpired: false,
      warning: null as string | null,
      isExpiringSoon: false
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const secondsRemaining = exp - nowSeconds;
  const expiresAt = new Date(exp * 1000).toISOString();

  if (secondsRemaining <= 0) {
    return {
      expiresAt,
      isExpired: true,
      warning: 'La sesión técnica ha expirado.',
      isExpiringSoon: false
    };
  }

  if (secondsRemaining <= TOKEN_EXPIRY_WARNING_SECONDS) {
    const minutesLeft = Math.max(1, Math.ceil(secondsRemaining / 60));
    return {
      expiresAt,
      isExpired: false,
      warning: `La sesión técnica expira en ~${minutesLeft} min.`,
      isExpiringSoon: true
    };
  }

  return {
    expiresAt,
    isExpired: false,
    warning: null as string | null,
    isExpiringSoon: false
  };
};

const isAuthError = (message?: string) => {
  if (!message) {
    return false;
  }

  return (
    message.includes('Invalid authentication token') ||
    message.includes('Authentication required') ||
    message.includes('La sesión técnica es inválida')
  );
};

const getAuthMe = async () => {
  const response = await apiFetch<ApiEnvelope<{ user: AuthSessionUser }>>('/auth/me');
  return response.data.user;
};

const loginWithCredentialsRequest = async (email: string, password: string) => {
  const response = await apiFetch<ApiEnvelope<AuthLoginPayload>>('/auth/login', {
    body: JSON.stringify({
      email,
      password
    }),
    method: 'POST',
    skipAuth: true
  });

  return response.data;
};

const refreshSessionRequest = async (refreshToken: string) => {
  const response = await apiFetch<ApiEnvelope<AuthLoginPayload>>('/auth/refresh', {
    body: JSON.stringify({ refreshToken }),
    method: 'POST',
    skipAuth: true
  });

  return response.data;
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedSessions, setSavedSessions] = useState<StoredTechSession[]>([]);
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);
  const [isSessionInvalid, setIsSessionInvalid] = useState(false);

  useEffect(() => {
    void hydrateSession();
  }, []);

  const applyPersistedSessions = async (state: SessionStore) => {
    const normalized = await persistState(state);
    setSavedSessions(normalized.sessions);
    return normalized;
  };

  const loadCurrentUser = async () => {
    const user = await getAuthMe();
    setCurrentUser(user);
    return user;
  };

  const createSessionFromPayload = (payload: AuthLoginPayload, existing: StoredTechSession | undefined) => {
    const now = nowIso();
    return {
      ...existing,
      createdAt: existing?.createdAt ?? now,
      email: payload.user.email,
      fullName: payload.user.fullName,
      id: existing?.id ?? newSessionId(),
      label: normalizeLabel(payload.user.role, payload.user.fullName),
      lastUsedAt: now,
      refreshToken: payload.session.refreshToken,
      role: payload.user.role,
      token: payload.session.accessToken
    } satisfies StoredTechSession;
  };

  const buildActivePayloadFromSession = async (session: StoredTechSession) => {
    const tokenInfo = getTokenWarning(session.token);
    if (!tokenInfo.isExpired) {
      return { session, refreshed: false };
    }

    if (!session.refreshToken) {
      return { session: { ...session, token: '' }, refreshed: false };
    }

    const refreshed = await refreshSessionRequest(session.refreshToken);
    return {
      session: {
        ...session,
        token: refreshed.session.accessToken,
        refreshToken: refreshed.session.refreshToken,
        lastUsedAt: nowIso()
      },
      refreshed: true
    };
  };

  const applySession = async (
    sessionId: string | null,
    sessions: StoredTechSession[],
    options: { swallowAuthError?: boolean } = {}
  ): Promise<boolean> => {
    const storedSession = sessions.find((entry) => entry.id === sessionId) ?? null;
    if (!storedSession) {
      setActiveSessionId(null);
      setStoredToken(null);
      setApiBearerToken(null);
      setCurrentUser(null);
      setSessionWarning(null);
      setIsSessionInvalid(false);
      return false;
    }

    let nextSession = storedSession;
    let nextSessions = sessions;

    try {
      const refreshedPayload = await buildActivePayloadFromSession(storedSession);
      nextSession = refreshedPayload.session;

      if (refreshedPayload.refreshed) {
        nextSessions = sessions.map((session) =>
          session.id === storedSession.id ? nextSession : session
        );
        const normalized = await applyPersistedSessions({ sessions: nextSessions, activeSessionId: sessionId });
        nextSessions = normalized.sessions;
        nextSession = normalized.sessions.find((session) => session.id === sessionId) ?? nextSession;
      }
    } catch {
      nextSession = {
        ...storedSession,
        token: ''
      };
      nextSessions = sessions.map((session) =>
        session.id === storedSession.id ? nextSession : session
      );
      await applyPersistedSessions({
        sessions: nextSessions,
        activeSessionId: sessionId
      });
    }

    const token = nextSession.token;
    const tokenInfo = getTokenWarning(token);

    setActiveSessionId(sessionId);
    setStoredToken(token || null);
    setApiBearerToken(token || null);
    setSessionWarning(tokenInfo.warning);
    setIsSessionInvalid(!token || tokenInfo.isExpired);

    if (!token || tokenInfo.isExpired) {
      setCurrentUser(null);
      if (!token) {
        setSessionWarning('La sesión técnica es inválida. Repite el token.');
      }
      return false;
    }

    try {
      await loadCurrentUser();
      setErrorMessage(null);
      setIsSessionInvalid(false);
      setSavedSessions(nextSessions);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo validar la sesión.';
      setCurrentUser(null);
      setIsSessionInvalid(true);

      if (isAuthError(message) || options.swallowAuthError) {
        if (!options.swallowAuthError) {
          setErrorMessage('La sesión técnica es inválida. Revalida o pega un token nuevo.');
        }
        return false;
      }

      setErrorMessage(message);
      throw error;
    }
  };

  const hydrateSession = async () => {
    setIsLoading(true);
    let loadedState: SessionStore | null = null;

    try {
      const state = await loadStateFromStorage();
      loadedState = state;
      const nextState = await applyPersistedSessions(state);

      await applySession(nextState.activeSessionId, nextState.sessions, { swallowAuthError: true });

      if (nextState.activeSessionId) {
        try {
          const user = await getAuthMe();
          const now = nowIso();
          const resolvedSession = nextState.sessions.find((session) => session.id === nextState.activeSessionId);

          if (resolvedSession) {
            const mergedSession: StoredTechSession = {
              ...resolvedSession,
              email: user.email,
              fullName: user.fullName,
              label: normalizeLabel(user.role, user.fullName),
              lastUsedAt: now,
              role: user.role
            };

            const sessions = nextState.sessions.map((session) =>
              session.id === mergedSession.id ? mergedSession : session
            );
            const normalized = await applyPersistedSessions({ ...nextState, sessions });
            await applySession(normalized.activeSessionId, normalized.sessions, { swallowAuthError: true });
          }
        } catch {
          // Keep technical sessions and keep blocked/invalid state from token validation.
        }
      }

      await Storage.removeItemAsync(LEGACY_SESSION_KEY);
      setErrorMessage(null);
    } catch {
      const fallbackSessions = loadedState?.sessions ?? [];
      setSavedSessions(fallbackSessions);
      setActiveSessionId(null);
      setStoredToken(null);
      setApiBearerToken(null);
      setSessionWarning('No se pudo validar la sesión técnica guardada.');
      setIsSessionInvalid(false);
      await applyPersistedSessions({ activeSessionId: null, sessions: fallbackSessions });
    } finally {
      setIsLoading(false);
    }
  };

  const connectWithToken = async (token: string) => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new Error('El token no puede estar vacío.');
    }

    setIsLoading(true);
    const previousSessions = savedSessions;
    const previousActiveSessionId = activeSessionId;
    const previousStoredToken = storedToken;

    try {
      setApiBearerToken(trimmedToken);
      const authenticatedUser = await getAuthMe();

      if (!isTechnicalRole(authenticatedUser.role)) {
        throw new Error('El token debe ser de admin o topógrafo.');
      }

      const now = nowIso();
      const existingSession = previousSessions.find((session) => session.role === authenticatedUser.role);
      const mergedSession: StoredTechSession = existingSession
        ? {
            ...existingSession,
            email: authenticatedUser.email,
            fullName: authenticatedUser.fullName,
            label: normalizeLabel(authenticatedUser.role, authenticatedUser.fullName),
            lastUsedAt: now,
            role: authenticatedUser.role,
            token: trimmedToken
          }
        : {
            createdAt: now,
            email: authenticatedUser.email,
            fullName: authenticatedUser.fullName,
            id: newSessionId(),
            label: normalizeLabel(authenticatedUser.role, authenticatedUser.fullName),
            lastUsedAt: now,
            role: authenticatedUser.role,
            token: trimmedToken
          };

      const nextSessions = existingSession
        ? previousSessions.map((session) => (session.id === mergedSession.id ? mergedSession : session))
        : [...previousSessions, mergedSession];
      const normalized = await applyPersistedSessions({ sessions: nextSessions, activeSessionId: mergedSession.id });

      setSavedSessions(normalized.sessions);
      await Storage.removeItemAsync(LEGACY_SESSION_KEY);
      await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);
      const tokenInfo = getTokenWarning(trimmedToken);
      const isValid = await applySession(normalized.activeSessionId, normalized.sessions);
      setSessionWarning(
        isValid
          ? tokenInfo.warning
          : 'La sesión técnica es inválida. Revalida o pega un token nuevo.'
      );
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo validar el token.';
      setStoredToken(previousStoredToken);
      setActiveSessionId(previousActiveSessionId);
      setSavedSessions(previousSessions);
      setApiBearerToken(previousStoredToken);
      await applySession(previousActiveSessionId, previousSessions, { swallowAuthError: true });
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWithCredentials = async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      throw new Error('Introduce correo y contraseña.');
    }

    setIsLoading(true);
    const previousSessions = savedSessions;
    const previousActiveSessionId = activeSessionId;
    const previousStoredToken = storedToken;

    try {
      const payload = await loginWithCredentialsRequest(trimmedEmail, password);
      const user = payload.user;

      if (!isTechnicalRole(user.role)) {
        throw new Error('La cuenta debe ser admin o topógrafo.');
      }

      const now = nowIso();
      const existingSession = previousSessions.find((session) => session.role === user.role);
      const mergedSession = createSessionFromPayload(payload, existingSession);
      mergedSession.label = normalizeLabel(user.role, user.fullName);
      mergedSession.lastUsedAt = now;

      const nextSessions = existingSession
        ? previousSessions.map((session) => (session.id === mergedSession.id ? mergedSession : session))
        : [...previousSessions, mergedSession];

      const normalized = await applyPersistedSessions({ sessions: nextSessions, activeSessionId: mergedSession.id });
      setSavedSessions(normalized.sessions);
      const isValid = await applySession(normalized.activeSessionId, normalized.sessions);
      await Storage.removeItemAsync(LEGACY_SESSION_KEY);
      await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);

      const tokenInfo = getTokenWarning(payload.session.accessToken);
      setSessionWarning(isValid ? tokenInfo.warning : 'La sesión técnica es inválida. Revalida o pega un token nuevo.');
      setErrorMessage(null);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo validar la sesión.';
      setStoredToken(previousStoredToken);
      setActiveSessionId(previousActiveSessionId);
      setSavedSessions(previousSessions);
      setApiBearerToken(previousStoredToken);
      await applySession(previousActiveSessionId, previousSessions, { swallowAuthError: true });
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const activateSession = async (sessionId: string) => {
    setIsLoading(true);

    try {
      const session = savedSessions.find((entry) => entry.id === sessionId);
      if (!session) {
        throw new Error('No se encontró la sesión.');
      }

      const nextSessions = savedSessions.map((entry) =>
        entry.id === sessionId ? { ...entry, lastUsedAt: nowIso() } : entry
      );

      const normalized = await applyPersistedSessions({ sessions: nextSessions, activeSessionId: sessionId });
      setSavedSessions(normalized.sessions);
      await applySession(normalized.activeSessionId, normalized.sessions, { swallowAuthError: true });
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo activar la sesión.';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeSession = async (sessionId: string) => {
    setIsLoading(true);

    try {
      const nextSessions = savedSessions.filter((session) => session.id !== sessionId);
      const shouldResetToken = sessionId === activeSessionId;

      if (nextSessions.length === 0) {
        await applyPersistedSessions({ sessions: [], activeSessionId: null });
        setSavedSessions([]);
        await applySession(null, []);
        return;
      }

      const normalized = await applyPersistedSessions({
        sessions: nextSessions,
        activeSessionId: shouldResetToken ? nextSessions[0].id : activeSessionId
      });

      setSavedSessions(normalized.sessions);
      await applySession(normalized.activeSessionId, normalized.sessions, { swallowAuthError: true });
      setErrorMessage(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la sesión.';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToGuest = async () => {
    setIsLoading(true);

    try {
      const normalized = await applyPersistedSessions({ sessions: savedSessions, activeSessionId: null });
      setSavedSessions(normalized.sessions);
      setActiveSessionId(null);
      setStoredToken(null);
      setApiBearerToken(null);
      setSessionWarning(null);
      setIsSessionInvalid(false);
      setCurrentUser(null);
      await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);
      await Storage.removeItemAsync(SESSION_STATE_KEY);
      setErrorMessage(null);
    } catch (error) {
      setCurrentUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo volver a modo visitante.');
    } finally {
      setIsLoading(false);
    }
  };

  const revalidateActiveSession = async () => {
    setIsLoading(true);

    try {
      if (!activeSessionId) {
        setErrorMessage('No hay sesión técnica activa para revalidar.');
        setIsSessionInvalid(true);
        return;
      }

      const nowSessions = savedSessions.map((session) =>
        session.id === activeSessionId ? { ...session, lastUsedAt: nowIso() } : session
      );
      const normalized = await applyPersistedSessions({ sessions: nowSessions, activeSessionId });
      const isValid = await applySession(normalized.activeSessionId, normalized.sessions, { swallowAuthError: true });
      setErrorMessage(isValid ? null : 'La sesión técnica es inválida. Repite el token.');
      if (isValid) {
        setSessionWarning(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo revalidar la sesión.';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      activateSession,
      connectWithCredentials,
      connectWithToken,
      currentUser,
      errorMessage,
      isLoading,
      isSessionInvalid,
      revalidateActiveSession,
      removeSession,
      activeSessionId,
      resetToGuest,
      savedSessions,
      sessionWarning,
      storedToken
    }),
    [
      activeSessionId,
      currentUser,
      errorMessage,
      isLoading,
      isSessionInvalid,
      savedSessions,
      sessionWarning,
      storedToken
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
};
