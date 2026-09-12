import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidMountingVisitPhotoPath,
  isValidReadingPhotoPath,
  validateSignedPhotoUploadInput
} from './photo-validation.js';

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

test('mounting visit uploads require a unique upload id and exact visit path', () => {
  const visitId = '33333333-3333-4333-8333-333333333333';

  assert.throws(
    () => validateSignedPhotoUploadInput({
      contentType: 'image/jpeg',
      entityId: visitId,
      entityType: 'mounting_visit',
      fileSizeBytes: 1024
    }),
    /Invalid photo upload payload/
  );

  assert.equal(
    isValidMountingVisitPhotoPath(visitId, `mounting-visits/${visitId}/${uploadId}.jpg`),
    true
  );
  assert.equal(
    isValidMountingVisitPhotoPath(visitId, `mounting-visits/${uploadId}/${visitId}.jpg`),
    false
  );
});
