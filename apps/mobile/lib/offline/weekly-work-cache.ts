import type { WeeklyWorkItem } from '../weekly-work';
import { getDatabase } from './database';

type WeeklyWorkCacheRow = {
  cached_at: string;
  items_json: string;
};

export type CachedWeeklyWork = {
  cachedAt: string;
  items: WeeklyWorkItem[];
};

const isWeeklyWorkItem = (value: unknown): value is WeeklyWorkItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<WeeklyWorkItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.projectId === 'string' &&
    typeof item.workDate === 'string' &&
    typeof item.title === 'string' &&
    typeof item.category === 'string' &&
    typeof item.status === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    typeof item.version === 'number'
  );
};

export const saveWeeklyWorkCache = (
  cacheKey: string,
  projectId: string,
  weekStart: string,
  items: WeeklyWorkItem[],
  cachedAt = new Date().toISOString()
) => {
  try {
    getDatabase().runSync(
      `
        INSERT INTO weekly_work_cache (cache_key, project_id, week_start, items_json, cached_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cache_key, project_id, week_start) DO UPDATE SET
          items_json = excluded.items_json,
          cached_at = excluded.cached_at
      `,
      [cacheKey, projectId, weekStart, JSON.stringify(items), cachedAt]
    );
  } catch {
    // La caché nunca debe ocultar el resultado de una operación de servidor.
  }
};

export const getWeeklyWorkCache = (
  cacheKey: string,
  projectId: string,
  weekStart: string
): CachedWeeklyWork | null => {
  try {
    const row = getDatabase().getFirstSync<WeeklyWorkCacheRow>(
      `SELECT items_json, cached_at
       FROM weekly_work_cache
       WHERE cache_key = ? AND project_id = ? AND week_start = ?`,
      [cacheKey, projectId, weekStart]
    );
    if (!row) return null;
    const items = JSON.parse(row.items_json) as unknown;
    if (!Array.isArray(items) || !items.every(isWeeklyWorkItem)) return null;
    return { cachedAt: row.cached_at, items };
  } catch {
    return null;
  }
};
