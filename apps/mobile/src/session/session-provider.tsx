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

type SessionContextValue = {
  connectWithToken: (token: string) => Promise<void>;
  currentUser: AuthSessionUser | null;
  errorMessage: string | null;
  isLoading: boolean;
  resetToGuest: () => Promise<void>;
  storedToken: string | null;
};

const SESSION_TOKEN_KEY = 'topofield_admin_bearer_token';

const SessionContext = createContext<SessionContextValue | null>(null);

const loadStoredToken = async () => {
  const secureToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);

  if (secureToken) {
    return secureToken;
  }

  const legacyToken = await Storage.getItemAsync(SESSION_TOKEN_KEY);

  if (legacyToken) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, legacyToken);
    await Storage.removeItemAsync(SESSION_TOKEN_KEY);
  }

  return legacyToken;
};

const saveStoredToken = async (token: string) => {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  await Storage.removeItemAsync(SESSION_TOKEN_KEY);
};

const removeStoredToken = async () => {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  await Storage.removeItemAsync(SESSION_TOKEN_KEY);
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storedToken, setStoredToken] = useState<string | null>(null);

  useEffect(() => {
    void hydrateSession();
  }, []);

  const hydrateSession = async () => {
    setIsLoading(true);

    try {
      const token = await loadStoredToken();
      setStoredToken(token);
      setApiBearerToken(token);
      await loadCurrentUser();
      setErrorMessage(null);
    } catch (error) {
      setCurrentUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar la sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    const response = await apiFetch<ApiEnvelope<{ user: AuthSessionUser }>>('/auth/me');
    setCurrentUser(response.data.user);
  };

  const connectWithToken = async (token: string) => {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new Error('El token no puede estar vacío.');
    }

    setIsLoading(true);

    try {
      setApiBearerToken(trimmedToken);
      await saveStoredToken(trimmedToken);
      setStoredToken(trimmedToken);
      await loadCurrentUser();
      setErrorMessage(null);
    } catch (error) {
      setApiBearerToken(null);
      await removeStoredToken();
      setStoredToken(null);
      setCurrentUser(null);
      const message = error instanceof Error ? error.message : 'No se pudo validar el token.';
      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToGuest = async () => {
    setIsLoading(true);

    try {
      await removeStoredToken();
      setStoredToken(null);
      setApiBearerToken(null);
      await loadCurrentUser();
      setErrorMessage(null);
    } catch (error) {
      setCurrentUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo volver a modo visitante.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      connectWithToken,
      currentUser,
      errorMessage,
      isLoading,
      resetToGuest,
      storedToken
    }),
    [currentUser, errorMessage, isLoading, storedToken]
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
