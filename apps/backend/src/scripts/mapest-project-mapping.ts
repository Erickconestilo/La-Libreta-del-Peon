const normalizeStationName = (stationName: string) => stationName
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

export const getMapEstProjectCode = (stationName: string): string | null => {
  const normalizedName = normalizeStationName(stationName);

  if (normalizedName.includes('campus nord')) {
    return 'campus-nord';
  }

  if (normalizedName.includes('sarria')) {
    return 'sarria';
  }

  if (normalizedName.includes('sant gervasi de casoles')) {
    return 'sant-gervasi-de-casoles';
  }

  if (normalizedName.includes('putxe')) {
    return 'putxe';
  }

  if (normalizedName.includes('sanllehy')) {
    return 'sanllehy';
  }

  if (normalizedName.includes('maragall')) {
    return 'maragall';
  }

  return null;
};

export const requireMapEstProjectCode = (stationName: string) => {
  const projectCode = getMapEstProjectCode(stationName);

  if (!projectCode) {
    throw new Error('MapEst station is not mapped to a TopoField project; import aborted');
  }

  return projectCode;
};

export const requireUniqueProjectId = (
  projectCode: string,
  rows: readonly { id: string }[]
) => {
  if (rows.length !== 1) {
    throw new Error(`MapEst project code ${projectCode} did not resolve to exactly one project; import aborted`);
  }

  return rows[0].id;
};
