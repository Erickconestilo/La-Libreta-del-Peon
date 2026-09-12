import { describe, expect, it } from '@jest/globals';

import { getStationDisplayName } from '../station-display';

describe('station display names', () => {
  it('preserves the server-provided station name without client-specific overrides', () => {
    expect(
      getStationDisplayName({
        externalId: 'station-example-01',
        name: 'Nombre aportado por servidor'
      })
    ).toBe('Nombre aportado por servidor');
  });

  it('uses the external identifier only when the station has no name', () => {
    expect(getStationDisplayName({ externalId: 'station-example-01', name: '  ' })).toBe(
      'station-example-01'
    );
    expect(getStationDisplayName({ externalId: null, name: '' })).toBe('Estación sin nombre');
  });
});
