import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
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
    args: ["tsc", "-p", "apps/mobile/tsconfig.json"],
    cwd: rootDir,
  },
  {
    name: "backend permissions verification",
    cmd: "npm",
    args: ["run", "verify:project-memberships", "--workspace", "apps/backend"],
    cwd: rootDir,
  },
];

const run = ({ name, cmd, args, cwd }) => {
  console.log(`\n> ${name}`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    encoding: "utf-8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const code = result.status ?? 1;
    throw new Error(`${name} failed with code ${code}`);
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

  console.log(`\nverify pre-apk completed successfully.\nOutput: ${exportDir}`);
} catch (error) {
  console.error("\nverify pre-apk failed:");
  console.error(error?.message ?? error);
  process.exit(1);
}
