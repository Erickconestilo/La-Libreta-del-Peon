import type { ReadingInsertResponse, StationMessage } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { deletePreparedPhoto, uploadPreparedPhotoToSignedUrl, type PreparedPhoto } from '@/lib/photo-upload';

import type { OutboxItem } from './outbox';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

export const syncOutboxItem = async (item: OutboxItem): Promise<void> => {
  if (item.entityType === 'station_message') {
    await syncStationMessage(item);
    return;
  }

  if (item.entityType === 'medicion') {
    if (item.operation === 'update' && item.payload.kind === 'reading_attachment') {
      await syncReadingAttachment(item);
    } else {
      await syncInstrumentReading(item);
    }
    return;
  }

  throw new Error(`Unexpected entity type: ${item.entityType}`);
};

const syncStationMessage = async (item: OutboxItem): Promise<void> => {
  const body = item.payload.body;
  const stationId = item.payload.stationId;

  if (typeof body !== 'string' || typeof stationId !== 'string') {
    throw new Error('Invalid station message outbox payload');
  }

  const response = await apiFetch<ApiEnvelope<StationMessage>>(
    `/stations/${stationId}/messages`,
    {
      body: JSON.stringify({
        body,
        clientRequestId: item.clientRequestId,
      }),
      method: 'POST'
    }
  );

  if (!response.data) {
    throw new Error('Server returned no data');
  }
};

const syncInstrumentReading = async (item: OutboxItem): Promise<void> => {
  const { roundPointId, ...input } = item.payload;

  if (
    typeof roundPointId !== 'string' ||
    typeof input.measuredAt !== 'string' ||
    (typeof input.valueNumeric !== 'number' && typeof input.valueText !== 'string')
  ) {
    throw new Error('Invalid instrument reading outbox payload');
  }

  const response = await apiFetch<ApiEnvelope<ReadingInsertResponse>>(
    `/round-points/${roundPointId}/readings`,
    {
      body: JSON.stringify({
        clientRequestId: item.clientRequestId,
        ...input,
      }),
      method: 'POST'
    }
  );

  if (!response.data) {
    throw new Error('Server returned no data');
  }
};

const syncReadingAttachment = async (item: OutboxItem): Promise<void> => {
  const roundPointId = item.payload.roundPointId;
  const readingClientRequestId = item.payload.readingClientRequestId;
  const readingInput = item.payload.readingInput;
  const photo = item.payload.photo;

  if (
    typeof roundPointId !== 'string' ||
    typeof readingClientRequestId !== 'string' ||
    !readingInput ||
    typeof readingInput !== 'object' ||
    !photo ||
    typeof photo !== 'object'
  ) {
    throw new Error('Invalid reading attachment outbox payload');
  }

  const input = readingInput as Record<string, unknown>;
  const preparedPhoto = photo as PreparedPhoto;

  if (
    typeof input.measuredAt !== 'string' ||
    (typeof input.valueNumeric !== 'number' && typeof input.valueText !== 'string') ||
    typeof preparedPhoto.localUri !== 'string' ||
    typeof preparedPhoto.fileSizeBytes !== 'number' ||
    (preparedPhoto.contentType !== 'image/jpeg' && preparedPhoto.contentType !== 'image/png' && preparedPhoto.contentType !== 'image/webp')
  ) {
    throw new Error('Invalid reading attachment outbox payload');
  }

  const readingResponse = await apiFetch<ApiEnvelope<ReadingInsertResponse>>(
    `/round-points/${roundPointId}/readings`,
    {
      body: JSON.stringify({
        clientRequestId: readingClientRequestId,
        ...input
      }),
      method: 'POST'
    }
  );

  if (!readingResponse.data) {
    throw new Error('Server returned no reading for attachment');
  }

  const signedUploadResponse = await apiFetch<ApiEnvelope<{ path: string; signedUrl: string }>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType: preparedPhoto.contentType,
      entityId: readingResponse.data.reading.id,
      entityType: 'reading',
      fileSizeBytes: preparedPhoto.fileSizeBytes,
      uploadId: item.clientRequestId
    }),
    method: 'POST'
  });

  if (!signedUploadResponse.data) {
    throw new Error('Server returned no signed upload for reading attachment');
  }

  const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUploadResponse.data.signedUrl, preparedPhoto, {
    timeoutMessage: 'La subida de la foto de lectura tardó demasiado. Se reintentará al recuperar conexión.',
    timeoutMs: 60000
  });

  if ((uploadResponse.status < 200 || uploadResponse.status >= 300) && uploadResponse.status !== 409) {
    throw new Error(`No se pudo subir la foto de la lectura (${uploadResponse.status}).`);
  }

  const attachmentResponse = await apiFetch<ApiEnvelope<unknown>>(
    `/round-points/${roundPointId}/readings/${readingResponse.data.reading.id}/attachments`,
    {
      body: JSON.stringify({
        attachmentType: 'photo',
        notes: null,
        storagePath: signedUploadResponse.data.path,
        title: null
      }),
      method: 'POST'
    }
  );

  if (!attachmentResponse.data) {
    throw new Error('Server returned no reading attachment');
  }

  await deletePreparedPhoto(preparedPhoto);
};
