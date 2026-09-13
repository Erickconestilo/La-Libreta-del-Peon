import { app } from './app.js';
import { refreshWorkExecutionCapability } from './lib/work-execution-capability.js';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`TopoField backend listening on port ${PORT}`);
  void refreshWorkExecutionCapability()
    .then((capability) => {
      if (!capability.available) {
        console.warn(
          `Work execution capability unavailable: ${capability.reason} (${capability.migration})`
        );
      }
    })
    .catch((error: unknown) => {
      console.warn('Work execution capability preflight failed', error);
    });
});
