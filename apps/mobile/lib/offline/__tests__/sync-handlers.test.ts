import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiFetch } from '@/lib/api';
import { deletePreparedPhoto, uploadPreparedPhotoToSignedUrl } from '@/lib/photo-upload';

import type { OutboxItem } from '../outbox';
import { syncOutboxItem } from '../sync-handlers';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

jest.mock('@/lib/photo-upload', () => ({
  deletePreparedPhoto: jest.fn(),
  uploadPreparedPhotoToSignedUrl: jest.fn()
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockDeletePreparedPhoto = deletePreparedPhoto as jest.MockedFunction<typeof deletePreparedPhoto>;
const mockUploadPreparedPhotoToSignedUrl = uploadPreparedPhotoToSignedUrl as jest.MockedFunction<typeof uploadPreparedPhotoToSignedUrl>;

const stationMessageItem: OutboxItem = {
  clientRequestId: 'a9698cea-4d64-4382-8182-7a271315e075',
  conflictData: null,
  createdAt: '2026-07-29 19:34:25',
  entityType: 'station_message',
  errorMessage: null,
  id: '59c530b4-b39c-4547-aa5d-e7b78fbd8ed9',
  lastSyncAttemptAt: null,
  operation: 'insert',
  payload: {
    body: 'Mensaje offline',
    stationId: '13a0cba2-2f13-4661-a580-877484ee92e8',
  },
  retryCount: 0,
  status: 'pending',
  syncedAt: null,
};

const instrumentReadingItem: OutboxItem = {
  clientRequestId: 'a5ca42c2-af48-4b10-81cc-4d6e3b021c6c',
  conflictData: null,
  createdAt: '2026-07-31 08:00:00',
  entityType: 'medicion',
  errorMessage: null,
  id: '0d88a337-9c75-4853-83e1-0e4b03a3f7a2',
  lastSyncAttemptAt: null,
  operation: 'insert',
  payload: {
    measuredAt: '2026-07-31T08:00:00.000Z',
    notes: 'Lectura tomada sin cobertura',
    roundPointId: 'a741a875-efbd-4e73-9f2e-66c07d46849e',
    unit: 'mm',
    valueNumeric: 2.4,
    valueText: null,
  },
  retryCount: 0,
  status: 'pending',
  syncedAt: null,
};

describe('syncOutboxItem', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockDeletePreparedPhoto.mockReset();
    mockUploadPreparedPhotoToSignedUrl.mockReset();
    mockUploadPreparedPhotoToSignedUrl.mockResolvedValue({ status: 200 } as never);
    mockApiFetch.mockResolvedValue({
      data: {
        body: 'Mensaje offline',
        createdAt: '2026-07-29T19:36:31.273Z',
        createdBy: '8dcf41ed-91ea-40ac-ac26-4957c026501b',
        createdByUser: null,
        id: 'a310e1d6-35a5-429a-9db1-c4387ed4135a',
        stationId: '13a0cba2-2f13-4661-a580-877484ee92e8',
      },
      error: null,
    } as never);
  });

  it('sends the persisted clientRequestId with the station message', async () => {
    await syncOutboxItem(stationMessageItem);

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/stations/13a0cba2-2f13-4661-a580-877484ee92e8/messages',
      {
        body: JSON.stringify({
          body: 'Mensaje offline',
          clientRequestId: 'a9698cea-4d64-4382-8182-7a271315e075',
        }),
        method: 'POST',
      }
    );
  });

  it('rejects an invalid persisted payload before calling the API', async () => {
    await expect(
      syncOutboxItem({
        ...stationMessageItem,
        payload: { body: 'Sin estación' },
      })
    ).rejects.toThrow('Invalid station message outbox payload');

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('sends a persisted instrument reading with its original clientRequestId', async () => {
    await syncOutboxItem(instrumentReadingItem);

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/round-points/a741a875-efbd-4e73-9f2e-66c07d46849e/readings',
      {
        body: JSON.stringify({
          clientRequestId: 'a5ca42c2-af48-4b10-81cc-4d6e3b021c6c',
          measuredAt: '2026-07-31T08:00:00.000Z',
          notes: 'Lectura tomada sin cobertura',
          unit: 'mm',
          valueNumeric: 2.4,
          valueText: null,
        }),
        method: 'POST',
      }
    );
  });

  it('rejects an invalid persisted reading before calling the API', async () => {
    await expect(
      syncOutboxItem({
        ...instrumentReadingItem,
        payload: { measuredAt: '2026-07-31T08:00:00.000Z', roundPointId: 'missing-value' },
      })
    ).rejects.toThrow('Invalid instrument reading outbox payload');

    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('recreates the reading idempotently before attaching its persisted photo', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        data: {
          reading: {
            id: 'c741a875-efbd-4e73-9f2e-66c07d46849e'
          }
        },
        error: null
      } as never)
      .mockResolvedValueOnce({
        data: {
          path: 'readings/c741a875-efbd-4e73-9f2e-66c07d46849e/a5ca42c2-af48-4b10-81cc-4d6e3b021c6c.jpg',
          signedUrl: 'https://storage.example/upload'
        },
        error: null
      } as never)
      .mockResolvedValueOnce({ data: { id: 'attachment-id' }, error: null } as never);

    await syncOutboxItem({
      ...instrumentReadingItem,
      operation: 'update',
      payload: {
        kind: 'reading_attachment',
        photo: {
          contentType: 'image/jpeg',
          fileSizeBytes: 1024,
          height: 800,
          localUri: 'file:///documents/topofield-offline-photos/photo.jpg',
          width: 1200
        },
        readingClientRequestId: instrumentReadingItem.clientRequestId,
        readingInput: {
          measuredAt: '2026-07-31T08:00:00.000Z',
          notes: 'Lectura tomada sin cobertura',
          unit: 'mm',
          valueNumeric: 2.4,
          valueText: null
        },
        roundPointId: 'a741a875-efbd-4e73-9f2e-66c07d46849e'
      }
    });

    expect(mockUploadPreparedPhotoToSignedUrl).toHaveBeenCalledWith(
      'https://storage.example/upload',
      expect.objectContaining({ localUri: 'file:///documents/topofield-offline-photos/photo.jpg' }),
      expect.any(Object)
    );
    expect(mockApiFetch).toHaveBeenLastCalledWith(
      '/round-points/a741a875-efbd-4e73-9f2e-66c07d46849e/readings/c741a875-efbd-4e73-9f2e-66c07d46849e/attachments',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockDeletePreparedPhoto).toHaveBeenCalledTimes(1);
  });
});
