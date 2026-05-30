const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';
const GUEST_PUBLIC_TOKEN = process.env.EXPO_PUBLIC_GUEST_PUBLIC_TOKEN ?? '';

export const apiFetch = async <T>(path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');

  if (GUEST_PUBLIC_TOKEN) {
    headers.set('Authorization', `Bearer ${GUEST_PUBLIC_TOKEN}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  const json = (await response.json()) as T & {
    error?: {
      message?: string;
    } | null;
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? 'Error de comunicación con el backend');
  }

  return json;
};
