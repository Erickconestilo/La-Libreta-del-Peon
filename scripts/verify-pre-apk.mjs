import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const localOnly = process.argv.includes("--local-only");
const exportDir = path.join(
  process.env.TEMP || process.env.TMP || "C:\\Users\\guill\\AppData\\Local\\Temp",
  "topofield-export-android-preapk"
);

const steps = [
  {
    name: "backend build",
    cmd: "npm",
    args: ["run", "build", "--workspace", "apps/backend"],
    cwd: rootDir,
  },
  {
    name: "mobile TypeScript check",
    cmd: "npx",
    args: ["tsc", "--noEmit", "--project", "apps/mobile/tsconfig.json"],
    cwd: rootDir,
  },
];

if (!localOnly) {
  steps.push({
    name: "backend permissions verification",
    cmd: "npm",
    args: ["run", "verify:project-memberships", "--workspace", "apps/backend"],
    cwd: rootDir,
  });
}

const quoteWindowsCommandArg = (value) => {
  if (!/[\s&|<>^()"]/.test(value)) {
    return value;
  }

  return `"${value.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\*)$/g, "$1$1")}"`;
};

const run = ({ name, cmd, args, cwd }) => {
  console.log(`\n> ${name}`);
  const isWindows = process.platform === "win32";
  const command = isWindows ? "cmd.exe" : cmd;
  const commandArgs = isWindows
    ? ["/d", "/s", "/c", [cmd, ...args].map(quoteWindowsCommandArg).join(" ")]
    : args;
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    encoding: "utf-8",
    timeout: 15 * 60 * 1000,
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const code = result.status ?? 1;
    throw new Error(`${name} failed with code ${code}`);
  }

  if (result.signal) {
    throw new Error(`${name} stopped by signal ${result.signal}`);
  }
};

try {
  rmSync(exportDir, { recursive: true, force: true });
  mkdirSync(exportDir, { recursive: true });

  for (const step of steps) {
    run(step);
  }

  run({
    name: `expo export android -> ${exportDir}`,
    cmd: "npx",
    args: ["expo", "export", "--platform", "android", "--output-dir", exportDir],
    cwd: path.join(rootDir, "apps", "mobile"),
  });

  console.log(`\nverify pre-apk ${localOnly ? "local-only " : ""}completed successfully.\nOutput: ${exportDir}`);
} catch (error) {
  console.error("\nverify pre-apk failed:");
  console.error(error?.message ?? error);
  process.exit(1);
}
