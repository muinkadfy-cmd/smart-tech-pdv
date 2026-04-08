import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);
const setArg = args.find((arg) => arg.startsWith("--set="));
const skipPush = args.includes("--skip-push");
const skipTag = args.includes("--skip-tag");
const dryRun = args.includes("--dry-run");

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readVersion() {
  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return packageJson.version;
}

if (!existsSync(path.join(root, ".git"))) {
  throw new Error("Este script precisa ser executado dentro de um repositorio git real com pasta .git.");
}

run(process.execPath, ["./scripts/bump-app-version.mjs", ...(setArg ? [setArg] : [])]);
run(process.execPath, ["./node_modules/typescript/bin/tsc", "--noEmit"]);

const version = readVersion();
const tagName = `v${version}`;
const filesToStage = ["package.json", "src/config/app.ts", "src-tauri/Cargo.toml", "src-tauri/tauri.conf.json"];

run("git", ["add", ...filesToStage]);

const commitResult = spawnSync("git", ["diff", "--cached", "--quiet"], {
  cwd: root,
  shell: process.platform === "win32",
  env: process.env
});

if (commitResult.status === 0) {
  console.log(`Nenhuma mudanca de versao para commitar. Versao atual: ${version}`);
} else {
  run("git", ["commit", "-m", `chore(release): ${tagName}`]);
}

if (!skipTag) {
  if (!dryRun) {
    run("git", ["tag", tagName]);
  } else {
    console.log(`[dry-run] tag ${tagName}`);
  }
}

if (!skipPush) {
  if (!dryRun) {
    run("git", ["push"]);
    if (!skipTag) {
      run("git", ["push", "origin", tagName]);
    }
  } else {
    console.log("[dry-run] git push");
    if (!skipTag) {
      console.log(`[dry-run] git push origin ${tagName}`);
    }
  }
}

console.log(`Fluxo de release GitHub preparado para ${tagName}. O workflow release-desktop sera disparado ao subir a tag.`);
