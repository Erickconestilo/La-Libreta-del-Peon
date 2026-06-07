import { useCallback, useEffect, useMemo, useState } from 'react';

import { Storage } from 'expo-sqlite/kv-store';

export type DailyChecklistItemKey =
  | 'stationChecked'
  | 'prismsVisible'
  | 'photosTaken'
  | 'incidentLogged'
  | 'pendingReviewed'
  | 'dailyClosed';

export type DailyChecklistState = Record<DailyChecklistItemKey, boolean>;

export const dailyChecklistItems: Array<{
  key: DailyChecklistItemKey;
  label: string;
}> = [
  { key: 'stationChecked', label: 'Estación revisada' },
  { key: 'prismsVisible', label: 'Prismas visibles comprobados' },
  { key: 'photosTaken', label: 'Fotos tomadas o revisadas' },
  { key: 'incidentLogged', label: 'Incidencias registradas' },
  { key: 'pendingReviewed', label: 'Pendientes repasados' },
  { key: 'dailyClosed', label: 'Cierre diario completado' }
];

const emptyChecklist = dailyChecklistItems.reduce((accumulator, item) => {
  accumulator[item.key] = false;
  return accumulator;
}, {} as DailyChecklistState);

const buildStorageKey = (projectId: string | null, dateKey: string) => {
  return `topofield:daily-checklist:${projectId ?? 'all'}:${dateKey}`;
};

const parseChecklistState = (rawValue: string | null): DailyChecklistState => {
  if (!rawValue) {
    return { ...emptyChecklist };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Record<DailyChecklistItemKey, unknown>>;
    return dailyChecklistItems.reduce((accumulator, item) => {
      accumulator[item.key] = parsed[item.key] === true;
      return accumulator;
    }, {} as DailyChecklistState);
  } catch {
    return { ...emptyChecklist };
  }
};

export const useDailyChecklist = (projectId: string | null, dateKey: string) => {
  const storageKey = useMemo(() => buildStorageKey(projectId, dateKey), [dateKey, projectId]);
  const [checklist, setChecklist] = useState<DailyChecklistState>({ ...emptyChecklist });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsHydrated(false);

    void Storage.getItem(storageKey)
      .then((storedValue) => {
        if (!cancelled) {
          setChecklist(parseChecklistState(storedValue));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const setItem = useCallback((key: DailyChecklistItemKey, value: boolean) => {
    setChecklist((current) => {
      const next = { ...current, [key]: value };
      void Storage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const completedCount = dailyChecklistItems.filter((item) => checklist[item.key]).length;

  return {
    checklist,
    completedCount,
    isHydrated,
    setItem,
    totalCount: dailyChecklistItems.length
  };
};
