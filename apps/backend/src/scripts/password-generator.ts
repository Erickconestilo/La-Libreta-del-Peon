import { randomInt } from 'node:crypto';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export const generateTemporaryPassword = (length = 20) => {
  if (!Number.isInteger(length) || length < 18 || length > 20) {
    throw new Error('La contraseña temporal debe tener entre 18 y 20 caracteres.');
  }

  return Array.from({ length }, () => ALPHANUMERIC[randomInt(ALPHANUMERIC.length)]).join('');
};
