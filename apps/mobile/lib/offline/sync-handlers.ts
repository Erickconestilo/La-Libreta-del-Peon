import type { ReadingInsertResponse, StationMessage } from '@shared/types';

import { apiFetch } from '@/lib/api';

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
    await syncInstrumentReading(item);
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
