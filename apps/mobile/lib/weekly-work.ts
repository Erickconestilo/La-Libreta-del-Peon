export type WeeklyWorkCategory = 'leveling' | 'manual' | 'other';
export type WeeklyWorkStatus = 'planned' | 'in_progress' | 'done' | 'blocked';

export type WeeklyWorkItem = {
  id: string;
  projectId: string;
  workDate: string;
  title: string;
  category: WeeklyWorkCategory;
  status: WeeklyWorkStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  completedAt: string | null;
};

export type WeeklyWorkDay = {
  date: string;
  label: string;
  shortLabel: string;
  items: WeeklyWorkItem[];
  done: number;
  total: number;
};

export type WeeklyWorkWeek = {
  startDate: string;
  endDate: string;
  days: WeeklyWorkDay[];
  done: number;
  total: number;
};

const DAY_LABELS = [
  ['LUNES', 'L'],
  ['MARTES', 'M'],
  ['MIÉRCOLES', 'X'],
  ['JUEVES', 'J'],
  ['VIERNES', 'V'],
  ['SÁBADO', 'S'],
  ['DOMINGO', 'D']
] as const;

export const WEEKLY_WORK_CATEGORY_LABELS: Record<WeeklyWorkCategory, string> = {
  leveling: 'Nivelación',
  manual: 'Manual',
  other: 'Otro'
};

export const WEEKLY_WORK_STATUS_LABELS: Record<WeeklyWorkStatus, string> = {
  planned: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
  blocked: 'Bloqueado'
};

const parseDateKey = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getWeeklyWorkWeekStart = (referenceDate = new Date()) => {
  const localDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12
  );
  const daysSinceMonday = (localDate.getDay() + 6) % 7;
  localDate.setDate(localDate.getDate() - daysSinceMonday);
  return toLocalDateKey(localDate);
};

export const moveWeeklyWorkWeek = (weekStart: string, weeks: number) => {
  const parsed = parseDateKey(weekStart);
  if (!parsed) return weekStart;
  parsed.setDate(parsed.getDate() + weeks * 7);
  return toLocalDateKey(parsed);
};

export const getWeeklyWorkWeek = (
  items: WeeklyWorkItem[],
  weekStart: string
): WeeklyWorkWeek => {
  const monday = parseDateKey(weekStart);
  if (!monday) {
    throw new Error('La semana debe empezar con una fecha AAAA-MM-DD válida.');
  }

  const days: WeeklyWorkDay[] = DAY_LABELS.map(([label, shortLabel], index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = toLocalDateKey(date);
    const dayItems = items
      .filter((item) => item.workDate.slice(0, 10) === dateKey)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const done = dayItems.filter((item) => item.status === 'done').length;
    return {
      date: dateKey,
      done,
      items: dayItems,
      label,
      shortLabel,
      total: dayItems.length
    };
  });

  return {
    days,
    done: days.reduce((total, day) => total + day.done, 0),
    endDate: days[6].date,
    startDate: days[0].date,
    total: days.reduce((total, day) => total + day.total, 0)
  };
};

export const formatWeeklyWorkRange = (week: Pick<WeeklyWorkWeek, 'startDate' | 'endDate'>) => {
  const format = (dateKey: string) => {
    const date = parseDateKey(dateKey);
    if (!date) return dateKey;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };
  return `${format(week.startDate)} - ${format(week.endDate)}`;
};

export const isWeeklyWorkItemDeletable = (item: Pick<WeeklyWorkItem, 'status'>) => item.status === 'planned';
