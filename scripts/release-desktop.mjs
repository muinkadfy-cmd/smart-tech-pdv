import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const skipBuild = process.argv.includes("--skip-build");
const allowExistingVersion = process.argv.includes("--allow-existing-version");
const repo = process.env.GITHUB_RELEASES_REPO || "muinkadfy-cmd/smart-tech-pdv";

function getGitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    shell: false,
    env: process.env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout ?? "").trim();
}

function getGitTagCommit(tagName) {
  return getGitOutput(["show-ref", "--verify", "--hash", `refs/tags/${tagName}`]);
}

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
const tagName = `v${version}`;
const headCommit = getGitOutput(["rev-parse", "HEAD"]);
const tagCommit = getGitTagCommit(tagName);

if (!allowExistingVersion && headCommit && tagCommit && headCommit !== tagCommit) {
  throw new Error(
    `A versao ${version} ja foi marcada em ${tagName}, mas o codigo atual mudou depois disso. Faca bump de versao antes de gerar outro pacote para o updater.`
  );
}

const bundleDir = path.join(root, "src-tauri", "target", "release", "bundle", "msi");
const msiPath = await findFile(bundleDir, (name) => name.endsWith(".msi"));
if (!msiPath) {
  throw new Error(`No MSI artifact found in ${bundleDir}`);
}

const sigPath = existsSync(`${msiPath}.sig`)
  ? `${msiPath}.sig`
  : await findFile(bundleDir, (name, fullPath) => name.endsWith(".sig") && (fullPath.includes(version) || fullPath.includes(path.basename(msiPath, ".msi"))));

if (!sigPath) {
  throw new Error(
    "No updater signature artifact was found for the built MSI. Enable bundle.createUpdaterArtifacts in src-tauri/tauri.conf.json and confirm the signing secrets are present in the environment."
  );
}

const releaseDir = path.join(root, "release", version);
await mkdir(releaseDir, { recursive: true });

const msiName = path.basename(msiPath);
const sigName = path.basename(sigPath);
const releaseMsi = path.join(releaseDir, msiName);
const releaseSig = path.join(releaseDir, sigName);

await cp(msiPath, releaseMsi, { force: true });
await cp(sigPath, releaseSig, { force: true });

const notesPath = path.join(root, "release-notes", `v${version}.md`);
if (!existsSync(notesPath)) {
  const notesBuild = spawnSync(process.execPath, ["./scripts/generate-release-notes.mjs", `--version=${version}`, `--output=${notesPath}`], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });

  if (notesBuild.status !== 0) {
    process.exit(notesBuild.status ?? 1);
  }
}

const releaseNotes = (await readFile(notesPath, "utf8")).trim();
await cp(notesPath, path.join(releaseDir, "release-notes.md"), { force: true });
await cp(notesPath, path.join(root, "release", "latest-release-notes.md"), { force: true });

const signature = (await readFile(sigPath, "utf8")).trim();
const latest = {
  version,
  notes: releaseNotes.split(/\r?\n/).slice(0, 4).join(" ").trim(),
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
