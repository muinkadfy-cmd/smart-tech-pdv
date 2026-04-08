import { Cloud, KeyRound, ShieldCheck, WifiOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCloudEndpointLabel, getCloudModeLabel, isCloudApiConfigured, SUPPORT_WHATSAPP } from "@/config/app";
import logoMark from "@/assets/logo-mark.svg";
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
      setMessage(result.message ?? "Nao foi possivel ativar. Verifique a chave.");
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
          <img alt="" className="h-14 w-14 rounded-2xl bg-white/80 p-2 shadow-card" src={logoMark} />
          <div>
            <p className="font-display text-2xl font-semibold text-slate-950">Ativacao da loja</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Uma instalacao, uma loja e um banco local. A nuvem cuida da licenca quando estiver pronta, sem impedir o cliente de trabalhar offline no PC.
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-white/80 bg-white/95 shadow-card">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Chave de ativacao</CardTitle>
                  <CardDescription>Cole a chave enviada pelo painel cloud quando o endpoint publico estiver pronto.</CardDescription>
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
                    {loading ? "Validando..." : "Ativar instalacao"}
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
            <Card className="border-white/80 bg-white/90 shadow-card">
              <CardContent className="flex gap-3 p-5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-slate-900">Modo offline seguro</p>
                  <p className="mt-1">Apos validar online, o PDV continua operando sem internet dentro da janela de tolerancia configurada no plano.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90 shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Cloud e rollout</CardTitle>
                <CardDescription>Leitura atual do endpoint de licenca e sincronizacao.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl bg-secondary/45 p-4">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-sky-700" />
                    <p className="text-sm font-semibold text-slate-950">{getCloudModeLabel()}</p>
                  </div>
                  <p className="mt-2 break-all text-sm text-muted-foreground">{getCloudEndpointLabel()}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-muted-foreground">
                  {!isCloudApiConfigured()
                    ? "Sem endpoint cloud configurado. O melhor caminho agora e usar o modo local para o cliente comecar a trabalhar e publicar a nuvem depois."
                    : "Com endpoint publico e release assinada, o fluxo de ativacao fica pronto para venda em escala."}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90 shadow-card">
              <CardContent className="p-5 text-sm text-muted-foreground">
                <p className="font-medium text-slate-900">Suporte</p>
                <p className="mt-2">Ativacao assistida, ajuste de endpoint e rollout final podem ser conduzidos pelo suporte. Contato principal: {SUPPORT_WHATSAPP}.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
