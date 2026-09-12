import * as FileSystem from 'expo-file-system/legacy';

import { apiDownload } from './api';
import { isNativeSharingAvailable, shareLocalFile } from './native-sharing';

export type RoundExportFormat = 'csv' | 'xlsx';

export type RoundExportDependencies = {
  directory: string | null;
  download: typeof apiDownload;
  isAvailable: () => Promise<boolean>;
  share: (uri: string, options: { dialogTitle: string; mimeType: string }) => Promise<unknown>;
  writeBase64: (uri: string, contents: string) => Promise<void>;
};

const exportMetadata: Record<RoundExportFormat, { extension: string; mimeType: string }> = {
  csv: { extension: 'csv', mimeType: 'text/csv' },
  xlsx: { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
};

const arrayBufferToBase64 = (body: ArrayBuffer) => {
  const bytes = new Uint8Array(body);
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }

  return btoa(binary);
};

export const getRoundExportFileName = (roundId: string, format: RoundExportFormat) => {
  const { extension } = exportMetadata[format];
  const safeRoundId = roundId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36) || 'ronda';
  return `topofield-ronda-${safeRoundId}-${Date.now()}.${extension}`;
};

const getDefaultDependencies = (): RoundExportDependencies => ({
  directory: FileSystem.cacheDirectory ?? FileSystem.documentDirectory,
  download: apiDownload,
  isAvailable: isNativeSharingAvailable,
  share: shareLocalFile,
  writeBase64: async (uri, contents) => {
    await FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.Base64 });
  }
});

export const shareRoundExport = async (
  roundId: string,
  format: RoundExportFormat,
  dependencies: RoundExportDependencies = getDefaultDependencies()
) => {
  const { mimeType } = exportMetadata[format];
  const response = await dependencies.download(`/rounds/${encodeURIComponent(roundId)}/export?format=${format}`);
  const directory = dependencies.directory;

  if (!directory) {
    throw new Error('No se pudo preparar el archivo para compartir.');
  }

  if (!(await dependencies.isAvailable())) {
    throw new Error('Este dispositivo no permite compartir archivos.');
  }

  const uri = `${directory}${getRoundExportFileName(roundId, format)}`;
  await dependencies.writeBase64(uri, arrayBufferToBase64(response.body));
  await dependencies.share(uri, { dialogTitle: 'Compartir entrega de TopoField', mimeType });

  return { format, uri };
};
