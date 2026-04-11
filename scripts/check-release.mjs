import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
const appConfig = await readFile(path.join(root, "src", "config", "app.ts"), "utf8");
const versionMatch = appConfig.match(/APP_VERSION\s*=\s*"([^"]+)"/);
if (!versionMatch) {
  throw new Error("APP_VERSION not found in src/config/app.ts");
}

const version = versionMatch[1];
const releaseDir = path.join(root, "release", version);
const latestJsonPath = path.join(releaseDir, "latest.json");
const releaseNotesPath = path.join(releaseDir, "release-notes.md");

if (!existsSync(releaseDir)) {
  throw new Error(`Release directory missing: ${releaseDir}`);
}
if (!existsSync(latestJsonPath)) {
  throw new Error("latest.json not found in release directory");
}
if (!existsSync(releaseNotesPath)) {
  throw new Error("release-notes.md not found in release directory");
}

const directoryEntries = await readdir(releaseDir);
if (!directoryEntries.some((name) => name.endsWith(".msi"))) {
  throw new Error("No MSI file found in release directory");
}
if (!directoryEntries.some((name) => name.endsWith(".sig"))) {
  throw new Error("No .sig file found in release directory");
}

const latest = JSON.parse(await readFile(latestJsonPath, "utf8"));
if (latest.version !== version) {
  throw new Error(`latest.json version mismatch. Expected ${version}, received ${latest.version}`);
}
if (!latest.platforms?.["windows-x86_64"]?.url) {
  throw new Error("latest.json is missing the windows-x86_64 updater URL");
}
if (typeof latest.notes !== "string" || latest.notes.trim().length === 0) {
  throw new Error("latest.json is missing summary notes for the updater");
}

console.log(`Release ${version} looks valid.`);
