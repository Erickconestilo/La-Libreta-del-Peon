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
  cache_key: string;
  cached_at: string;
  round_id: string;
  snapshot_json: string;
};

type ListCacheRow = {
  cache_key: string;
  cached_at: string;
  project_id: string;
  rounds_json: string;
};

export const saveMonitoringRoundList = (
  cacheKey: string,
  projectId: string,
  rounds: MonitoringRound[],
  cachedAt = new Date().toISOString()
) => {
  getDatabase().runSync(
    `
      INSERT INTO monitoring_round_list_cache (cache_key, project_id, rounds_json, cached_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key, project_id) DO UPDATE SET rounds_json = excluded.rounds_json, cached_at = excluded.cached_at
    `,
    [cacheKey, projectId, JSON.stringify(rounds), cachedAt]
  );
};

/** Seed each project's list from a journey response so cold-start offline navigation has context. */
export const saveMonitoringRoundsByProject = (
  cacheKey: string,
  rounds: MonitoringRound[],
  cachedAt = new Date().toISOString()
) => {
  const roundsByProject = new Map<string, MonitoringRound[]>();

  for (const round of rounds) {
    const projectRounds = roundsByProject.get(round.projectId) ?? [];
    projectRounds.push(round);
    roundsByProject.set(round.projectId, projectRounds);
  }

  for (const [projectId, projectRounds] of roundsByProject) {
    saveMonitoringRoundList(cacheKey, projectId, projectRounds, cachedAt);
  }
};

export const getCachedMonitoringRoundList = (cacheKey: string, projectId: string) => {
  const row = getDatabase().getFirstSync<ListCacheRow>(
    'SELECT cache_key, project_id, rounds_json, cached_at FROM monitoring_round_list_cache WHERE cache_key = ? AND project_id = ?',
    [cacheKey, projectId]
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

export const saveMonitoringRoundSnapshot = (cacheKey: string, roundId: string, snapshot: MonitoringRoundSnapshot) => {
  getDatabase().runSync(
    `
      INSERT INTO monitoring_round_cache (cache_key, round_id, snapshot_json, cached_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(cache_key, round_id) DO UPDATE SET snapshot_json = excluded.snapshot_json, cached_at = excluded.cached_at
    `,
    [cacheKey, roundId, JSON.stringify(snapshot), snapshot.cachedAt]
  );
};

export const getMonitoringRoundSnapshot = (cacheKey: string, roundId: string) => {
  const row = getDatabase().getFirstSync<CacheRow>(
    'SELECT cache_key, round_id, snapshot_json, cached_at FROM monitoring_round_cache WHERE cache_key = ? AND round_id = ?',
    [cacheKey, roundId]
  );

  if (!row) {
    return null;
  }

  return JSON.parse(row.snapshot_json) as MonitoringRoundSnapshot;
};
