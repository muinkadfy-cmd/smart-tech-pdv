import { LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import brandLogo from "@/assets/brand-logo.png";
import { APP_NAME, isSupabaseConfigured, SUPPORT_WHATSAPP } from "@/config/app";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { supabaseAuthService } from "@/services/auth/supabase-auth.service";
import { useAuthStore } from "@/stores/auth-store";

interface LoginLocationState {
  from?: string;
  reason?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const online = useNetworkStatus();
  const authError = useAuthStore((state) => state.lastError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const state = (location.state ?? {}) as LoginLocationState;
  const configured = isSupabaseConfigured();
  const targetPath = typeof state.from === "string" && state.from.startsWith("/") ? state.from : "/dashboard";

  const helperMessage = useMemo(() => {
    if (state.reason === "license-expired") {
      return "Sua licença expirou. Entre novamente com uma conta ativa.";
    }

    if (!online) {
      return "Conecte a internet para fazer o primeiro login.";
    }

    if (!configured) {
      return "Configure o Supabase para liberar o login desta instalação.";
    }

    return authError;
  }, [authError, configured, online, state.reason]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await supabaseAuthService.signInWithPassword(email, password);
      navigate(targetPath, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar com essa conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen login-screen--minimal min-h-screen overflow-hidden px-4 py-6">
      <div className="login-screen__noise" />
      <div className="login-screen__glow login-screen__glow--left" />
      <div className="login-screen__glow login-screen__glow--right" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1180px] items-center justify-center">
        <Card className="login-card-minimal w-full max-w-[460px] rounded-[30px] border-[rgba(214,190,142,0.12)] bg-[linear-gradient(180deg,rgba(19,23,31,0.98),rgba(11,14,20,0.99))] shadow-[0_34px_68px_-34px_rgba(0,0,0,0.88)]">
          <CardContent className="p-7 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-3 shadow-[0_18px_36px_-28px_rgba(0,0,0,0.72)]">
                <img alt={APP_NAME} className="h-14 w-14 object-contain" src={brandLogo} />
              </div>
              <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-white">Entrar no {APP_NAME}</h1>
              <p className="mt-2 max-w-[320px] text-[14px] leading-6 text-slate-400">Acesse sua conta para continuar a operação da loja.</p>
            </div>

            <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(214,190,142,0.78)]">E-mail</p>
                <Input
                  autoComplete="email"
                  className="h-12 rounded-[16px] text-[15px]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="operacao@loja.com"
                  type="email"
                  value={email}
                />
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(214,190,142,0.78)]">Senha</p>
                <Input
                  autoComplete="current-password"
                  className="h-12 rounded-[16px] text-[15px]"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  type="password"
                  value={password}
                />
              </div>

              {helperMessage ? (
                <div className="rounded-[16px] border border-[rgba(214,190,142,0.12)] bg-[rgba(39,28,17,0.32)] px-4 py-3 text-sm leading-6 text-[#f1dfb7]">
                  {helperMessage}
                </div>
              ) : null}

              {message ? (
                <div className="rounded-[16px] border border-rose-300/14 bg-rose-950/20 px-4 py-3 text-sm leading-6 text-rose-100">
                  {message}
                </div>
              ) : null}

              <Button className="h-12 w-full rounded-[16px] text-[15px]" disabled={loading || !configured || !online} type="submit">
                <LockKeyhole className="h-4 w-4" />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-[12px] text-slate-500">Pacotes suportados: Trial 15 dias e Licença permanente.</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[13px] text-slate-400">
              <Link className="transition hover:text-slate-200" to="/ativacao">
                Ativação legada
              </Link>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <a className="transition hover:text-slate-200" href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`} rel="noreferrer" target="_blank">
                Falar com suporte
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
