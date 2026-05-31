const DEFAULT_DEV_API_BASE_URL = 'http://localhost:3000/api/v1';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || (
  process.env.NODE_ENV === 'production' ? '' : DEFAULT_DEV_API_BASE_URL
);
const GUEST_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_GUEST_PUBLIC_TOKEN ?? '';
let runtimeBearerToken: string | null = null;

export const setApiBearerToken = (token: string | null) => {
  runtimeBearerToken = token?.trim() ? token.trim() : null;
};

export const apiFetch = async <T>(path: string, init?: RequestInit) => {
  if (!API_BASE_URL) {
    throw new Error('La URL de API no está configurada para esta versión de la app.');
  }

  if (process.env.NODE_ENV === 'production' && !API_BASE_URL.startsWith('https://')) {
    throw new Error('La URL de API debe usar HTTPS en builds de producción.');
  }

  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  const authToken = runtimeBearerToken ?? GUEST_PUBLIC_TOKEN;

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers
    });
  } catch {
    throw new Error('No se pudo conectar. Revisa la conexión y vuelve a intentar.');
  }

  const json = (await response.json().catch(() => ({
    data: null,
    error: {
      message: null
    }
  }))) as T & {
    error?: {
      message?: string;
    } | null;
  };

  if (!response.ok) {
    throw new Error(getFriendlyApiErrorMessage(response.status, json.error?.message));
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
