const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const GUEST_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_GUEST_PUBLIC_TOKEN ?? '';
let runtimeBearerToken: string | null = null;

export const setApiBearerToken = (token: string | null) => {
  runtimeBearerToken = token?.trim() ? token.trim() : null;
};

export const apiFetch = async <T>(path: string, init?: RequestInit) => {
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
    throw new Error('No se pudo conectar con el backend. Revisa la conexión y vuelve a intentar.');
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
    return 'Función no disponible en el backend desplegado. Actualiza el backend y vuelve a intentar.';
  }

  if (status >= 500) {
    return 'El backend no pudo completar la operación. Reintenta en unos segundos.';
  }

  return normalizedMessage || 'Error de comunicación con el backend.';
};
