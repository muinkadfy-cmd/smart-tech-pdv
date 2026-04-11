import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const root = process.cwd();
const configPath = path.join(root, "src-tauri", "tauri.conf.json");
const tauriConfig = JSON.parse(await readFile(configPath, "utf8"));
const updater = tauriConfig.plugins?.updater;
const privateKeyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH?.trim();
const privateKeyInline = process.env.TAURI_SIGNING_PRIVATE_KEY?.trim();

if (process.env.SKIP_UPDATER_CHECK === "1") {
  console.log("Skipping updater validation for local development build.");
  process.exit(0);
}

if (!updater) {
  throw new Error("Tauri updater plugin configuration is missing.");
}
if (!Array.isArray(updater.endpoints) || updater.endpoints.length === 0) {
  throw new Error("Updater endpoints are missing in src-tauri/tauri.conf.json.");
}
if (!process.env.TAURI_UPDATER_PUBKEY) {
  throw new Error("TAURI_UPDATER_PUBKEY must be defined before running tauri:build.");
}
if (!privateKeyInline && !privateKeyPath) {
  throw new Error("TAURI_SIGNING_PRIVATE_KEY or TAURI_SIGNING_PRIVATE_KEY_PATH must be defined before running tauri:build.");
}
if (privateKeyPath && !existsSync(privateKeyPath)) {
  throw new Error(`TAURI_SIGNING_PRIVATE_KEY_PATH does not exist: ${privateKeyPath}`);
}

updater.pubkey = process.env.TAURI_UPDATER_PUBKEY;
if (process.env.TAURI_UPDATER_ENDPOINT) {
  updater.endpoints = [process.env.TAURI_UPDATER_ENDPOINT];
}

await writeFile(configPath, `${JSON.stringify(tauriConfig, null, 2)}\n`, "utf8");
console.log("Updater configuration looks ready for a signed desktop build.");
