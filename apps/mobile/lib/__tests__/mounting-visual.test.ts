import { describe, expect, it } from '@jest/globals';
import type { MountingVisit } from '@shared/types';

import {
  filterMountingVisitsForVisual,
  filterMountingVisitsForStatus,
  getMountingVisitStatusPresentation,
  getMountingEvidenceUri,
  MOUNTING_STATUS_FILTERS,
  getMountingPhotoMarkerPosition,
  MOUNTING_PHOTO_ANCHORS,
  MOUNTING_PHOTO_SIZE,
  MOUNTING_VISUAL_FILTERS
} from '@/lib/mounting-visual';

describe('mounting photo visual contract', () => {
  it('exposes a neutral 3x3 relative anchor grid', () => {
    expect(MOUNTING_PHOTO_ANCHORS).toHaveLength(9);
    expect(MOUNTING_PHOTO_ANCHORS[4]).toMatchObject({ label: 'Centro', x: 0.5, y: 0.5 });
  });

  it('clamps marker coordinates to the image bounds', () => {
    expect(getMountingPhotoMarkerPosition(0.5, 0.5)).toEqual({
      left: MOUNTING_PHOTO_SIZE / 2 - 12,
      top: MOUNTING_PHOTO_SIZE / 2 - 12
    });
    expect(getMountingPhotoMarkerPosition(-1, 2)).toEqual({ left: -12, top: MOUNTING_PHOTO_SIZE - 12 });
  });

  it('filters visits and keeps only the selected evidence in the visual view', () => {
    const visits = [
      { id: 'visit-prism', evidence: [{ kind: 'prism' }, { kind: 'general' }] },
      { id: 'visit-access', evidence: [{ kind: 'access' }] },
      { id: 'visit-empty', evidence: [] }
    ] as unknown as MountingVisit[];

    expect(filterMountingVisitsForVisual(visits, 'all').map((visit) => visit.id)).toEqual([
      'visit-prism',
      'visit-access',
      'visit-empty'
    ]);
    expect(filterMountingVisitsForVisual(visits, 'prism')).toMatchObject([
      { id: 'visit-prism', evidence: [{ kind: 'prism' }] }
    ]);
    expect(filterMountingVisitsForVisual(visits, 'access').map((visit) => visit.id)).toEqual(['visit-access']);
    expect(MOUNTING_VISUAL_FILTERS.map((filter) => filter.key)).toEqual(['all', 'prism', 'reference', 'access']);
  });

  it('prefers the local image while an evidence item is pending sync', () => {
    expect(getMountingEvidenceUri({ localUri: 'file:///pending.jpg', publicUrl: 'https://example.invalid/remote.jpg' } as never)).toBe('file:///pending.jpg');
    expect(getMountingEvidenceUri({ publicUrl: 'https://example.invalid/remote.jpg' } as never)).toBe('https://example.invalid/remote.jpg');
  });

  it('filters visits by operational status without changing the input order', () => {
    const visits = [
      { id: 'visit-draft', status: 'draft', evidence: [] },
      { id: 'visit-completed', status: 'completed', evidence: [] },
      { id: 'visit-blocked', status: 'blocked', evidence: [] }
    ] as unknown as MountingVisit[];

    expect(filterMountingVisitsForStatus(visits, 'all').map((visit) => visit.id)).toEqual([
      'visit-draft',
      'visit-completed',
      'visit-blocked'
    ]);
    expect(filterMountingVisitsForStatus(visits, 'blocked').map((visit) => visit.id)).toEqual(['visit-blocked']);
    expect(MOUNTING_STATUS_FILTERS.map((filter) => filter.key)).toEqual(['all', 'draft', 'completed', 'blocked']);
  });

  it('presents blocked visits differently from completed work', () => {
    expect(getMountingVisitStatusPresentation('draft')).toEqual({ label: 'En curso', tone: 'warning' });
    expect(getMountingVisitStatusPresentation('completed')).toEqual({ label: 'Realizada', tone: 'success' });
    expect(getMountingVisitStatusPresentation('blocked')).toEqual({ label: 'No realizable', tone: 'danger' });
  });
});
