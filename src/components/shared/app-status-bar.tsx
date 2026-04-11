import { Activity, Clock3, Cloud, DatabaseZap, ShieldCheck, WifiOff } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useLicenseStore } from "@/stores/license-store";
import { useSyncStore } from "@/stores/sync-store";

function getSectionLabel(pathname: string) {
  const map: Record<string, string> = {
    "/dashboard": "Painel",
    "/produtos": "Produtos",
    "/estoque": "Estoque",
    "/pdv": "PDV",
    "/pedidos": "Pedidos",
    "/clientes": "Clientes",
    "/fornecedores": "Fornecedores",
    "/compras": "Compras",
    "/relatorios": "Relatórios",
    "/financeiro": "Financeiro",
    "/configuracoes": "Configurações",
    "/licenca-sincronizacao": "Licença e sincronização",
    "/backup": "Backup",
    "/impressao": "Impressão",
    "/atualizacoes": "Atualizações",
    "/diagnostico": "Diagnóstico"
  };
  return map[pathname] ?? "Sistema";
}

function getLicenseLabel(licenseStatus: string) {
  switch (licenseStatus) {
    case "active":
      return "Licença ativa";
    case "grace":
      return "Janela offline";
    case "expired":
      return "Licença expirada";
    default:
      return "Modo local";
  }
}

export function AppStatusBar() {
  const location = useLocation();
  const online = useNetworkStatus();
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const syncing = useSyncStore((state) => state.isSyncing);
  const licenseStatus = useLicenseStore((state) => state.status);
  const nowLabel = useMemo(
    () =>
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    [location.pathname]
  );

  return (
    <div className="app-status-surface border-t border-[rgba(201,168,111,0.12)] px-4 py-2 sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-[12px] text-slate-300">
        <div className="app-status-primary flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Badge className="px-2.5 py-1" variant="outline">
            <DatabaseZap className="mr-1.5 h-3.5 w-3.5" />
            Base local pronta
          </Badge>
          <Badge className="px-2.5 py-1" variant={online ? "success" : "warning"}>
            {online ? <Cloud className="mr-1.5 h-3.5 w-3.5" /> : <WifiOff className="mr-1.5 h-3.5 w-3.5" />}
            {online ? "Cloud disponível" : "Offline"}
          </Badge>
          <Badge className="px-2.5 py-1" variant={syncing ? "warning" : pendingCount > 0 ? "outline" : "secondary"}>
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            {syncing ? "Sincronizando" : pendingCount > 0 ? `${pendingCount} na fila` : "Fila em dia"}
          </Badge>
          <span className="app-status-section-chip rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] tracking-[0.01em] text-slate-300">
            Área atual: <strong className="text-slate-100">{getSectionLabel(location.pathname)}</strong>
          </span>
        </div>
        <div className="app-status-secondary flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-[#e7d3a7]" />
            <strong className="text-slate-100">{getLicenseLabel(licenseStatus)}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-slate-300">
            <Clock3 className="h-3.5 w-3.5" />
            {nowLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
