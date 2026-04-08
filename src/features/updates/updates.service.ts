import { APP_UPDATER_ENDPOINT, getCloudModeLabel, getUpdaterChannelLabel, isLocalCloudApi } from "@/config/app";

export interface ReleaseChecklistItem {
  id: string;
  title: string;
  helper: string;
  status: "ok" | "warning" | "pending";
}

export interface ReleaseArtifactItem {
  id: string;
  title: string;
  helper: string;
  status: "ok" | "warning" | "pending";
}

export interface ReleaseLaneItem {
  id: string;
  title: string;
  audience: string;
  helper: string;
  highlighted?: boolean;
}

export interface ReleaseCommandItem {
  id: string;
  title: string;
  label: string;
  command: string;
  helper: string;
  tone: "primary" | "neutral" | "warning";
}

export interface ReleaseReadinessSnapshot {
  score: number;
  headline: string;
  helper: string;
  tone: "success" | "warning" | "neutral";
}

function bumpPatch(version: string) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${Number.isFinite(patch) ? patch + 1 : 1}`;
}

function hasPublicUpdater() {
  return APP_UPDATER_ENDPOINT.startsWith("https://");
}

export function buildReleaseReadiness(): ReleaseReadinessSnapshot {
  const updaterPublic = hasPublicUpdater();
  const cloudPublic = !isLocalCloudApi();
  const channel = getUpdaterChannelLabel();

  const score = [updaterPublic ? 35 : 0, cloudPublic ? 25 : 0, channel.toLowerCase().includes("release") ? 20 : 10, 20].reduce((sum, value) => sum + value, 0);

  if (score >= 85) {
    return {
      score,
      headline: "Pipeline forte para distribuicao",
      helper: "Cloud publico e endpoint do updater apontando para release real.",
      tone: "success"
    };
  }

  if (score >= 60) {
    return {
      score,
      headline: "Bom para piloto e atualizacao controlada",
      helper: "Offline esta pronto, mas ainda existem pontos para fechar antes de uma distribuicao premium.",
      tone: "warning"
    };
  }

  return {
    score,
    headline: "Offline forte, release ainda em preparacao",
    helper: "A loja pode trabalhar localmente, e a publicacao completa do updater vem no fechamento final.",
    tone: "neutral"
  };
}

export function buildReleaseChecklist() {
  const cloudPublic = !isLocalCloudApi();
  const updaterPublic = hasPublicUpdater();

  return [
    { id: "rc-1", title: "Bump e tag automáticos", helper: "Use npm run release:github -- --set=X.Y.Z para versionar, commitar, taguear e subir ao GitHub.", status: "ok" },
    { id: "rc-2", title: "Assinatura ativa", helper: "Configurar TAURI_SIGNING_PRIVATE_KEY, password e TAURI_UPDATER_PUBKEY no GitHub Actions e no ambiente local quando for buildar.", status: updaterPublic ? "warning" : "pending" },
    { id: "rc-3", title: "Build desktop", helper: "Gerar MSI assinado com tauri:build, passar em type-check e validar no PC alvo.", status: "warning" },
    { id: "rc-4", title: "Manifest final", helper: "Produzir latest.json via release:desktop e validar URL/sig do canal de release.", status: updaterPublic ? "ok" : "warning" },
    { id: "rc-5", title: "Workflow GitHub", helper: "Tag v* dispara release-desktop.yml automaticamente e publica MSI, .sig e latest.json.", status: "ok" },
    { id: "rc-6", title: "Cloud publico", helper: `${getCloudModeLabel()} - trocar localhost por endpoint final antes de venda premium.`, status: cloudPublic ? "ok" : "warning" }
  ] as ReleaseChecklistItem[];
}

export function buildReleaseArtifacts() {
  const updaterPublic = hasPublicUpdater();
  return [
    { id: "ra-1", title: "MSI", helper: "Instalador desktop distribuido ao cliente.", status: "warning" },
    { id: "ra-2", title: ".sig", helper: "Assinatura usada pelo updater seguro.", status: updaterPublic ? "warning" : "pending" },
    { id: "ra-3", title: "latest.json", helper: "Manifesto consumido pelo plugin updater do Tauri.", status: updaterPublic ? "ok" : "warning" }
  ] as ReleaseArtifactItem[];
}

export function buildReleaseLanes() {
  return [
    {
      id: "lane-stable",
      title: "Stable / loja em producao",
      audience: "cliente final",
      helper: "Melhor para cliente que quer trabalhar offline com update controlado e menos risco.",
      highlighted: true
    },
    {
      id: "lane-manual",
      title: "Manual offline",
      audience: "instalacao assistida",
      helper: "Bom para enviar pacote fechado quando a loja prefere atualizar fora do horario de pico."
    },
    {
      id: "lane-candidate",
      title: "Candidate / piloto",
      audience: "homologacao",
      helper: "Ideal para testar novidade em uma maquina antes de liberar geral."
    }
  ] as ReleaseLaneItem[];
}

export function buildReleaseCommands(currentVersion: string) {
  const nextVersion = bumpPatch(currentVersion);

  return [
    {
      id: "cmd-ready",
      title: "Diagnostico local",
      label: "primeiro passo",
      command: "npm run release:ready",
      helper: "Confere estrutura do pipeline, versoes, workflow, remote git e chaves disponiveis no ambiente atual.",
      tone: "primary"
    },
    {
      id: "cmd-env",
      title: "Carregar chaves do updater",
      label: "PowerShell",
      command: ".\\scripts\\load-release-env.ps1 -Path .env.release",
      helper: "Sobe TAURI_UPDATER_PUBKEY e TAURI_SIGNING_PRIVATE_KEY para a sessao atual sem precisar exportar uma por uma.",
      tone: "neutral"
    },
    {
      id: "cmd-release",
      title: "Bump, commit, tag e push",
      label: "automatico",
      command: `.\\scripts\\release-github.ps1 -Version ${nextVersion}`,
      helper: `Parte de ${currentVersion} para ${nextVersion}, roda o readiness check e dispara a tag v${nextVersion} no GitHub.`,
      tone: "primary"
    },
    {
      id: "cmd-signed",
      title: "Build assinado local",
      label: "validacao",
      command: "npm run tauri:build",
      helper: "Use para validar MSI assinado e latest.json na propria maquina antes de confiar 100% na automacao do GitHub.",
      tone: "warning"
    }
  ] as ReleaseCommandItem[];
}
