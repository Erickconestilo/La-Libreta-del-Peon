import { describe, expect, it } from '@jest/globals';

import { canCreateStationWithoutProject, canWriteProject, resolveStationProjectId } from '../field-access';

describe('field access', () => {
  it('solo permite estaciones sin obra a admin', () => {
    expect(canCreateStationWithoutProject('admin')).toBe(true);
    expect(canCreateStationWithoutProject('topografo')).toBe(false);
    expect(canCreateStationWithoutProject('visitante')).toBe(false);
  });

  it('mantiene la obra solicitada cuando pertenece a las obras disponibles', () => {
    expect(
      resolveStationProjectId({
        availableProjectIds: ['obra-a', 'obra-b'],
        requestedProjectId: 'obra-b',
        role: 'topografo'
      })
    ).toBe('obra-b');
  });

  it('autoselecciona la única obra del topógrafo y rechaza una obra ajena', () => {
    expect(
      resolveStationProjectId({
        availableProjectIds: ['obra-a'],
        requestedProjectId: null,
        role: 'topografo'
      })
    ).toBe('obra-a');

    expect(
      resolveStationProjectId({
        availableProjectIds: ['obra-a'],
        requestedProjectId: 'obra-ajena',
        role: 'topografo'
      })
    ).toBe('obra-a');
  });

  it('deja sin selección a topógrafos con varias obras si no hay contexto explícito', () => {
    expect(
      resolveStationProjectId({
        availableProjectIds: ['obra-a', 'obra-b'],
        role: 'topografo'
      })
    ).toBeNull();
  });

  it('conserva el comportamiento administrativo de crear sin obra', () => {
    expect(
      resolveStationProjectId({
        availableProjectIds: [],
        role: 'admin'
      })
    ).toBeNull();
  });

  it('aplica el permiso efectivo de la membresía por obra', () => {
    const user = {
      authProvider: 'supabase' as const,
      email: 'supervisor@example.test',
      fullName: 'Supervisor',
      id: 'user-1',
      isActive: true,
      projectAccess: { 'obra-a': 'read' as const, 'obra-b': 'write' as const },
      role: 'topografo' as const
    };

    expect(canWriteProject(user, 'obra-a')).toBe(false);
    expect(canWriteProject(user, 'obra-b')).toBe(true);
    expect(canWriteProject({ ...user, role: 'admin', projectAccess: null }, 'obra-a')).toBe(true);
  });
});
