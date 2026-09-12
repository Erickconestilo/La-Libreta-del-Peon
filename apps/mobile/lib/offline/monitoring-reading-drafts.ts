import type { PotentiometerPair } from '@shared/types';

import { getDatabase } from './database';

export type MonitoringReadingDraft = {
  mode: 'numeric' | 'text';
  notes: string;
  numericValue: string;
  potPosition: string;
  potScale: string;
  potUnit: string;
  potValues: Record<PotentiometerPair, string>;
  textValue: string;
  unit: string;
};

type DraftRow = {
  draft_json: string;
  round_point_id: string;
  session_id: string;
  updated_at: string;
};

const isDraft = (value: unknown): value is MonitoringReadingDraft => {
  if (!value || typeof value !== 'object') return false;

  const draft = value as Partial<MonitoringReadingDraft>;
  const potValues = draft.potValues;

  return (
    (draft.mode === 'numeric' || draft.mode === 'text') &&
    typeof draft.notes === 'string' &&
    typeof draft.numericValue === 'string' &&
    typeof draft.potPosition === 'string' &&
    typeof draft.potScale === 'string' &&
    typeof draft.potUnit === 'string' &&
    typeof draft.textValue === 'string' &&
    typeof draft.unit === 'string' &&
    Boolean(potValues) &&
    typeof potValues?.['blue-brown'] === 'string' &&
    typeof potValues?.['yellow-blue'] === 'string' &&
    typeof potValues?.['yellow-brown'] === 'string'
  );
};

export const saveMonitoringReadingDraft = (
  sessionId: string,
  roundPointId: string,
  draft: MonitoringReadingDraft,
  updatedAt = new Date().toISOString()
) => {
  try {
    getDatabase().runSync(
      `
        INSERT INTO monitoring_reading_drafts (session_id, round_point_id, draft_json, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, round_point_id)
        DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at
      `,
      [sessionId, roundPointId, JSON.stringify(draft), updatedAt]
    );
  } catch {
    // The form remains usable while the root layout finishes SQLite setup.
  }
};

export const getMonitoringReadingDraft = (sessionId: string, roundPointId: string) => {
  try {
    const row = getDatabase().getFirstSync<DraftRow>(
      `
        SELECT session_id, round_point_id, draft_json, updated_at
        FROM monitoring_reading_drafts
        WHERE session_id = ? AND round_point_id = ?
      `,
      [sessionId, roundPointId]
    );

    if (!row) return null;

    const parsed: unknown = JSON.parse(row.draft_json);
    if (!isDraft(parsed)) return null;

    return {
      draft: parsed,
      updatedAt: row.updated_at
    };
  } catch {
    return null;
  }
};

export const clearMonitoringReadingDraft = (sessionId: string, roundPointId: string) => {
  try {
    getDatabase().runSync(
      'DELETE FROM monitoring_reading_drafts WHERE session_id = ? AND round_point_id = ?',
      [sessionId, roundPointId]
    );
  } catch {
    // Best effort cleanup; an empty draft is harmless and remains session scoped.
  }
};
