import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { validateExpoExportOutput } from "./export-output.mjs";

const withTempExport = (callback) => {
  const directory = mkdtempSync(path.join(tmpdir(), "topofield-export-output-"));
  try {
    return callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

test("rejects an export without metadata.json", () => {
  withTempExport((directory) => {
    assert.throws(
      () => validateExpoExportOutput(directory),
      /missing .*metadata\.json/,
    );
  });
});

test("rejects an export with empty metadata.json", () => {
  withTempExport((directory) => {
    writeFileSync(path.join(directory, "metadata.json"), "", "utf8");
    assert.throws(
      () => validateExpoExportOutput(directory),
      /empty or invalid .*metadata\.json/,
    );
  });
});

test("accepts a non-empty export with metadata and assets", () => {
  withTempExport((directory) => {
    writeFileSync(path.join(directory, "metadata.json"), "{}", "utf8");
    mkdirSync(path.join(directory, "assets"));
    writeFileSync(path.join(directory, "assets", "bundle.js"), "export {};", "utf8");

    assert.deepEqual(validateExpoExportOutput(directory), {
      metadataBytes: 2,
      fileCount: 2,
    });
  });
});
