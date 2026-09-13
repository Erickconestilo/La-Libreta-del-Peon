import { spawnSync } from "node:child_process";

import { buildWindowsCommandLine } from "./windows-command.mjs";

const rootDir = process.cwd();
const includePreApk = process.argv.includes("--with-pre-apk");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const checks = [
  {
    name: "backend build",
    command: npmCommand,
    args: ["run", "build", "--workspace", "apps/backend"],
  },
  {
    name: "backend tests",
    command: npmCommand,
    args: ["test", "--workspace", "apps/backend"],
  },
  {
    name: "mobile TypeScript",
    command: npxCommand,
    args: ["tsc", "--noEmit", "--project", "apps/mobile/tsconfig.json"],
  },
  {
    name: "mobile tests",
    command: npmCommand,
    args: ["test", "--workspace", "apps/mobile", "--", "--runInBand", "--silent"],
  },
  {
    name: "tooling tests",
    command: npmCommand,
    args: ["run", "test:tooling"],
  },
  {
    name: "documentation check",
    command: npmCommand,
    args: ["run", "docs:check"],
  },
  {
    name: "git diff check",
    command: "git",
    args: ["diff", "--check"],
  },
];

if (includePreApk) {
  checks.push({
    name: "Android preflight",
    command: npmCommand,
    args: ["run", "verify:pre-apk:local"],
  });
}

const runCheck = ({ name, command, args }) => {
  console.log(`\n> ${name}`);
  const isWindows = process.platform === "win32";
  const spawnCommand = isWindows ? process.env.ComSpec || "cmd.exe" : command;
  const spawnArgs = isWindows
    ? ["/d", "/s", "/c", buildWindowsCommandLine(command, args)]
    : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: rootDir,
    stdio: "inherit",
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`${name} failed to start: ${result.error.message}`);
  }

  if (result.signal) {
    throw new Error(`${name} stopped by signal ${result.signal}`);
  }

  if (result.status !== 0) {
    throw new Error(`${name} failed with code ${result.status ?? 1}`);
  }
};

try {
  for (const check of checks) {
    runCheck(check);
  }

  console.log(`\nverify local ${includePreApk ? "with Android preflight " : ""}completed successfully.`);
} catch (error) {
  console.error("\nverify local failed:");
  console.error(error?.message ?? error);
  process.exit(1);
}
