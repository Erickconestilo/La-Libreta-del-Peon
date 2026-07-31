import type { ProjectSummary } from '@shared/types';

import { getDatabase } from './database';

type ProjectCacheRow = {
  cached_at: string;
  projects_json: string;
};

export type CachedProjectList = {
  cachedAt: string;
  projects: ProjectSummary[];
};

const isProjectSummary = (value: unknown): value is ProjectSummary => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const project = value as Partial<ProjectSummary>;
  return (
    typeof project.id === 'string' &&
    typeof project.code === 'string' &&
    typeof project.name === 'string' &&
    typeof project.isActive === 'boolean' &&
    typeof project.stationCount === 'number'
  );
};

export function getCachedProjectList(cacheKey: string): CachedProjectList | null {
  let row: ProjectCacheRow | null;

  try {
    row = getDatabase().getFirstSync<ProjectCacheRow>(
      'SELECT projects_json, cached_at FROM project_list_cache WHERE cache_key = ?',
      [cacheKey]
    );
  } catch {
    // La caché nunca debe sustituir al error real si SQLite aún no terminó de migrar.
    return null;
  }

  if (!row) {
    return null;
  }

  try {
    const projects = JSON.parse(row.projects_json) as unknown;
    if (!Array.isArray(projects) || !projects.every(isProjectSummary)) {
      return null;
    }

    return {
      cachedAt: row.cached_at,
      projects
    };
  } catch {
    return null;
  }
}

export function saveProjectList(cacheKey: string, projects: ProjectSummary[]): void {
  try {
    const db = getDatabase();

    db.runSync(
      `INSERT INTO project_list_cache (cache_key, projects_json, cached_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(cache_key) DO UPDATE SET
         projects_json = excluded.projects_json,
         cached_at = excluded.cached_at`,
      [cacheKey, JSON.stringify(projects)]
    );
  } catch (error) {
    console.warn('[ProjectCache] Unable to persist project list:', error);
  }
}
