import { APP_UPDATER_ENDPOINT, getCloudModeLabel, getUpdaterChannelLabel, isLocalCloudApi } from "@/config/app";
import type { UpdateCheckState } from "@/types/domain";

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

interface ReleasePanelsContext {
  updateState?: UpdateCheckState;
  desktopRuntime?: boolean;
}

function bumpPatch(version: string) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${Number.isFinite(patch) ? patch + 1 : 1}`;
}

function hasPublicUpdater() {
  return APP_UPDATER_ENDPOINT.startsWith("https://");
}

function hasReachablePublishedRelease(state?: UpdateCheckState) {
  return state?.status === "latest" || state?.status === "available" || state?.status === "installed";
}

function hasSignatureProblem(state?: UpdateCheckState) {
  return state?.status === "error" && /assinatura|signature|pubkey|key/i.test(`${state.message} ${state.details ?? ""}`);
}

export function buildReleaseReadiness(): ReleaseReadinessSnapshot {
  const updaterPublic = hasPublicUpdater();
  const cloudPublic = !isLocalCloudApi();
  const channel = getUpdaterChannelLabel();

  const score = [updaterPublic ? 35 : 0, cloudPublic ? 25 : 0, channel.toLowerCase().includes("release") ? 20 : 10, 20].reduce((sum, value) => sum + value, 0);

  if (score >= 85) {
    return {
      score,
      headline: "Pipeline forte para distribuição",
      helper: "Cloud público e endpoint do updater apontando para release real.",
      tone: "success"
    };
  }

  if (score >= 60) {
    return {
      score,
      headline: "Bom para piloto e atualização controlada",
      helper: "Offline está pronto, mas ainda existem pontos para fechar antes de uma distribuição premium.",
      tone: "warning"
    };
  }

  return {
    score,
    headline: "Offline forte, release ainda em preparação",
    helper: "A loja pode trabalhar localmente, e a publicação completa do updater vem no fechamento final.",
    tone: "neutral"
  };
}

export function buildReleaseChecklist(context: ReleasePanelsContext = {}) {
  const cloudPublic = !isLocalCloudApi();
  const updaterPublic = hasPublicUpdater();
  const releaseReachable = hasReachablePublishedRelease(context.updateState);
  const signatureProblem = hasSignatureProblem(context.updateState);
  const desktopRuntime = context.desktopRuntime ?? false;

  return [
    { id: "rc-1", title: "Bump e tag automáticos", helper: "Use npm run release:github -- --set=X.Y.Z para versionar, commitar, taguear e subir ao GitHub.", status: "ok" },
    {
      id: "rc-2",
      title: "Assinatura no pipeline",
      helper: signatureProblem
        ? "O updater encontrou inconsistência de assinatura. Revise chave pública, .sig da release e secrets do GitHub Actions."
        : releaseReachable
          ? "A release atual respondeu ao updater. Isso indica que assinatura, latest.json e secrets do pipeline estão coerentes para este canal."
          : updaterPublic
            ? "As chaves ficam no GitHub Actions e no ambiente de release. O cliente final não precisa carregar secrets na máquina de uso."
            : "Falta apontar o updater para uma release pública e manter TAURI_SIGNING_PRIVATE_KEY, password e TAURI_UPDATER_PUBKEY no pipeline.",
      status: signatureProblem ? "warning" : releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    },
    {
      id: "rc-3",
      title: "Build desktop",
      helper: desktopRuntime
        ? "Runtime desktop ativo. O build assinado e o updater podem ser validados na própria máquina de operação."
        : updaterPublic
          ? "O build assinado segue pelo fluxo de release e deve ser validado no PC alvo depois da publicação."
          : "Gerar MSI assinado com tauri:build, passar em type-check e validar no PC alvo.",
      status: desktopRuntime || releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    },
    {
      id: "rc-4",
      title: "Manifest final",
      helper: releaseReachable
        ? "O updater já conseguiu ler a release atual deste canal. latest.json está público e respondendo no endpoint configurado."
        : "Produzir latest.json via release:desktop e validar URL/sig do canal de release.",
      status: releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    },
    { id: "rc-5", title: "Workflow GitHub", helper: "Tag v* dispara release-desktop.yml automaticamente e publica MSI, .sig e latest.json.", status: "ok" },
    { id: "rc-6", title: "Cloud público", helper: `${getCloudModeLabel()} - trocar localhost por endpoint final antes de venda premium.`, status: cloudPublic ? "ok" : "warning" }
  ] as ReleaseChecklistItem[];
}

export function buildReleaseArtifacts(context: ReleasePanelsContext = {}) {
  const updaterPublic = hasPublicUpdater();
  const releaseReachable = hasReachablePublishedRelease(context.updateState);
  const signatureProblem = hasSignatureProblem(context.updateState);

  return [
    {
      id: "ra-1",
      title: "MSI",
      helper: releaseReachable
        ? "A release atual já respondeu ao updater deste canal. O instalador publicado está consistente com a consulta mais recente."
        : updaterPublic
          ? "Instalador desktop previsto no canal de release. A validação final acontece ao publicar a tag mais recente."
          : "Instalador desktop distribuido ao cliente.",
      status: releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    },
    {
      id: "ra-2",
      title: ".sig",
      helper: signatureProblem
        ? "A release foi encontrada, mas a assinatura não bateu com a chave pública configurada. Revise .sig, pubkey e secrets."
        : releaseReachable
          ? "Assinatura validada pelo fluxo atual do updater. O pacote publicado está pronto para instalação segura."
          : updaterPublic
            ? "Assinatura exigida pelo updater seguro. Se o botão de verificar falhar, o ajuste costuma estar na release atual do GitHub."
            : "Assinatura usada pelo updater seguro.",
      status: signatureProblem ? "warning" : releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    },
    {
      id: "ra-3",
      title: "latest.json",
      helper: releaseReachable ? "Manifesto publicado e respondendo ao updater neste canal." : "Manifesto consumido pelo plugin updater do Tauri.",
      status: releaseReachable ? "ok" : updaterPublic ? "warning" : "pending"
    }
  ] as ReleaseArtifactItem[];
}

export function buildReleaseLanes() {
  return [
    {
      id: "lane-stable",
      title: "Stable / loja em produção",
      audience: "cliente final",
      helper: "Melhor para cliente que quer trabalhar offline com update controlado e menos risco.",
      highlighted: true
    },
    {
      id: "lane-manual",
      title: "Manual offline",
      audience: "instalação assistida",
      helper: "Bom para enviar pacote fechado quando a loja prefere atualizar fora do horário de pico."
    },
    {
      id: "lane-candidate",
      title: "Candidate / piloto",
      audience: "homologação",
      helper: "Ideal para testar novidade em uma máquina antes de liberar geral."
    }
  ] as ReleaseLaneItem[];
}

export function buildReleaseCommands(currentVersion: string) {
  const nextVersion = bumpPatch(currentVersion);

  return [
    {
      id: "cmd-ready",
      title: "Diagnóstico local",
      label: "primeiro passo",
      command: "npm run release:ready",
      helper: "Confere estrutura do pipeline, versões, workflow, remote git e chaves disponíveis no ambiente atual.",
      tone: "primary"
    },
    {
      id: "cmd-env",
      title: "Build assinado no Windows",
      label: "PowerShell",
      command: "npm run tauri:build:signed:ps",
      helper: "Carrega .env.release, valida updater e gera o MSI assinado sem precisar exportar variáveis manualmente no cmd.",
      tone: "neutral"
    },
    {
      id: "cmd-release",
      title: "Bump, commit, tag e push",
      label: "automático",
      command: `npm run release:github:ps -- -Version ${nextVersion}`,
      helper: `Parte de ${currentVersion} para ${nextVersion}, roda o readiness check e dispara a tag v${nextVersion} no GitHub.`,
      tone: "primary"
    },
    {
      id: "cmd-signed",
      title: "Gerar notas da versão",
      label: "validação",
      command: `npm run release:notes -- --version=${nextVersion}`,
      helper: "Permite revisar o texto da atualização antes do bump, da tag e do push automático no GitHub.",
      tone: "warning"
    }
  ] as ReleaseCommandItem[];
}
