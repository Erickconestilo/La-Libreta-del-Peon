import { describe, expect, it } from '@jest/globals';

import { ApiRequestError } from '@/lib/api';
import { getAuthRequestDiagnostic } from '../auth-diagnostics';

describe('getAuthRequestDiagnostic', () => {
  it('keeps only safe correlation fields from an API error', () => {
    const error = new ApiRequestError(401, 'Correo o contraseña no válidos.', {
      code: 'INVALID_CREDENTIALS',
      rawMessage: 'password=secret-token-value',
      requestId: '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812'
    });

    expect(getAuthRequestDiagnostic(error)).toEqual({
      code: 'INVALID_CREDENTIALS',
      requestId: '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812',
      status: 401
    });
    expect(JSON.stringify(getAuthRequestDiagnostic(error))).not.toContain('secret-token-value');
  });

  it('does not create a support diagnostic for a network error', () => {
    expect(getAuthRequestDiagnostic(new Error('No se pudo conectar.'))).toBeNull();
  });
});
