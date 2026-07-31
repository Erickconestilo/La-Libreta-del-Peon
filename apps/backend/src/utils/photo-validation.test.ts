import assert from 'node:assert/strict';
import test from 'node:test';

import { isValidReadingPhotoPath, validateSignedPhotoUploadInput } from './photo-validation.js';

const readingId = '11111111-1111-4111-8111-111111111111';
const uploadId = '22222222-2222-4222-8222-222222222222';

test('reading photo upload requires a deterministic upload id', () => {
  assert.throws(
    () =>
      validateSignedPhotoUploadInput({
        contentType: 'image/jpeg',
        entityId: readingId,
        entityType: 'reading',
        fileSizeBytes: 1024
      }),
    /Invalid photo upload payload/
  );

  assert.equal(
    validateSignedPhotoUploadInput({
      contentType: 'image/jpeg',
      entityId: readingId,
      entityType: 'reading',
      fileSizeBytes: 1024,
      uploadId
    }).uploadId,
    uploadId
  );
});

test('reading photo path is scoped to exactly one reading', () => {
  assert.equal(isValidReadingPhotoPath(readingId, `readings/${readingId}/${uploadId}.jpg`), true);
  assert.equal(isValidReadingPhotoPath(readingId, `readings/${uploadId}/${readingId}.jpg`), false);
  assert.equal(isValidReadingPhotoPath(readingId, `stations/${readingId}/${uploadId}.jpg`), false);
});
