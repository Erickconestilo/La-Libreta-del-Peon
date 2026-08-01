import { AppError } from './app-error.js';

type ScopedResourceAccessOptions<T> = {
  code: string;
  loadResource: () => Promise<T | null>;
  message: string;
  verifyAfterAccess?: () => Promise<void>;
};

/**
 * Keeps authorization ahead of external Storage checks, avoiding a resource-existence oracle.
 */
export const requireScopedResourceBeforeExternalCheck = async <T>({
  code,
  loadResource,
  message,
  verifyAfterAccess
}: ScopedResourceAccessOptions<T>): Promise<T> => {
  const resource = await loadResource();

  if (!resource) {
    throw new AppError(message, 404, code);
  }

  await verifyAfterAccess?.();
  return resource;
};
