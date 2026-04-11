import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = process.argv.slice(2);
const versionArg = args.find((arg) => arg.startsWith("--version="));
const outputArg = args.find((arg) => arg.startsWith("--output="));
const stdoutMode = args.includes("--stdout");

function runGit(commandArgs) {
  const result = spawnSync("git", commandArgs, {
    cwd: root,
    shell: process.platform === "win32",
    env: process.env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return "";
  }

  return (result.stdout ?? "").trim();
}

function readVersionFromAppConfig(content) {
  const match = content.match(/APP_VERSION\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Nao foi possivel localizar APP_VERSION em src/config/app.ts.");
  }

  return match[1];
}

function getPreviousTag(version) {
  const tags = runGit(["tag", "--sort=-v:refname"])
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => tag !== `v${version}`);

  return tags[0] ?? null;
}

function readCommitSubjects(previousTag) {
  const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
  const log = runGit(["log", range, "--pretty=format:%s"]);
  const commits = log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^chore\(release\):/i.test(line));

  return Array.from(new Set(commits));
}

function normalizeSubject(subject) {
  return subject
    .replace(/^(feat|fix|chore|refactor|perf|docs|style|test|build|ci)(\([^)]+\))?:\s*/i, "")
    .replace(/\.$/, "")
    .trim();
}

function toBullet(subject) {
  const text = normalizeSubject(subject);
  if (!text) {
    return null;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function matches(subject, expressions) {
  return expressions.some((expression) => expression.test(subject));
}

function categorizeCommits(commits) {
  const buckets = {
    novidades: [],
    melhorias: [],
    correcoes: [],
    infraestrutura: []
  };

  for (const subject of commits) {
    const bullet = toBullet(subject);
    if (!bullet) {
      continue;
    }

    if (matches(subject, [/^feat/i, /\bnovo\b/i, /\bnova\b/i, /\badicion/i, /\bminiatura/i, /\bpreview/i])) {
      buckets.novidades.push(bullet);
      continue;
    }

    if (matches(subject, [/^fix/i, /\bcorrig/i, /\berro\b/i, /\bbug\b/i, /\bfalha\b/i])) {
      buckets.correcoes.push(bullet);
      continue;
    }

    if (matches(subject, [/^build/i, /^ci/i, /^chore/i, /\brelease\b/i, /\bworkflow\b/i, /\bupdater\b/i, /\bgithub\b/i])) {
      buckets.infraestrutura.push(bullet);
      continue;
    }

    buckets.melhorias.push(bullet);
  }

  return buckets;
}

function buildFallbackHighlights(version) {
  return {
    novidades: [],
    melhorias: [
      `Melhorias gerais de estabilidade, operacao offline e acabamento visual no lote ${version}`
    ],
    correcoes: [],
    infraestrutura: [
      "Ajustes internos para manter release, updater e distribuicao mais consistentes"
    ]
  };
}

function buildImpactLines(buckets) {
  const impact = [];

  if (buckets.novidades.length > 0) {
    impact.push("Fluxos principais ficaram mais claros para o operador no uso diario.");
  }

  if (buckets.melhorias.length > 0) {
    impact.push("A navegação e a leitura operacional ficaram mais rapidas e previsiveis.");
  }

  if (buckets.correcoes.length > 0) {
    impact.push("A atualizacao reduz risco de erro visual, operacional ou de runtime.");
  }

  if (buckets.infraestrutura.length > 0) {
    impact.push("O processo de atualizacao e release ficou mais seguro para distribuicao futura.");
  }

  return impact.length > 0
    ? impact
    : ["Atualizacao recomendada para manter o sistema estavel, claro e pronto para novos lotes."];
}

function renderSection(title, items) {
  if (!items.length) {
    return `## ${title}\n- Sem destaques especificos neste lote.\n`;
  }

  return `## ${title}\n${items.map((item) => `- ${item}`).join("\n")}\n`;
}

const appConfig = await readFile(path.join(root, "src", "config", "app.ts"), "utf8");
const version = versionArg ? versionArg.split("=")[1] : readVersionFromAppConfig(appConfig);
const previousTag = getPreviousTag(version);
const commitSubjects = existsSync(path.join(root, ".git")) ? readCommitSubjects(previousTag) : [];
const categorized = commitSubjects.length > 0 ? categorizeCommits(commitSubjects) : buildFallbackHighlights(version);
const impactLines = buildImpactLines(categorized);
const title = `v${version} - atualizacao operacional do Smart Tech PDV`;

const content = [
  `# ${title}`,
  "",
  previousTag ? `Base comparativa: ${previousTag} -> v${version}` : `Primeira release publicada da linha ${version}.`,
  "",
  renderSection("Novidades", categorized.novidades).trimEnd(),
  "",
  renderSection("Melhorias", categorized.melhorias).trimEnd(),
  "",
  renderSection("Correcoes", categorized.correcoes).trimEnd(),
  "",
  renderSection("Impacto para a loja", impactLines).trimEnd(),
  "",
  renderSection("Infraestrutura e release", categorized.infraestrutura).trimEnd(),
  "",
  "## Observacoes",
  "- Atualizacao recomendada para manter o app mais estavel, claro e pronto para operacao comercial.",
  "- Se a loja estiver em horario de pico, prefira atualizar fora do caixa cheio.",
  ""
].join("\n");

if (stdoutMode) {
  process.stdout.write(content);
  process.exit(0);
}

const outputPath = outputArg
  ? path.resolve(root, outputArg.split("=")[1])
  : path.join(root, "release-notes", `v${version}.md`);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, content, "utf8");

console.log(`Release notes generated at ${outputPath}`);
