import assert from "node:assert/strict";
import test from "node:test";

import { buildWindowsCommandLine, quoteWindowsCommandArg } from "./windows-command.mjs";

test("leaves simple Windows command arguments unchanged", () => {
  assert.equal(quoteWindowsCommandArg("npx"), "npx");
  assert.equal(buildWindowsCommandLine("npx", ["expo", "export"]), "npx expo export");
});

test("quotes output paths containing spaces", () => {
  assert.equal(
    buildWindowsCommandLine("npx", ["expo", "export", "--output-dir", "C:\\Temp\\Topo Field\\export"]),
    'npx expo export --output-dir "C:\\Temp\\Topo Field\\export"'
  );
});

test("quotes shell metacharacters instead of exposing them to cmd", () => {
  assert.equal(quoteWindowsCommandArg("value&other"), '"value&other"');
  assert.equal(quoteWindowsCommandArg("filter|more"), '"filter|more"');
});
