import dotenv from 'dotenv';

import { pool } from '../db/pool.js';
import { loadedEnvPath } from '../lib/load-env.js';
import { reconcilePrismObservationsForExistingStations } from '../models/prisms.model.js';
import { assertWriteAllowed } from './safety.js';

dotenv.config({ path: loadedEnvPath });

const main = async () => {
  assertWriteAllowed('reconcile-prism-observations');

  const summary = await reconcilePrismObservationsForExistingStations();

  console.log('Prism observation reconciliation complete');
  console.log(`Matched observations: ${summary.matchedObservationCount}`);
  console.log(`Matched stations: ${summary.matchedStationCount}`);

  if (summary.matchedStationCodes.length > 0) {
    console.log(`Matched station codes: ${summary.matchedStationCodes.join(', ')}`);
  }
};

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Prism observation reconciliation failed');
    console.error(error);
    await pool.end();
    process.exit(1);
  });
