export const MOUNTING_PHOTO_SIZE = 104;

export const MOUNTING_PHOTO_ANCHORS = [
  { key: 'top-left', label: 'Arriba izquierda', x: 0.2, y: 0.2 },
  { key: 'top-center', label: 'Arriba centro', x: 0.5, y: 0.2 },
  { key: 'top-right', label: 'Arriba derecha', x: 0.8, y: 0.2 },
  { key: 'middle-left', label: 'Centro izquierda', x: 0.2, y: 0.5 },
  { key: 'middle-center', label: 'Centro', x: 0.5, y: 0.5 },
  { key: 'middle-right', label: 'Centro derecha', x: 0.8, y: 0.5 },
  { key: 'bottom-left', label: 'Abajo izquierda', x: 0.2, y: 0.8 },
  { key: 'bottom-center', label: 'Abajo centro', x: 0.5, y: 0.8 },
  { key: 'bottom-right', label: 'Abajo derecha', x: 0.8, y: 0.8 }
] as const;

export type MountingPhotoAnchorKey = (typeof MOUNTING_PHOTO_ANCHORS)[number]['key'];

export const getMountingPhotoMarkerPosition = (
  positionX: number,
  positionY: number,
  size = MOUNTING_PHOTO_SIZE
) => {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  return {
    left: Math.round(clamp(positionX) * size) - 12,
    top: Math.round(clamp(positionY) * size) - 12
  };
};
