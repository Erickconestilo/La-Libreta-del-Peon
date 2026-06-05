import { fetchWithTimeout } from './fetch-timeout';

const DEFAULT_DEV_API_BASE_URL = 'http://localhost:3000/api/v1';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || (
  process.env.NODE_ENV === 'production' ? '' : DEFAULT_DEV_API_BASE_URL
);
const GUEST_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_GUEST_PUBLIC_TOKEN ?? '';
const API_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? '18000', 10);
let runtimeBearerToken: string | null = null;

type ApiFetchInit = RequestInit & {
  skipAuth?: boolean;
};

export class ApiRequestError extends Error {
  code?: string;
  rawMessage?: string | null;
  status: number;

  constructor(status: number, message: string, options: { code?: string; rawMessage?: string | null } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options.code;
    this.rawMessage = options.rawMessage;
    this.status = status;
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError => error instanceof ApiRequestError;

export const setApiBearerToken = (token: string | null) => {
  runtimeBearerToken = token?.trim() ? token.trim() : null;
};

export const apiFetch = async <T>(path: string, init?: ApiFetchInit) => {
  if (!API_BASE_URL) {
    throw new Error('La URL de API no está configurada para esta versión de la app.');
  }

  if (process.env.NODE_ENV === 'production' && !API_BASE_URL.startsWith('https://')) {
    throw new Error('La URL de API debe usar HTTPS en builds de producción.');
  }

  const { skipAuth, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers);
  headers.set('Content-Type', 'application/json');

  const authToken = runtimeBearerToken ?? GUEST_PUBLIC_TOKEN;

  if (!skipAuth && authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
      timeoutMessage: 'El servidor tardó demasiado en responder. Reintenta en unos segundos.',
      timeoutMs: API_REQUEST_TIMEOUT_MS
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('tardó demasiado')) {
      throw error;
    }

    throw new Error('No se pudo conectar. Revisa la conexión y vuelve a intentar.');
  }

  const json = (await response.json().catch(() => ({
    data: null,
    error: {
      message: null
    }
  }))) as T & {
    error?: {
      code?: string;
      message?: string;
    } | null;
  };

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      getFriendlyApiErrorMessage(response.status, json.error?.message),
      {
        code: json.error?.code,
        rawMessage: json.error?.message
      }
    );
  }

  return json;
};

const getFriendlyApiErrorMessage = (status: number, message?: string | null) => {
  const normalizedMessage = message?.trim();

  if (status === 404 && normalizedMessage && /route not found/i.test(normalizedMessage)) {
    return 'Función pendiente de publicar. Vuelve a intentarlo más tarde.';
  }

  if (status >= 500) {
    return 'No se pudo completar la operación. Reintenta en unos segundos.';
  }

  return normalizedMessage || 'Error de comunicación. Reintenta en unos segundos.';
};
