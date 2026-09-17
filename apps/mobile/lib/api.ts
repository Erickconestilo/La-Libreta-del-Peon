import { fetchWithTimeout } from './fetch-timeout';

const DEFAULT_DEV_API_BASE_URL = 'http://localhost:3000/api/v1';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || (
  process.env.NODE_ENV === 'production' ? '' : DEFAULT_DEV_API_BASE_URL
);
const GUEST_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_GUEST_PUBLIC_TOKEN ?? '';
const API_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_MS ?? '18000', 10);
export const API_TIMEOUT_MESSAGE = 'El servidor tardó demasiado en responder. Reintenta en unos segundos.';
export const API_NETWORK_UNAVAILABLE_MESSAGE = 'No se pudo conectar. Revisa la conexión y vuelve a intentar.';
let runtimeBearerToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

export type ApiFetchInit = RequestInit & {
  requestId?: string;
  skipAuth?: boolean;
};

export type ApiDownloadResult = {
  body: ArrayBuffer;
  contentType: string | null;
};

export class ApiRequestError extends Error {
  code?: string;
  rawMessage?: string | null;
  requestId?: string | null;
  status: number;

  constructor(
    status: number,
    message: string,
    options: { code?: string; rawMessage?: string | null; requestId?: string | null } = {}
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options.code;
    this.rawMessage = options.rawMessage;
    this.requestId = options.requestId;
    this.status = status;
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError => error instanceof ApiRequestError;

export type ApiTransportErrorCode = 'NETWORK_UNAVAILABLE' | 'TIMEOUT';

export class ApiTransportError extends Error {
  code: ApiTransportErrorCode;

  constructor(code: ApiTransportErrorCode, message: string) {
    super(message);
    this.name = 'ApiTransportError';
    this.code = code;
  }
}

export const isApiTransportError = (error: unknown): error is ApiTransportError =>
  error instanceof ApiTransportError;

const toApiTransportError = (error: unknown) => {
  if (isApiTransportError(error)) {
    return error;
  }

  if (error instanceof Error && error.message === API_TIMEOUT_MESSAGE) {
    return new ApiTransportError('TIMEOUT', API_TIMEOUT_MESSAGE);
  }

  return new ApiTransportError('NETWORK_UNAVAILABLE', API_NETWORK_UNAVAILABLE_MESSAGE);
};

export const setApiBearerToken = (token: string | null) => {
  runtimeBearerToken = token?.trim() ? token.trim() : null;
};

export const setApiAuthFailureHandler = (handler: (() => void) | null) => {
  authFailureHandler = handler;
};

const notifyInvalidRuntimeToken = () => {
  if (!runtimeBearerToken) {
    return;
  }

  runtimeBearerToken = null;
  authFailureHandler?.();
};

export const apiFetch = async <T>(path: string, init?: ApiFetchInit) => {
  if (!API_BASE_URL) {
    throw new Error('La URL de API no está configurada para esta versión de la app.');
  }

  if (process.env.NODE_ENV === 'production' && !API_BASE_URL.startsWith('https://')) {
    throw new Error('La URL de API debe usar HTTPS en builds de producción.');
  }

  const { requestId, skipAuth, ...requestInit } = init ?? {};
  const method = (requestInit.method ?? 'GET').toUpperCase();
  const authToken = runtimeBearerToken ?? GUEST_PUBLIC_TOKEN;

  const request = async (token: string | null) => {
    const headers = new Headers(requestInit.headers);
    headers.set('Content-Type', 'application/json');

    if (requestId) {
      headers.set('X-Request-ID', requestId);
    }

    if (!skipAuth && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;

    try {
      response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
        ...requestInit,
        headers,
        timeoutMessage: API_TIMEOUT_MESSAGE,
        timeoutMs: API_REQUEST_TIMEOUT_MS
      });
    } catch (error) {
      throw toApiTransportError(error);
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

    return {
      json,
      response
    };
  };

  let { json, response } = await request(authToken);
  const invalidRuntimeToken =
    !skipAuth &&
    runtimeBearerToken &&
    response.status === 401 &&
    json.error?.code === 'INVALID_TOKEN';

  if (invalidRuntimeToken) {
    notifyInvalidRuntimeToken();
  }

  if (
    invalidRuntimeToken &&
    method === 'GET' &&
    GUEST_PUBLIC_TOKEN &&
    canRetryPublicReadAsGuest(path)
  ) {
    ({ json, response } = await request(GUEST_PUBLIC_TOKEN));
  }

  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      getFriendlyApiErrorMessage(response.status, json.error?.message, json.error?.code),
      {
        code: json.error?.code,
        rawMessage: json.error?.message,
        requestId: response.headers.get('x-request-id') ?? requestId ?? null
      }
    );
  }

