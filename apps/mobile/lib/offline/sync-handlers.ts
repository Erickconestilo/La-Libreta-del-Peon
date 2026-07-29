import type { StationMessage } from '@shared/types';

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
  if (item.entityType !== 'station_message') {
    throw new Error(`Unexpected entity type: ${item.entityType}`);
  }

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
