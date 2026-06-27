import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from './app-error.js';
import { getPhotoObjectPathParts, hasExactPhotoObjectMatch } from './photo-storage-path.js';

test('getPhotoObjectPathParts extracts directory and object name', () => {
  const parts = getPhotoObjectPathParts('stations/123/photo-1.jpg');

  assert.deepEqual(parts, {
    directoryPath: 'stations/123',
    normalizedPath: 'stations/123/photo-1.jpg',
    objectName: 'photo-1.jpg'
  });
});

test('getPhotoObjectPathParts rejects invalid paths', () => {
  assert.throws(() => getPhotoObjectPathParts('photo-1.jpg'), (error: unknown) => {
    return error instanceof AppError && error.code === 'INVALID_PHOTO_STORAGE_PATH';
  });
});

test('hasExactPhotoObjectMatch only accepts an exact object name match', () => {
  assert.equal(
    hasExactPhotoObjectMatch('stations/123/photo-1.jpg', [
      { name: 'photo-1.jpg' },
      { name: 'photo-1-thumb.jpg' }
    ]),
    true
  );

  assert.equal(
    hasExactPhotoObjectMatch('stations/123/photo-1.jpg', [
      { name: 'photo-1-thumb.jpg' },
      { name: 'photo-10.jpg' }
    ]),
    false
  );
});
