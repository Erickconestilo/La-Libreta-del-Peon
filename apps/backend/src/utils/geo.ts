const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const getDistanceMeters = (
  firstLat: number,
  firstLng: number,
  secondLat: number,
  secondLng: number
) => {
  const deltaLat = toRadians(secondLat - firstLat);
  const deltaLng = toRadians(secondLng - firstLng);
  const firstLatRadians = toRadians(firstLat);
  const secondLatRadians = toRadians(secondLat);

  const haversineValue =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(firstLatRadians) *
      Math.cos(secondLatRadians) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return EARTH_RADIUS_METERS * angularDistance;
};

export const getMaxReadingSpreadMeters = (readings: Array<{ lat: number; lng: number }>) => {
  let maxDistance = 0;

  for (let outerIndex = 0; outerIndex < readings.length; outerIndex += 1) {
    for (let innerIndex = outerIndex + 1; innerIndex < readings.length; innerIndex += 1) {
      const distance = getDistanceMeters(
        readings[outerIndex].lat,
        readings[outerIndex].lng,
        readings[innerIndex].lat,
        readings[innerIndex].lng
      );

      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }
  }

  return maxDistance;
};
