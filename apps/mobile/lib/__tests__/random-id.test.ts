import { describe, expect, it, jest } from '@jest/globals';
import * as Crypto from 'expo-crypto';

import { createRandomId } from '../random-id';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812')
}));

describe('createRandomId', () => {
  it('uses the Expo native UUID implementation without relying on global crypto', () => {
    expect(createRandomId()).toBe('6ca7dc0b-6681-4d5c-b5a3-87ee3c6a6812');
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
  });
});
