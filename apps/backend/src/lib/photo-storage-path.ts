import path from 'node:path';

import { AppError } from './app-error.js';

export type StorageObjectLike = {
  name?: string | null;
};

export const getPhotoObjectPathParts = (storagePath: string) => {
  const normalizedPath = storagePath.trim().replace(/\\/g, '/');
  const objectName = path.posix.basename(normalizedPath);
  const directoryPath = path.posix.dirname(normalizedPath);

  if (!normalizedPath || !objectName || objectName === '.' || directoryPath === '.' || directoryPath === '') {
    throw new AppError('Invalid photo storage path', 400, 'INVALID_PHOTO_STORAGE_PATH');
  }

  return {
    directoryPath,
    objectName,
    normalizedPath
  };
};

export const hasExactPhotoObjectMatch = (storagePath: string, objects: StorageObjectLike[]) => {
  const { objectName } = getPhotoObjectPathParts(storagePath);

  return objects.some((object) => object.name === objectName);
};
