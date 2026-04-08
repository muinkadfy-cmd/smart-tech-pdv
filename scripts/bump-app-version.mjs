import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const setArg = process.argv.find((arg) => arg.startsWith("--set="));

function bumpPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function updateTsVersion(content, nextVersion) {
  return content.replace(/APP_VERSION\s*=\s*"([^"]+)"/, `APP_VERSION = "${nextVersion}"`);
}

function updateCargoVersion(content, nextVersion) {
  return content.replace(/version\s*=\s*"([^"]+)"/, `version = "${nextVersion}"`);
}

const packageJsonPath = path.join(root, "package.json");
const appConfigPath = path.join(root, "src", "config", "app.ts");
const tauriConfigPath = path.join(root, "src-tauri", "tauri.conf.json");
const cargoTomlPath = path.join(root, "src-tauri", "Cargo.toml");

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const nextVersion = setArg ? setArg.split("=")[1] : bumpPatch(packageJson.version);

packageJson.version = nextVersion;
await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

const appConfig = await readFile(appConfigPath, "utf8");
await writeFile(appConfigPath, `${updateTsVersion(appConfig, nextVersion)}\n`, "utf8");

const tauriConfig = JSON.parse(await readFile(tauriConfigPath, "utf8"));
tauriConfig.version = nextVersion;
await writeFile(tauriConfigPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, "utf8");

const cargoToml = await readFile(cargoTomlPath, "utf8");
await writeFile(cargoTomlPath, `${updateCargoVersion(cargoToml, nextVersion)}\n`, "utf8");

console.log(`Smart Tech PDV version updated to ${nextVersion}`);
