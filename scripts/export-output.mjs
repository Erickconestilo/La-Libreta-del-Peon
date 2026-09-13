import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const countFiles = (directory) => {
  return readdirSync(directory, { withFileTypes: true }).reduce((count, entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return count + countFiles(entryPath);
    }
    return count + 1;
  }, 0);
};

export const validateExpoExportOutput = (exportDir) => {
  const metadataPath = path.join(exportDir, "metadata.json");
  let metadataStats;

  try {
    metadataStats = statSync(metadataPath);
  } catch {
    throw new Error(`Expo export is missing ${metadataPath}`);
  }

  if (!metadataStats.isFile() || metadataStats.size === 0) {
    throw new Error(`Expo export has an empty or invalid ${metadataPath}`);
  }

  const fileCount = countFiles(exportDir);
  if (fileCount < 2) {
    throw new Error(`Expo export is incomplete: expected metadata.json and assets in ${exportDir}`);
  }

  return {
    metadataBytes: metadataStats.size,
    fileCount,
  };
};
