import { isApiRequestError } from '@/lib/api';

export type AuthRequestDiagnostic = {
  code: string | null;
  requestId: string | null;
  status: number | null;
};

export const getAuthRequestDiagnostic = (error: unknown): AuthRequestDiagnostic | null => {
  if (!isApiRequestError(error)) {
    return null;
  }

  return {
    code: error.code ?? null,
    requestId: error.requestId ?? null,
    status: error.status
  };
};
