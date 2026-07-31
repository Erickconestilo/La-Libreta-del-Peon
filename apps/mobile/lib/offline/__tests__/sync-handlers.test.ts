import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiFetch } from '@/lib/api';

import type { OutboxItem } from '../outbox';
import { syncOutboxItem } from '../sync-handlers';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

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
});