  return json;
};

export const apiDownload = async (path: string, init?: ApiFetchInit): Promise<ApiDownloadResult> => {
  if (!API_BASE_URL) {
    throw new Error('La URL de API no está configurada para esta versión de la app.');
  }

  if (process.env.NODE_ENV === 'production' && !API_BASE_URL.startsWith('https://')) {
    throw new Error('La URL de API debe usar HTTPS en builds de producción.');
  }

  const { requestId, skipAuth, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers);
  headers.set('Content-Type', 'application/json');

  if (requestId) {
    headers.set('X-Request-ID', requestId);
  }

  const authToken = runtimeBearerToken ?? GUEST_PUBLIC_TOKEN;
  if (!skipAuth && authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
      timeoutMessage: API_TIMEOUT_MESSAGE,
      timeoutMs: API_REQUEST_TIMEOUT_MS
    });
  } catch (error) {
    throw toApiTransportError(error);
  }

  if (runtimeBearerToken && response.status === 401) {
    const errorPayload = await response.clone().json().catch(() => null) as { error?: { code?: string } } | null;
    if (errorPayload?.error?.code === 'INVALID_TOKEN') {
      notifyInvalidRuntimeToken();
    }
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({ error: { message: null } })) as {
      error?: { code?: string; message?: string } | null;
    };
    throw new ApiRequestError(
      response.status,
      getFriendlyApiErrorMessage(response.status, errorPayload.error?.message, errorPayload.error?.code),
      {
        code: errorPayload.error?.code,
        rawMessage: errorPayload.error?.message,
        requestId: response.headers.get('x-request-id') ?? requestId ?? null
      }
    );
  }

  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get('content-type')
  };
};

const canRetryPublicReadAsGuest = (path: string) => {
  const pathname = path.split('?')[0];

  return (
    pathname === '/projects' ||
    /^\/projects\/[0-9a-f-]{36}$/i.test(pathname) ||
    pathname === '/stations' ||
    /^\/stations\/[0-9a-f-]{36}$/i.test(pathname) ||
    /^\/stations\/[0-9a-f-]{36}\/photos$/i.test(pathname) ||
    /^\/stations\/[0-9a-f-]{36}\/prisms$/i.test(pathname) ||
    pathname === '/guide-entries' ||
    /^\/guide-entries\/[0-9a-f-]{36}$/i.test(pathname) ||
    pathname.startsWith('/prisms/coverage/')
  );
};

const getFriendlyApiErrorMessage = (status: number, message?: string | null, code?: string) => {
  const normalizedMessage = message?.trim();

  if (status === 401 && (code === 'INVALID_TOKEN' || normalizedMessage === 'Invalid authentication token')) {
    return 'La sesión técnica es inválida. Revalida o entra de nuevo.';
  }

  if (status === 401 && code === 'INVALID_CREDENTIALS') {
    return 'Correo o contraseña no válidos.';
  }

  if (status === 401 && (code === 'UNAUTHORIZED' || normalizedMessage === 'Authentication required')) {
    return 'Necesitas una sesión técnica válida para esta acción.';
  }

  if (status === 404 && normalizedMessage && /route not found/i.test(normalizedMessage)) {
    return 'Función pendiente de publicar. Vuelve a intentarlo más tarde.';
  }

  if (status === 401 && normalizedMessage && /invalid authentication token/i.test(normalizedMessage)) {
    return 'Necesitas una sesión técnica válida. Revalida tu cuenta en Perfil.';
  }

  if (status >= 500) {
    return 'No se pudo completar la operación. Reintenta en unos segundos.';
  }

  return normalizedMessage || 'Error de comunicación. Reintenta en unos segundos.';
};
