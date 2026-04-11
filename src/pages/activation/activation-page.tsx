import { Cloud, KeyRound, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCloudEndpointLabel, getCloudModeLabel, isCloudApiConfigured, SUPPORT_WHATSAPP } from "@/config/app";
import brandLogo from "@/assets/brand-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { licenseService } from "@/services/license/license.service";
import { useLicenseStore } from "@/stores/license-store";

export default function ActivationPage() {
  const navigate = useNavigate();
  const setSnapshot = useLicenseStore((s) => s.setSnapshot);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await licenseService.activateWithKey(key.trim());
    setLoading(false);
    if (result.ok && result.storePatch) {
      setSnapshot(result.storePatch);
      navigate("/dashboard", { replace: true });
    } else {
      setMessage(result.message ?? "Não foi possível ativar. Verifique a chave.");
    }
  }

  async function handleLocalMode() {
    setLoading(true);
    setMessage(null);
    await licenseService.enableLocalMode();
    setLoading(false);
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <img alt="Smart Tech PDV" className="h-28 w-auto object-contain drop-shadow-[0_18px_32px_rgba(15,23,42,0.14)]" src={brandLogo} />
          <div>
            <p className="font-display text-2xl font-semibold text-slate-50">Ativação da loja</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Uma instalação, uma loja e um banco local. A nuvem cuida da licença quando estiver pronta, sem impedir o cliente de trabalhar offline no PC.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {[
            { label: "Modelo", value: "1 instalação", helper: "Um PC, uma loja, uma base local", icon: KeyRound },
            { label: "Operação", value: "Offline primeiro", helper: "Continua vendendo mesmo sem internet", icon: WifiOff },
            { label: "Cloud", value: getCloudModeLabel(), helper: isCloudApiConfigured() ? "Ativação pronta para rollout" : "Modo local liberado", icon: Cloud },
            { label: "Suporte", value: SUPPORT_WHATSAPP, helper: "Contato principal para ativação assistida", icon: ShieldCheck }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card className="executive-panel" key={item.label}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="font-display text-[26px] font-semibold text-slate-50">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.helper}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="surface-rule shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Chave de ativação</CardTitle>
                  <CardDescription>Cole a chave enviada pelo painel cloud quando o endpoint público estiver pronto.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={onSubmit}>
                <Input
                  autoComplete="off"
                  className="h-12 rounded-2xl border-border/80 bg-white text-base"
                  onChange={(ev) => setKey(ev.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={key}
                />
                {message ? <p className="text-sm text-destructive">{message}</p> : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button className="h-12 rounded-2xl text-base font-semibold" disabled={loading || !isCloudApiConfigured()} type="submit">
                    {loading ? "Validando..." : "Ativar instalação"}
                  </Button>
                  <Button className="h-12 rounded-2xl text-base font-semibold" disabled={loading} onClick={handleLocalMode} type="button" variant="outline">
                    <WifiOff className="h-4 w-4" />
                    Entrar em modo local
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="surface-rule shadow-card">
              <CardContent className="flex gap-3 p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-slate-50">Modo offline seguro</p>
                  <p className="mt-1">Após validar online, o PDV continua operando sem internet dentro da janela de tolerância configurada no plano.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-rule shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Cloud e rollout</CardTitle>
                <CardDescription>Leitura atual do endpoint de licença e sincronização.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="premium-tile rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-sky-700" />
                    <p className="text-sm font-semibold text-slate-50">{getCloudModeLabel()}</p>
                  </div>
                  <p className="mt-2 break-all text-sm text-muted-foreground">{getCloudEndpointLabel()}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
                  {!isCloudApiConfigured()
                    ? "Sem endpoint cloud configurado. O melhor caminho agora é usar o modo local para o cliente começar a trabalhar e publicar a nuvem depois."
                    : "Com endpoint público e release assinada, o fluxo de ativação fica pronto para venda em escala."}
                </div>
              </CardContent>
            </Card>

            <Card className="surface-rule shadow-card">
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-medium text-slate-50">Suporte</p>
                <p className="mt-2">Ativação assistida, ajuste de endpoint e rollout final podem ser conduzidos pelo suporte. Contato principal: {SUPPORT_WHATSAPP}.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
