import { describe, expect, it } from '@jest/globals';

import {
  getMountingPhotoMarkerPosition,
  MOUNTING_PHOTO_ANCHORS,
  MOUNTING_PHOTO_SIZE
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
});
