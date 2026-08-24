import assert from 'node:assert/strict';
import test from 'node:test';

import { generateTemporaryPassword } from './password-generator.js';

test('generates a temporary password with safe QA characters', () => {
  const password = generateTemporaryPassword();

  assert.equal(password.length, 20);
  assert.match(password, /^[A-Za-z0-9]+$/);
});

test('rejects lengths outside the supported temporary-password range', () => {
  assert.throws(() => generateTemporaryPassword(17), /entre 18 y 20/);
  assert.throws(() => generateTemporaryPassword(21), /entre 18 y 20/);
});
