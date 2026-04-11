import { useEffect, useMemo, useState } from "react";
import { APP_UPDATER_ENDPOINT, getUpdaterChannelLabel } from "@/config/app";
import { getReleaseReadinessSnapshot, type ReleaseReadinessSnapshot } from "@/features/updates/release-readiness.service";
import { buildReleaseArtifacts, buildReleaseChecklist, buildReleaseCommands, buildReleaseLanes } from "@/features/updates/updates.service";
import { ReleaseArtifactsPanel } from "@/components/updates/release-artifacts-panel";
import { ReleaseChecklistPanel } from "@/components/updates/release-checklist-panel";
import { ReleaseCommandPanel } from "@/components/updates/release-command-panel";
import { ReleaseLanesPanel } from "@/components/updates/release-lanes-panel";
import { ReleaseReadinessPanel } from "@/components/updates/release-readiness-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentVersion } from "@/hooks/use-current-version";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import { finalizeInstalledUpdate } from "@/lib/tauri";
import { useUpdaterStore } from "@/stores/updater-store";
import type { UpdateCheckState } from "@/types/domain";
import { BellRing, CheckCheck, Cloud, Download, RefreshCcw, Rocket, ShieldCheck } from "lucide-react";

const initialState: UpdateCheckState = {
  status: "idle",
  message: "Pronto para consultar o latest.json do canal configurado."
};

function getStateLabel(state: UpdateCheckState["status"]) {
  if (state === "latest") return "Tudo em dia";
  if (state === "available") return "Nova versão encontrada";
  if (state === "installed") return "Pronta para concluir";
  if (state === "installing") return "Instalando";
  if (state === "checking") return "Verificando";
  if (state === "error") return "Precisa de atenção";
  return "Em espera";
}

function getStateBadgeVariant(state: UpdateCheckState["status"]) {
  if (state === "available" || state === "installed" || state === "latest") return "success" as const;
  if (state === "error") return "destructive" as const;
  if (state === "checking" || state === "installing") return "warning" as const;
  return "outline" as const;
}

function getStateTitle(state: UpdateCheckState) {
  if (state.status === "available") {
    return state.version ? `A versão ${state.version} já está pronta para esta instalação.` : "Existe uma nova versão pronta para instalar.";
  }

  if (state.status === "installed") {
    return "A atualização já foi preparada. Agora basta fechar e abrir o app novamente.";
  }

  if (state.status === "installing") {
    return "O pacote novo está sendo baixado e validado antes da troca.";
  }

  if (state.status === "latest") {
    return "Esta máquina já está na última versão disponível para o canal configurado.";
  }

  if (state.status === "error") {
    return "A checagem falhou e precisa de revisão antes de vender ou publicar uma nova release.";
  }

  if (state.status === "checking") {
    return "O app está consultando o updater em segundo plano.";
  }

  return "O updater está pronto para consultar versões novas quando você quiser.";
}

function getPrimaryActionLabel(state: UpdateCheckState) {
  if (state.status === "available") return "Baixar e instalar";
  if (state.status === "installed") return "Fechar para concluir";
  if (state.status === "error") return "Revisar publicação";
  return "Verificar agora";
}

