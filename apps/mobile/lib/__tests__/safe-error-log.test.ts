import { describe, expect, it } from '@jest/globals';

import { formatSafeErrorForLog } from '../safe-error-log';

describe('safe error logging', () => {
  it('keeps diagnostic metadata without emitting the error message', () => {
    const error = new Error('password=super-secret body=private-data');
    Object.assign(error, {
      code: 'INVALID_CREDENTIALS',
      requestId: 'request-123',
      status: 401
    });

    const output = formatSafeErrorForLog(error);

    expect(output).toBe('name=Error status=401 code=INVALID_CREDENTIALS requestId=request-123');
    expect(output).not.toContain('super-secret');
    expect(output).not.toContain('private-data');
  });

  it('rejects unsafe metadata and never falls back to arbitrary values', () => {
    const output = formatSafeErrorForLog({
      code: 'token=secret',
      requestId: 'Bearer secret-token',
      status: Number.NaN
    });

    expect(output).toBe('type=unknown-error');
    expect(output).not.toContain('secret');
  });
});

