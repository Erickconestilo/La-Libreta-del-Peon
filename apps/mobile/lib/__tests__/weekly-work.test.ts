import { describe, expect, it } from '@jest/globals';

import {
  getWeeklyWorkWeek,
  getWeeklyWorkWeekStart,
  isWeeklyWorkItemDeletable,
  moveWeeklyWorkWeek,
  type WeeklyWorkItem
} from '../weekly-work';

const item = (overrides: Partial<WeeklyWorkItem>): WeeklyWorkItem => ({
  category: 'manual',
  completedAt: null,
  createdAt: '2026-09-14T08:00:00.000Z',
  createdBy: 'user-1',
  id: 'item-1',
  notes: null,
  projectId: 'project-1',
  status: 'planned',
  title: 'Trabajo',
  updatedAt: '2026-09-14T08:00:00.000Z',
  version: 1,
  workDate: '2026-09-14',
  ...overrides
});

describe('weekly work planning', () => {
  it('always builds Monday through Sunday in local calendar time', () => {
    const start = getWeeklyWorkWeekStart(new Date(2026, 8, 16, 23, 45));
    const week = getWeeklyWorkWeek([], start);
    expect(start).toBe('2026-09-14');
    expect(week.days.map((day) => day.label)).toEqual([
      'LUNES',
      'MARTES',
      'MIÉRCOLES',
      'JUEVES',
      'VIERNES',
      'SÁBADO',
      'DOMINGO'
    ]);
    expect(week.endDate).toBe('2026-09-20');
  });

  it('keeps Saturday and Sunday inside the same editable week', () => {
    const week = getWeeklyWorkWeek([
      item({ id: 'monday', workDate: '2026-09-14' }),
      item({ id: 'saturday', workDate: '2026-09-19' }),
      item({ id: 'sunday', workDate: '2026-09-20', status: 'done' })
    ], '2026-09-14');
    expect(week.days[5].items.map((value) => value.id)).toEqual(['saturday']);
    expect(week.days[6].items.map((value) => value.id)).toEqual(['sunday']);
    expect(week.total).toBe(3);
    expect(week.done).toBe(1);
  });

  it('represents a full Monday-to-Sunday plan without collapsing empty-state logic', () => {
    const dates = ['14', '15', '16', '17', '18', '19', '20'];
    const week = getWeeklyWorkWeek(
      dates.map((day, index) => item({
        id: `item-${day}`,
        status: index % 2 === 0 ? 'done' : 'planned',
        workDate: `2026-09-${day}`
      })),
      '2026-09-14'
    );
    expect(week.days.every((day) => day.total === 1)).toBe(true);
    expect(week.total).toBe(7);
    expect(week.done).toBe(4);
  });

  it('moves weeks without mixing dates at month boundaries', () => {
    expect(moveWeeklyWorkWeek('2026-08-31', 1)).toBe('2026-09-07');
    expect(moveWeeklyWorkWeek('2026-09-07', -1)).toBe('2026-08-31');
    expect(moveWeeklyWorkWeek('2026-12-28', 1)).toBe('2027-01-04');
  });

  it('only treats untouched planned work as directly deletable', () => {
    expect(isWeeklyWorkItemDeletable(item({ status: 'planned' }))).toBe(true);
    expect(isWeeklyWorkItemDeletable(item({ status: 'done' }))).toBe(false);
    expect(isWeeklyWorkItemDeletable(item({ status: 'in_progress' }))).toBe(false);
  });
});
