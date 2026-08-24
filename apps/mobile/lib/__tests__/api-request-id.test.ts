import { describe, expect, it, jest } from '@jest/globals';

import { apiFetch } from '../api';
import { fetchWithTimeout } from '../fetch-timeout';

jest.mock('../fetch-timeout', () => ({
  fetchWithTimeout: jest.fn()
}));

const mockedFetchWithTimeout = jest.mocked(fetchWithTimeout);

describe('api login request diagnostics', () => {
  it('propagates the request id and reads it back from the response header', async () => {
    const requestId = '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812';
    mockedFetchWithTimeout.mockResolvedValueOnce({
      headers: { get: (name: string) => (name.toLowerCase() === 'x-request-id' ? requestId : null) },
      json: async () => ({ data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }),
      ok: false,
      status: 401
    } as unknown as Response);

    await expect(
      apiFetch('/auth/login', {
        body: JSON.stringify({ email: 'qa@example.test', password: 'not-included-in-diagnostics' }),
        method: 'POST',
        requestId,
        skipAuth: true
      })
    ).rejects.toMatchObject({ requestId, status: 401, code: 'INVALID_CREDENTIALS' });

    const [, init] = mockedFetchWithTimeout.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get('X-Request-ID')).toBe(requestId);
  });
});
