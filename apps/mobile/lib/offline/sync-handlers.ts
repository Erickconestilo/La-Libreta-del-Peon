import type { MountingEvidence, MountingVisit, ReadingInsertResponse, StationMessage } from '@shared/types';

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
    } else if (item.payload.kind === 'mounting_evidence') {
      await syncMountingEvidence(item);
    } else if (item.payload.kind === 'mounting_visit_update') {
      await syncMountingVisitUpdate(item);
    } else if (item.payload.kind === 'mounting_visit') {
      await syncMountingVisit(item);
    } else if (item.payload.kind === 'work_completion_report') {
      await syncWorkCompletionReport(item);
    } else {
      await syncInstrumentReading(item);
    }
    return;
  }

  throw new Error(`Unexpected entity type: ${item.entityType}`);
};

const syncWorkCompletionReport = async (item: OutboxItem): Promise<void> => {
  const { kind: _kind, roundId, ...input } = item.payload;

  if (
    typeof roundId !== 'string' ||
    typeof input.zoneLabel !== 'string' ||
    (input.status !== 'partial' && input.status !== 'completed' && input.status !== 'blocked') ||
    !Array.isArray(input.pendingReasons)
  ) {
    throw new Error('Invalid work completion report outbox payload');
  }

  const response = await apiFetch<ApiEnvelope<unknown>>(`/rounds/${roundId}/completion-reports`, {
    body: JSON.stringify({ clientRequestId: item.clientRequestId, ...input }),
    method: 'POST'
  });

  if (!response.data) throw new Error('Server returned no work completion report');
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

const syncMountingVisit = async (item: OutboxItem): Promise<void> => {
  const stationId = item.payload.stationId;
  const visitInput = item.payload.visitInput;

  if (typeof stationId !== 'string' || !visitInput || typeof visitInput !== 'object') {
    throw new Error('Invalid mounting visit outbox payload');
  }

  const response = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits`, {
    body: JSON.stringify({
      clientRequestId: item.clientRequestId,
      ...(visitInput as Record<string, unknown>)
    }),
    method: 'POST'
  });

  if (!response.data) {
    throw new Error('Server returned no mounting visit');
  }
};

const syncMountingVisitUpdate = async (item: OutboxItem): Promise<void> => {
  const stationId = item.payload.stationId;
  const visitId = item.payload.visitId;
  const visitClientRequestId = item.payload.visitClientRequestId;
  const visitInput = item.payload.visitInput;
  const updateInput = item.payload.updateInput;

  if (
    typeof stationId !== 'string' ||
    typeof visitId !== 'string' ||
    typeof visitClientRequestId !== 'string' ||
    !visitInput ||
    typeof visitInput !== 'object' ||
    !updateInput ||
    typeof updateInput !== 'object'
  ) {
    throw new Error('Invalid mounting visit update outbox payload');
  }

  const visitResponse = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits`, {
    body: JSON.stringify({
      clientRequestId: visitClientRequestId,
      ...(visitInput as Record<string, unknown>)
    }),
    method: 'POST'
  });

  if (!visitResponse.data) {
    throw new Error('Server returned no mounting visit for update');
  }

  const response = await apiFetch<ApiEnvelope<MountingVisit>>(
    `/stations/${stationId}/mounting-visits/${visitResponse.data.id}`,
    {
      body: JSON.stringify(updateInput),
      method: 'PATCH'
    }
  );

  if (!response.data) {
    throw new Error('Server returned no updated mounting visit');
  }
};

const syncMountingEvidence = async (item: OutboxItem): Promise<void> => {
  const stationId = item.payload.stationId;
  const visitId = item.payload.visitId;
  const visitClientRequestId = item.payload.visitClientRequestId;
  const visitInput = item.payload.visitInput;
  const evidenceInput = item.payload.evidenceInput;
  const photo = item.payload.photo;

  if (
    typeof stationId !== 'string' ||
    typeof visitId !== 'string' ||
    (visitClientRequestId !== undefined && typeof visitClientRequestId !== 'string') ||
    (visitClientRequestId && (!visitInput || typeof visitInput !== 'object')) ||
    !evidenceInput ||
    typeof evidenceInput !== 'object' ||
    !photo ||
    typeof photo !== 'object'
  ) {
    throw new Error('Invalid mounting evidence outbox payload');
  }

  const preparedPhoto = photo as PreparedPhoto;
  if (
    typeof preparedPhoto.localUri !== 'string' ||
    typeof preparedPhoto.fileSizeBytes !== 'number' ||
    (preparedPhoto.contentType !== 'image/jpeg' && preparedPhoto.contentType !== 'image/png' && preparedPhoto.contentType !== 'image/webp')
  ) {
    throw new Error('Invalid mounting evidence photo outbox payload');
  }

  let resolvedVisitId = visitId;
  if (typeof visitClientRequestId === 'string') {
    const visitResponse = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits`, {
      body: JSON.stringify({
        clientRequestId: visitClientRequestId,
        ...(visitInput as Record<string, unknown>),
        // Creation is always draft; a later outbox update carries the final status.
        status: 'draft'
      }),
      method: 'POST'
    });

    if (!visitResponse.data) {
      throw new Error('Server returned no mounting visit for evidence');
    }

    resolvedVisitId = visitResponse.data.id;
  }

  const signedUploadResponse = await apiFetch<ApiEnvelope<{ path: string; signedUrl: string }>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType: preparedPhoto.contentType,
      entityId: resolvedVisitId,
      entityType: 'mounting_visit',
      fileSizeBytes: preparedPhoto.fileSizeBytes,
      uploadId: item.clientRequestId
    }),
    method: 'POST'
  });

  if (!signedUploadResponse.data) {
    throw new Error('Server returned no signed upload for mounting evidence');
  }

  const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUploadResponse.data.signedUrl, preparedPhoto, {
    timeoutMessage: 'La subida de la evidencia tardó demasiado. Se reintentará al recuperar conexión.',
    timeoutMs: 60000
  });

  if ((uploadResponse.status < 200 || uploadResponse.status >= 300) && uploadResponse.status !== 409) {
    throw new Error(`No se pudo subir la evidencia de montaje (${uploadResponse.status}).`);
  }

  const response = await apiFetch<ApiEnvelope<MountingEvidence>>(
    `/stations/${stationId}/mounting-visits/${resolvedVisitId}/evidence`,
    {
      body: JSON.stringify({
        clientRequestId: item.clientRequestId,
        ...(evidenceInput as Record<string, unknown>),
        storagePath: signedUploadResponse.data.path
      }),
      method: 'POST'
    }
  );

  if (!response.data) {
    throw new Error('Server returned no mounting evidence');
  }

  await deletePreparedPhoto(preparedPhoto);
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
