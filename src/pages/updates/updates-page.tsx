import { useEffect, useMemo, useState } from "react";
import { APP_UPDATER_ENDPOINT, getUpdaterChannelLabel } from "@/config/app";
import { getReleaseReadinessSnapshot, type ReleaseReadinessSnapshot } from "@/features/updates/release-readiness.service";
import { buildReleaseArtifacts, buildReleaseChecklist, buildReleaseCommands, buildReleaseLanes } from "@/features/updates/updates.service";
import { ReleaseArtifactsPanel } from "@/components/updates/release-artifacts-panel";
import { ReleaseCommandPanel } from "@/components/updates/release-command-panel";
import { ReleaseChecklistPanel } from "@/components/updates/release-checklist-panel";
import { ReleaseLanesPanel } from "@/components/updates/release-lanes-panel";
import { ReleaseReadinessPanel } from "@/components/updates/release-readiness-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentVersion } from "@/hooks/use-current-version";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import { checkForUpdates, installAvailableUpdate } from "@/services/updater.service";
import type { UpdateCheckState } from "@/types/domain";

const initialState: UpdateCheckState = {
  status: "idle",
  message: "Pronto para consultar o latest.json do canal configurado."
};

export default function UpdatesPage() {
  const version = useCurrentVersion();
  const { data: settings, loading } = useSettingsSnapshot();
  const [state, setState] = useState<UpdateCheckState>(initialState);
  const [readiness, setReadiness] = useState<ReleaseReadinessSnapshot | null>(null);
  const checklist = useMemo(() => buildReleaseChecklist(), []);
  const artifacts = useMemo(() => buildReleaseArtifacts(), []);
  const commands = useMemo(() => buildReleaseCommands(version), [version]);
  const lanes = useMemo(() => buildReleaseLanes(), []);

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

  async function handleCheck() {
    setState({ status: "checking", message: "Verificando nova versao..." });
    const result = await checkForUpdates();
    setState(result);
  }

  async function handleInstall() {
    await installAvailableUpdate();
  }

  if (loading || !settings) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={
          <>
            <Badge variant="outline">npm run release:ready</Badge>
            <Button onClick={handleCheck}>Verificar atualizacao</Button>
          </>
        }
        badge="Updater Tauri v2 preparado"
        description="Fluxo desenhado para GitHub Releases com latest.json, assinatura e instalacao segura, agora com leitura melhor de canal e prontidao de rollout."
        eyebrow="Atualizacoes"
        title="Pipeline de release e updater"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Versao atual</p>
                <p className="mt-2 font-display text-4xl font-semibold text-slate-950">{version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canal configurado</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{getUpdaterChannelLabel(settings.updaterChannel)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Use stable para cliente final e beta para homologacao.</p>
              </div>
            </div>
            <div className="rounded-2xl bg-secondary/45 p-4">
              <p className="text-sm text-muted-foreground">Endpoint</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-950">{APP_UPDATER_ENDPOINT}</p>
            </div>
            <div className="rounded-2xl bg-secondary/45 p-4">
              <p className="text-sm text-muted-foreground">Fluxo automático</p>
              <p className="mt-2 text-sm font-medium text-slate-950">npm run release:ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Valida git, versões, workflow e pré-requisitos antes do bump/tag/push automático.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-secondary/45 p-4">
                <p className="text-sm text-muted-foreground">Modo operacional</p>
                <p className="mt-2 font-semibold text-slate-950">Offline primeiro</p>
                <p className="mt-1 text-sm text-muted-foreground">A atualizacao entra como lote futuro, sem travar o uso local do cliente.</p>
              </div>
              <div className="rounded-2xl bg-secondary/45 p-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Badge variant={state.status === "available" ? "success" : state.status === "error" ? "destructive" : "outline"}>{state.status}</Badge>
                  <span className="text-sm text-muted-foreground">{state.message}</span>
                </div>
              </div>
            </div>
            {state.status === "available" ? <Button onClick={handleInstall}>Baixar e instalar</Button> : null}
          </CardContent>
        </Card>
        <ReleaseReadinessPanel snapshot={readiness} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ReleaseCommandPanel items={commands} />
        <ReleaseChecklistPanel items={checklist} />
      </div>
      <ReleaseLanesPanel items={lanes} />
      <ReleaseArtifactsPanel items={artifacts} />
    </div>
  );
}
