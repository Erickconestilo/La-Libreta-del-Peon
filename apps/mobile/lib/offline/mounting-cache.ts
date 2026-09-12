import type { MountingEvidence, MountingVisit } from '@shared/types';

import { getDatabase } from './database';

export type CachedMountingEvidence = MountingEvidence & {
  localUri?: string;
  syncState?: 'pending';
};

export type CachedMountingVisit = Omit<MountingVisit, 'evidence'> & {
  evidence: CachedMountingEvidence[];
  syncState?: 'pending';
};

type MountingCacheRow = {
  cache_key: string;
  station_id: string;
  visits_json: string;
  cached_at: string;
};

const readCachedVisits = (cacheKey: string, stationId: string): CachedMountingVisit[] => {
  try {
    const row = getDatabase().getFirstSync<MountingCacheRow>(
      'SELECT cache_key, station_id, visits_json, cached_at FROM mounting_visit_cache WHERE cache_key = ? AND station_id = ?',
      [cacheKey, stationId]
    );

    return row ? JSON.parse(row.visits_json) as CachedMountingVisit[] : [];
  } catch {
    return [];
  }
};

export const getCachedMountingVisits = (cacheKey: string, stationId: string) => {
  try {
    const row = getDatabase().getFirstSync<MountingCacheRow>(
      'SELECT cache_key, station_id, visits_json, cached_at FROM mounting_visit_cache WHERE cache_key = ? AND station_id = ?',
      [cacheKey, stationId]
    );

    if (!row) return null;

    return {
      cachedAt: row.cached_at,
      stationId: row.station_id,
      visits: JSON.parse(row.visits_json) as CachedMountingVisit[]
    };
  } catch {
    return null;
  }
};

export const saveMountingVisits = (
  cacheKey: string,
  stationId: string,
  visits: CachedMountingVisit[],
  cachedAt = new Date().toISOString()
) => {
  try {
    getDatabase().runSync(
      `
        INSERT INTO mounting_visit_cache (cache_key, station_id, visits_json, cached_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(cache_key, station_id) DO UPDATE SET visits_json = excluded.visits_json, cached_at = excluded.cached_at
      `,
      [cacheKey, stationId, JSON.stringify(visits), cachedAt]
    );
  } catch {
    // The app can still use the network while SQLite finishes its migrations.
  }
};

export const upsertCachedMountingVisit = (
  cacheKey: string,
  stationId: string,
  visit: CachedMountingVisit
) => {
  const current = readCachedVisits(cacheKey, stationId);
  const next = current.filter((item) => item.id !== visit.id && item.clientRequestId !== visit.clientRequestId);
  saveMountingVisits(cacheKey, stationId, [visit, ...next]);
};

export const upsertCachedMountingEvidence = (
  cacheKey: string,
  stationId: string,
  visitId: string,
  visitClientRequestId: string | null,
  evidence: CachedMountingEvidence
) => {
  const current = readCachedVisits(cacheKey, stationId);
  const visit = current.find((item) => item.id === visitId || (visitClientRequestId && item.clientRequestId === visitClientRequestId));

  if (!visit) return;

  const nextEvidence = [
    evidence,
    ...visit.evidence.filter((item) => item.id !== evidence.id && item.clientRequestId !== evidence.clientRequestId)
  ];
  const nextVisit: CachedMountingVisit = {
    ...visit,
    evidence: nextEvidence,
    syncState: 'pending'
  };

  upsertCachedMountingVisit(cacheKey, stationId, nextVisit);
};

export const getCachedMountingVisit = (cacheKey: string, stationId: string, visitId: string) => {
  const cached = getCachedMountingVisits(cacheKey, stationId);
  return cached?.visits.find((visit) => visit.id === visitId) ?? null;
};

const mergeEvidence = (server: MountingEvidence[], cached: CachedMountingEvidence[]): CachedMountingEvidence[] => {
  const serverIds = new Set(server.map((item) => item.clientRequestId));
  const pendingLocal = cached.filter((item) => item.syncState === 'pending' && !serverIds.has(item.clientRequestId));
  return [...pendingLocal, ...server];
};

export const mergeServerMountingVisits = (
  serverVisits: MountingVisit[],
  cachedVisits: CachedMountingVisit[]
): CachedMountingVisit[] => {
  const cachedByClientRequestId = new Map(cachedVisits.map((visit) => [visit.clientRequestId, visit]));
  const serverIds = new Set(serverVisits.map((visit) => visit.clientRequestId));
  const merged = serverVisits.map((visit) => {
    const cached = cachedByClientRequestId.get(visit.clientRequestId);
    const evidence = mergeEvidence(visit.evidence, cached?.evidence ?? []);
    const hasPendingEvidence = evidence.some((item) => item.syncState === 'pending');
    return {
      ...visit,
      evidence,
      ...(hasPendingEvidence ? { syncState: 'pending' as const } : {})
    };
  });
  const pendingLocal = cachedVisits.filter(
    (visit) => visit.syncState === 'pending' && !serverIds.has(visit.clientRequestId)
  );

  return [...pendingLocal, ...merged];
};
