import { Clock3, Cloud, DatabaseZap, WifiOff } from "lucide-react";
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
    "/relatorios": "Relatorios",
    "/financeiro": "Financeiro",
    "/configuracoes": "Configuracoes",
    "/licenca-sincronizacao": "Licenca e sync",
    "/backup": "Backup",
    "/impressao": "Impressao",
    "/atualizacoes": "Atualizacoes",
    "/diagnostico": "Diagnostico"
  };
  return map[pathname] ?? "Sistema";
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
    <div className="border-t border-border/90 bg-white/92 px-4 py-2 shadow-[0_-10px_26px_rgba(15,23,42,0.06)] backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge className="px-2 py-0.5" variant="outline">
            <DatabaseZap className="mr-1 h-3.5 w-3.5" />
            SQLite local pronto
          </Badge>
          <Badge className="px-2 py-0.5" variant={online ? "success" : "secondary"}>
            {online ? <Cloud className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
            {online ? "Conectado" : "Offline"}
          </Badge>
          <span>Area atual: <strong className="text-slate-900">{getSectionLabel(location.pathname)}</strong></span>
          <span>Fila pendente: <strong className="text-slate-900">{pendingCount}</strong>{syncing ? " · enviando" : ""}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span>Licenca: <strong className="text-slate-900">{licenseStatus === "unknown" ? "local" : licenseStatus}</strong></span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {nowLabel}</span>
        </div>
      </div>
    </div>
  );
}
