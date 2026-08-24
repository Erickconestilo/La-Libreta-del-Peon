import type {
  ControlPointThreshold,
  InstrumentReading,
  MonitoringRound,
  MonitoringRoundPoint
} from '@shared/types';

import { getDatabase } from './database';

export type CachedMonitoringRoundPoint = MonitoringRoundPoint & {
  controlPointCode: string;
  controlPointName: string | null;
};

export type CachedMonitoringRoundDetail = MonitoringRound & {
  points: CachedMonitoringRoundPoint[];
};

export type MonitoringRoundSnapshot = {
  round: CachedMonitoringRoundDetail;
  readingsByControlPointId: Record<string, InstrumentReading[]>;
  thresholdsByControlPointId: Record<string, ControlPointThreshold[]>;
  cachedAt: string;
};

type CacheRow = {
  cached_at: string;
  round_id: string;
  snapshot_json: string;
};

type ListCacheRow = {
  cached_at: string;
  project_id: string;
  rounds_json: string;
};

export const saveMonitoringRoundList = (projectId: string, rounds: MonitoringRound[], cachedAt = new Date().toISOString()) => {
  getDatabase().runSync(
    `
      INSERT INTO monitoring_round_list_cache (project_id, rounds_json, cached_at)
      VALUES (?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET rounds_json = excluded.rounds_json, cached_at = excluded.cached_at
    `,
    [projectId, JSON.stringify(rounds), cachedAt]
  );
};

export const getCachedMonitoringRoundList = (projectId: string) => {
  const row = getDatabase().getFirstSync<ListCacheRow>(
    'SELECT project_id, rounds_json, cached_at FROM monitoring_round_list_cache WHERE project_id = ?',
    [projectId]
  );

  if (!row) {
    return null;
  }

  return {
    cachedAt: row.cached_at,
    projectId: row.project_id,
    rounds: JSON.parse(row.rounds_json) as MonitoringRound[]
  };
};

export const saveMonitoringRoundSnapshot = (roundId: string, snapshot: MonitoringRoundSnapshot) => {
  getDatabase().runSync(
    `
      INSERT INTO monitoring_round_cache (round_id, snapshot_json, cached_at)
      VALUES (?, ?, ?)
      ON CONFLICT(round_id) DO UPDATE SET snapshot_json = excluded.snapshot_json, cached_at = excluded.cached_at
    `,
    [roundId, JSON.stringify(snapshot), snapshot.cachedAt]
  );
};

export const getMonitoringRoundSnapshot = (roundId: string) => {
  const row = getDatabase().getFirstSync<CacheRow>(
    'SELECT round_id, snapshot_json, cached_at FROM monitoring_round_cache WHERE round_id = ?',
    [roundId]
  );

  if (!row) {
    return null;
  }

  return JSON.parse(row.snapshot_json) as MonitoringRoundSnapshot;
};
