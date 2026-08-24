import type { JourneyRound } from '@shared/types';

import { getDatabase } from './database';

type JourneyCacheRow = {
  cache_key: string;
  cached_at: string;
  rounds_json: string;
};

export const saveJourney = (cacheKey: string, rounds: JourneyRound[], cachedAt = new Date().toISOString()) => {
  try {
    getDatabase().runSync(
      `
        INSERT INTO journey_cache (cache_key, rounds_json, cached_at)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET rounds_json = excluded.rounds_json, cached_at = excluded.cached_at
      `,
      [cacheKey, JSON.stringify(rounds), cachedAt]
    );
  } catch {
    // The root layout may still be applying SQLite migrations on first launch.
  }
};

export const getCachedJourney = (cacheKey: string) => {
  try {
    const row = getDatabase().getFirstSync<JourneyCacheRow>(
      'SELECT cache_key, rounds_json, cached_at FROM journey_cache WHERE cache_key = ?',
      [cacheKey]
    );

    if (!row) return null;

    return {
      cachedAt: row.cached_at,
      rounds: JSON.parse(row.rounds_json) as JourneyRound[]
    };
  } catch {
    return null;
  }
};

export const deferJourneyRound = (cacheKey: string, roundId: string, deferredUntil: string) => {
  try {
    getDatabase().runSync(
      `
        INSERT INTO journey_deferred (cache_key, round_id, deferred_until)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key, round_id) DO UPDATE SET deferred_until = excluded.deferred_until
      `,
      [cacheKey, roundId, deferredUntil]
    );
  } catch {
    // A deferred action is best effort until the local schema is ready.
  }
};

export const getDeferredJourneyRoundIds = (cacheKey: string, now = new Date().toISOString()) => {
  try {
    const rows = getDatabase().getAllSync<{ round_id: string }>(
      'SELECT round_id FROM journey_deferred WHERE cache_key = ? AND deferred_until > ?',
      [cacheKey, now]
    );

    return new Set(rows.map((row) => row.round_id));
  } catch {
    return new Set<string>();
  }
};
