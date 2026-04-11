import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

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

function extractVersion(regex, content, label) {
  const match = content.match(regex);
  if (!match) {
    throw new Error(`Nao foi possivel localizar ${label}.`);
  }

  return match[1];
}

const packageJson = readJson("package.json");
const tauriConfig = readJson("src-tauri/tauri.conf.json");
const cargoToml = readText("src-tauri/Cargo.toml");
const appConfig = readText("src/config/app.ts");
const workflowPath = ".github/workflows/release-desktop.yml";

const appVersion = extractVersion(/APP_VERSION\s*=\s*"([^"]+)"/, appConfig, "APP_VERSION");
const cargoVersion = extractVersion(/version\s*=\s*"([^"]+)"/, cargoToml, "version do Cargo.toml");
const updaterEndpoint = extractVersion(/APP_UPDATER_ENDPOINT[\s\S]*?"(https:\/\/[^"]+)"/, appConfig, "APP_UPDATER_ENDPOINT");
const currentTagName = `v${packageJson.version}`;
const headCommit = getGitOutput(["rev-parse", "HEAD"]);
const currentTagCommit = getGitTagCommit(currentTagName);
const gitStatus = getGitOutput(["status", "--porcelain", "--untracked-files=normal"]);

const checks = [];

function pushCheck(ok, title, detail) {
  checks.push({ ok, title, detail });
}

pushCheck(existsSync(path.join(root, ".git")), "Repositorio git", "Pasta .git precisa existir para commit, tag e push automáticos.");
pushCheck(
  gitStatus !== null && gitStatus.length === 0,
  "Worktree limpa",
  gitStatus === null
    ? "Nao foi possivel ler o estado do git nesta maquina. Em ambiente restrito isso pode acontecer por bloqueio de execucao do git via Node."
    : gitStatus.length === 0
      ? "Workspace sem alteracoes pendentes, pronta para bump/tag/push."
      : "Existem arquivos modificados, staged ou nao rastreados. Feche esse lote antes de publicar uma nova versao."
);

const gitRemote = getGitOutput(["remote", "get-url", "origin"]);
pushCheck(Boolean(gitRemote), "Remote origin", gitRemote || "Configure o remote origin para o GitHub do projeto.");

pushCheck(packageJson.version === appVersion, "Versao package/app.ts", `${packageJson.version} / ${appVersion}`);
pushCheck(packageJson.version === tauriConfig.version, "Versao package/tauri", `${packageJson.version} / ${tauriConfig.version}`);
pushCheck(packageJson.version === cargoVersion, "Versao package/cargo", `${packageJson.version} / ${cargoVersion}`);
pushCheck(
  !(currentTagCommit && headCommit && currentTagCommit !== headCommit),
  "Versao liberada sem bump novo",
  currentTagCommit && headCommit && currentTagCommit !== headCommit
    ? `A tag ${currentTagName} ja existe, mas o HEAD atual mudou depois dela. Faca bump de versao antes de empacotar/publicar novamente.`
    : currentTagCommit
      ? `Tag ${currentTagName} alinhada com o HEAD atual.`
      : `Ainda nao existe tag ${currentTagName}; pronto para primeira publicacao desta versao.`
);

pushCheck(existsSync(path.join(root, workflowPath)), "Workflow GitHub", "O workflow release-desktop.yml precisa existir.");
pushCheck(existsSync(path.join(root, "scripts", "release-desktop.mjs")), "Script release-desktop", "Gera MSI, .sig e latest.json.");
pushCheck(existsSync(path.join(root, "scripts", "release-github.mjs")), "Script release-github", "Faz bump, commit, tag e push.");

pushCheck(
  updaterEndpoint.startsWith("https://github.com/"),
  "Endpoint do updater",
  updaterEndpoint
);

pushCheck(Boolean(process.env.TAURI_UPDATER_PUBKEY), "TAURI_UPDATER_PUBKEY", process.env.TAURI_UPDATER_PUBKEY ? "Variavel presente no ambiente atual." : "Defina a chave publica do updater.");
pushCheck(
  Boolean(process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH),
  "TAURI_SIGNING_PRIVATE_KEY",
  process.env.TAURI_SIGNING_PRIVATE_KEY || process.env.TAURI_SIGNING_PRIVATE_KEY_PATH
    ? "Variavel presente no ambiente atual."
    : "Defina TAURI_SIGNING_PRIVATE_KEY ou TAURI_SIGNING_PRIVATE_KEY_PATH para assinar o MSI."
);

const failedChecks = checks.filter((check) => !check.ok);
const warningChecks = checks.filter((check) => !check.ok && check.title.startsWith("TAURI_"));

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[pendente]"} ${check.title}: ${check.detail}`);
}

if (failedChecks.length === 0) {
  console.log("\nPipeline pronto para bump/tag/push e release automática no GitHub.");
  process.exit(0);
}

if (failedChecks.length === warningChecks.length) {
  console.log("\nEstrutura do pipeline esta pronta. Faltam apenas as chaves de assinatura/updater no ambiente atual.");
  process.exit(0);
}

console.error("\nExistem pendencias estruturais no pipeline automatico de release.");
process.exit(1);
