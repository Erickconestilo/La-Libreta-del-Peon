import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import { app } from '../app.js';
import { REQUEST_LOG_FORMAT, requestIdMiddleware } from './request-id.js';

test('preserves a valid client request id in the response', () => {
  const requestId = '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812';
  const headers = new Map<string, string>();
  let nextCalled = false;

  requestIdMiddleware(
    {
      get: (name: string) => (name.toLowerCase() === 'x-request-id' ? requestId : undefined)
    } as never,
    {
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value)
    } as never,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(headers.get('x-request-id'), requestId);
  assert.equal(nextCalled, true);
});

test('replaces an invalid client request id with a UUID', () => {
  const headers = new Map<string, string>();

  requestIdMiddleware(
    {
      get: () => 'not-a-request-id'
    } as never,
    {
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value)
    } as never,
    () => undefined
  );

  assert.match(
    headers.get('x-request-id') ?? '',
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test('uses a log format that excludes request bodies, authorization and credentials', () => {
  assert.equal(REQUEST_LOG_FORMAT, ':request-id :method :url :status');
  assert.doesNotMatch(REQUEST_LOG_FORMAT, /body|authorization|password|token/i);
});

test('the login endpoint returns the valid request id without logging its body', async () => {
  const requestId = '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812';
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`, {
      body: JSON.stringify({ email: '', password: 'secret-that-must-not-be-logged' }),
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId
      },
      method: 'POST'
    });
    const responseBody = await response.text();

    assert.equal(response.status, 400);
    assert.equal(response.headers.get('x-request-id'), requestId);
    assert.match(responseBody, /MISSING_CREDENTIALS/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
