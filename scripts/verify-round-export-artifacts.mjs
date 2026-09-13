import { readFile } from 'node:fs/promises';

const [csvPath, xlsxPath] = process.argv.slice(2);

if (!csvPath || !xlsxPath) {
  console.error('Uso: npm run verify:export-artifacts -- <ronda.csv> <ronda.xlsx>');
  process.exitCode = 2;
} else {
  try {
    const verifierUrl = new URL('../apps/backend/dist/lib/round-export-artifact-verifier.js', import.meta.url).href;
    const { verifyRoundExportArtifacts } = await import(verifierUrl);
    const result = await verifyRoundExportArtifacts(await readFile(csvPath, 'utf8'), await readFile(xlsxPath));

    console.log(`EXPORT_ARTIFACTS_OK csvRows=${result.csvRowCount} xlsxRows=${result.xlsxRowCount} worksheet=${result.worksheetName} utf8Bom=${result.csvHasUtf8Bom}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'error desconocido';
    console.error(`EXPORT_ARTIFACTS_FAILED ${message}`);
    process.exitCode = 1;
  }
}
