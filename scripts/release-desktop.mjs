import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const skipBuild = process.argv.includes("--skip-build");
const repo = process.env.GITHUB_RELEASES_REPO || "muinkadfy-cmd/smart-tech-pdv-3";

async function findFile(dir, matcher) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, matcher);
      if (nested) {
        return nested;
      }
    }
    if (entry.isFile() && matcher(entry.name, fullPath)) {
      return fullPath;
    }
  }
  return null;
}

if (!skipBuild) {
  const build = spawnSync(process.execPath, [npmCli, "run", "tauri:build"], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const appConfig = await readFile(path.join(root, "src", "config", "app.ts"), "utf8");
const versionMatch = appConfig.match(/APP_VERSION\s*=\s*"([^"]+)"/);
if (!versionMatch) {
  throw new Error("Unable to resolve APP_VERSION from src/config/app.ts");
}
const version = versionMatch[1];

const bundleDir = path.join(root, "src-tauri", "target", "release", "bundle", "msi");
const msiPath = await findFile(bundleDir, (name) => name.endsWith(".msi"));
if (!msiPath) {
  throw new Error(`No MSI artifact found in ${bundleDir}`);
}

const sigPath = existsSync(`${msiPath}.sig`)
  ? `${msiPath}.sig`
  : await findFile(bundleDir, (name, fullPath) => name.endsWith(".sig") && fullPath.includes(version));

if (!sigPath) {
  throw new Error("No updater signature artifact was found for the built MSI.");
}

const releaseDir = path.join(root, "release", version);
await mkdir(releaseDir, { recursive: true });

const msiName = path.basename(msiPath);
const sigName = path.basename(sigPath);
const releaseMsi = path.join(releaseDir, msiName);
const releaseSig = path.join(releaseDir, sigName);

await cp(msiPath, releaseMsi, { force: true });
await cp(sigPath, releaseSig, { force: true });

const signature = (await readFile(sigPath, "utf8")).trim();
const latest = {
  version,
  notes: `Release ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/${repo}/releases/download/v${version}/${msiName}`
    }
  }
};

await writeFile(path.join(releaseDir, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`, "utf8");
console.log(`Release assets prepared in ${releaseDir}`);