export default function UpdatesPage() {
  const version = useCurrentVersion();
  const { data: settings, loading } = useSettingsSnapshot();
  const state = useUpdaterStore((store) => store.state);
  const checkNow = useUpdaterStore((store) => store.checkNow);
  const installNow = useUpdaterStore((store) => store.installNow);
  const installBusy = useUpdaterStore((store) => store.installBusy);
  const [readiness, setReadiness] = useState<ReleaseReadinessSnapshot | null>(null);
  const checklist = useMemo(
    () =>
      buildReleaseChecklist({
        updateState: state,
        desktopRuntime: readiness?.checks.some((check) => check.id === "tauri-runtime" && check.ok) ?? false
      }),
    [readiness, state]
  );
  const artifacts = useMemo(() => buildReleaseArtifacts({ updateState: state }), [state]);
  const commands = useMemo(() => buildReleaseCommands(version), [version]);
  const lanes = useMemo(() => buildReleaseLanes(), []);
  const stateLabel = getStateLabel(state.status);
  const stateTitle = getStateTitle(state);

  useEffect(() => {
    let active = true;

    void getReleaseReadinessSnapshot().then((snapshot) => {
      if (active) {
        setReadiness(snapshot);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function refreshReadiness() {
    setReadiness(await getReleaseReadinessSnapshot());
  }

  async function handleCheck() {
    await checkNow("manual");
    await refreshReadiness();
  }

  async function handleInstall() {
    await installNow();
    await refreshReadiness();
  }

  async function handlePrimaryAction() {
    if (state.status === "available") {
      await handleInstall();
      return;
    }

    if (state.status === "installed") {
      await finalizeInstalledUpdate();
      return;
    }

    await handleCheck();
  }

  if (loading || !settings) {
    return <PageLoader />;
  }

  const readinessChecks = readiness?.checks ?? [];
  const desktopReady = readinessChecks.find((check) => check.id === "tauri-runtime")?.ok ?? false;
  const endpointReady = readinessChecks.find((check) => check.id === "updater-endpoint")?.ok ?? APP_UPDATER_ENDPOINT.includes("latest.json");
  const networkReady = readinessChecks.find((check) => check.id === "network")?.ok ?? true;
  const automaticNoticeLabel = state.status === "available" || state.status === "installed" ? "Avisando o usuário" : "Monitorando em segundo plano";
  const quickStatusCards = [
    {
      label: "Versão atual",
      value: version,
      helper: "Leitura da instalação ativa",
      icon: Rocket
    },
    {
      label: "Canal",
      value: getUpdaterChannelLabel(settings.updaterChannel),
      helper: settings.updaterChannel === "beta" ? "Canal de homologação" : "Canal pronto para cliente final",
      icon: ShieldCheck
    },
    {
      label: "Status agora",
      value: stateLabel,
      helper: state.message || initialState.message,
      icon: CheckCheck
    },
    {
      label: "Aviso automático",
      value: automaticNoticeLabel,
      helper: "Ao abrir, ao voltar para a janela e também em segundo plano.",
      icon: BellRing
    }
  ];

  const simpleChecks = [
    {
      label: "Updater configurado",
      ok: endpointReady,
      helper: endpointReady ? "O app está apontando para um latest.json público." : "Ajuste o endpoint do updater para a release publicada."
    },
    {
      label: "Runtime desktop pronto",
      ok: desktopReady,
      helper: desktopReady ? "Tauri ativo com plugin updater disponível nesta máquina." : "No navegador a checagem serve só como demonstração."
    },
    {
      label: "Rede disponível",
      ok: networkReady,
      helper: networkReady ? "A máquina está online para consultar a release." : "Sem internet o aviso volta a funcionar quando a rede retornar."
    },
    {
      label: "Canal definido",
      ok: settings.updaterChannel.trim().length > 0,
      helper: `Canal atual: ${getUpdaterChannelLabel(settings.updaterChannel)}.`
    }
  ];

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={
          <>
            <Badge variant="outline">Aviso automático ativo</Badge>
            <Button onClick={handleCheck}>
              <RefreshCcw className="h-4 w-4" />
              Verificar agora
            </Button>
          </>
        }
        badge="Atualização clara para o usuário"
        description="Deixei esta área mais simples: ela mostra se já está tudo certo, quando existe versão nova e qual é o próximo passo para o usuário." 
        eyebrow="Atualizações"
        title="Atualização do sistema"
      />

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {quickStatusCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card className="executive-panel" key={item.label}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <p className="font-display text-[28px] font-semibold text-slate-50">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs className="space-y-6" defaultValue="simples">
        <TabsList>
          <TabsTrigger value="simples">Visão simples</TabsTrigger>
          <TabsTrigger value="tecnico">Validação técnica</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="simples">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="surface-rule">
              <CardContent className="space-y-5 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Badge variant={getStateBadgeVariant(state.status)}>{stateLabel}</Badge>
                    <h2 className="text-2xl font-semibold text-slate-50">{stateTitle}</h2>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{state.details ?? state.message ?? initialState.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={installBusy || state.status === "checking"} onClick={handlePrimaryAction}>
                      {state.status === "available" ? <Download className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                      {state.status === "available" ? (installBusy ? "Instalando..." : getPrimaryActionLabel(state)) : getPrimaryActionLabel(state)}
                    </Button>
                    {state.status !== "available" ? (
                      <Button onClick={handleCheck} variant="outline">
                        Verificação manual
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {[
                    {
                      label: "Próximo passo",
                      value:
                        state.status === "available"
                          ? "Baixar e instalar"
                          : state.status === "installed"
                            ? "Fechar e abrir o app"
                            : state.status === "error"
                              ? "Revisar release e internet"
                              : "Aguardar ou verificar de novo",
                      helper: "Sempre com uma ação clara para o usuário."
                    },
                    {
                      label: "Aviso automático",
                      value: automaticNoticeLabel,
                      helper: state.status === "available" ? "Mesmo se fechar o banner, o sistema lembra de novo depois." : "O sistema monitora sem travar o uso da loja."
                    },
                    {
                      label: "Última checagem",
                      value: state.checkedAt ? new Date(state.checkedAt).toLocaleString("pt-BR") : "Ainda não feita",
                      helper: "Mostra quando a instalação falou com o updater por último."
                    },
                    {
                      label: "Endpoint",
                      value: endpointReady ? "latest.json pronto" : "Revisar endpoint",
                      helper: endpointReady ? "A URL do updater está no formato correto." : APP_UPDATER_ENDPOINT
                    }
                  ].map((item) => (
                    <div className="premium-tile rounded-2xl p-4" key={item.label}>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-50">{item.value}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
                    </div>
                  ))}
                </div>

                {state.status === "error" ? (
                  <div className="system-alert system-alert--error">
                    A consulta ao updater falhou. Normalmente isso acontece quando a release do GitHub ainda não publicou o <span className="font-semibold">latest.json</span>, a assinatura não bate ou a rede da máquina está bloqueando o acesso.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="surface-rule">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Como o usuário entende</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-50">Fluxo simples para atualização segura</h3>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      title: "1. O sistema verifica sozinho",
                      description: "A checagem roda ao abrir, quando a janela volta ao foco e em segundo plano sem travar a loja."
                    },
                    {
                      title: "2. Quando existir nova versão, o app avisa",
                      description: "O usuário vê banner no topo, alerta no sino e esta página já mostra o que fazer sem linguagem técnica."
                    },
                    {
                      title: "3. Instala e pede reabertura",
                      description: "Depois do download, o sistema avisa que falta só fechar e abrir o app novamente para concluir."
                    }
                  ].map((item) => (
                    <div className="premium-tile rounded-2xl p-4" key={item.title}>
                      <p className="text-sm font-semibold text-slate-50">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="surface-rule">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Validação rápida</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-50">O updater está implementado do jeito certo?</h3>
                  </div>
                  <Badge variant={readiness && readiness.score >= 85 ? "success" : readiness && readiness.score >= 60 ? "warning" : "destructive"}>
                    {readiness ? `${readiness.score}%` : "Lendo"}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {simpleChecks.map((item) => (
                    <div className="premium-tile rounded-2xl p-4" key={item.label}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-50">{item.label}</p>
                        <Badge variant={item.ok ? "success" : "warning"}>{item.ok ? "ok" : "revisar"}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-rule">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Publicação</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-50">O que precisa estar correto para o update funcionar</h3>
                  </div>
                  <Cloud className="h-5 w-5 text-slate-400" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      title: "Release pública",
                      helper: "A versão nova precisa estar publicada no GitHub Releases do canal certo."
                    },
                    {
                      title: "latest.json respondendo",
                      helper: "Sem esse arquivo público o app não consegue descobrir a nova versão."
                    },
                    {
                      title: "Assinatura válida",
                      helper: "A chave pública do updater precisa bater com a assinatura do pacote publicado."
                    },
                    {
                      title: "Internet liberada",
                      helper: "A máquina do cliente precisa alcançar o endpoint sem bloqueio de firewall."
                    }
                  ].map((item) => (
                    <div className="premium-tile rounded-2xl p-4" key={item.title}>
                      <p className="text-sm font-semibold text-slate-50">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.helper}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-6" value="tecnico">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <ReleaseReadinessPanel snapshot={readiness} />
            <ReleaseChecklistPanel items={checklist} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <ReleaseCommandPanel items={commands} />
            <Card className="surface-rule">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Endpoint atual</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-50">URL consumida pelo updater</h3>
                </div>
                <div className="premium-tile rounded-2xl p-4">
                  <p className="break-all text-sm leading-6 text-slate-100">{APP_UPDATER_ENDPOINT}</p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">Esse bloco fica técnico de propósito, para checagem de release, assinatura, canal e publicação final.</p>
              </CardContent>
            </Card>
          </div>
          <ReleaseLanesPanel items={lanes} />
          <ReleaseArtifactsPanel items={artifacts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
