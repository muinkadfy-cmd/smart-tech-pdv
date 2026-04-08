import { useEffect, useState } from "react";
import { APP_UPDATER_ENDPOINT } from "@/config/app";
import { buildReleaseArtifacts, buildReleaseChecklist } from "@/features/updates/updates.service";
import { getReleaseReadinessSnapshot, type ReleaseReadinessSnapshot } from "@/features/updates/release-readiness.service";
import { ReleaseArtifactsPanel } from "@/components/updates/release-artifacts-panel";
import { ReleaseChecklistPanel } from "@/components/updates/release-checklist-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentVersion } from "@/hooks/use-current-version";
import { checkForUpdates, installAvailableUpdate } from "@/services/updater.service";
import type { UpdateCheckState } from "@/types/domain";

const initialState: UpdateCheckState = {
  status: "idle",
  message: "Pronto para consultar o latest.json do canal configurado."
};

export default function UpdatesPage() {
  const version = useCurrentVersion();
  const [state, setState] = useState<UpdateCheckState>(initialState);
  const [readiness, setReadiness] = useState<ReleaseReadinessSnapshot | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const checklist = buildReleaseChecklist();
  const artifacts = buildReleaseArtifacts();

  useEffect(() => {
    void (async () => {
      setLoadingReadiness(true);
      try {
        setReadiness(await getReleaseReadinessSnapshot());
      } finally {
        setLoadingReadiness(false);
      }
    })();
  }, []);

  async function handleCheck() {
    setState({ status: "checking", message: "Verificando nova versao..." });
    const result = await checkForUpdates();
    setState(result);
    setReadiness(await getReleaseReadinessSnapshot());
  }

  async function handleInstall() {
    await installAvailableUpdate();
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={<Button onClick={() => void handleCheck()}>Verificar atualizacao</Button>}
        badge="Updater Tauri v2 preparado"
        description="Painel de release com leitura de prontidao para empacotar, publicar e vender com mais seguranca."
        eyebrow="Atualizacoes"
        title="Pipeline de release e updater"
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="text-sm text-muted-foreground">Versao atual</p>
              <p className="mt-2 font-display text-4xl font-semibold text-slate-950">{version}</p>
            </div>
            <div className="rounded-2xl bg-secondary/45 p-4">
              <p className="text-sm text-muted-foreground">Endpoint</p>
              <p className="mt-2 break-all text-sm font-medium text-slate-950">{APP_UPDATER_ENDPOINT}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={state.status === "available" ? "success" : state.status === "error" ? "destructive" : "outline"}>
                {state.status}
              </Badge>
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
            {state.status === "available" ? <Button onClick={() => void handleInstall()}>Baixar e instalar</Button> : null}
          </CardContent>
        </Card>

        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Prontidao do release</p>
                <p className="mt-2 text-4xl font-semibold text-slate-950">
                  {loadingReadiness ? "..." : `${readiness?.score ?? 0}%`}
                </p>
              </div>
              <Badge variant={(readiness?.score ?? 0) >= 85 ? "success" : (readiness?.score ?? 0) >= 60 ? "warning" : "destructive"}>
                {(readiness?.score ?? 0) >= 85 ? "Quase pronto" : (readiness?.score ?? 0) >= 60 ? "Intermediario" : "Bloqueado"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {loadingReadiness ? "Executando leitura local do pipeline..." : readiness?.headline}
            </p>
            <div className="space-y-3">
              {(readiness?.checks ?? []).map((check) => (
                <div className="rounded-2xl bg-secondary/45 p-4" key={check.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{check.label}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{check.helper}</p>
                    </div>
                    <Badge variant={check.ok ? "success" : "warning"}>{check.ok ? "OK" : "Ajustar"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ReleaseChecklistPanel items={checklist} />
        <ReleaseArtifactsPanel items={artifacts} />
      </div>
    </div>
  );
}
