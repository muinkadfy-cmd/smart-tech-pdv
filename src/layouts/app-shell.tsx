import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import logoMark from "@/assets/logo-mark.svg";
import { AppStatusBar } from "@/components/shared/app-status-bar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { applyAppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/routes/navigation";
import { preloadRoute, warmupPrimaryRoutes } from "@/routes/route-preload";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useLicenseStore } from "@/stores/license-store";
import { useSyncStore } from "@/stores/sync-store";

const groupedNavigation = navigationItems.reduce<Record<string, typeof navigationItems>>((accumulator, item) => {
  accumulator[item.group] ??= [];
  accumulator[item.group].push(item);
  return accumulator;
}, {});

function getLicenseBadge(planLabel: string, licenseStatus: string) {
  if (licenseStatus === "unknown") {
    return {
      label: "Modo local · offline pronto",
      variant: "outline" as const
    };
  }

  if (licenseStatus === "active") {
    return {
      label: `${planLabel} · ativa`,
      variant: "success" as const
    };
  }

  if (licenseStatus === "grace") {
    return {
      label: `${planLabel} · grace offline`,
      variant: "warning" as const
    };
  }

  return {
    label: `${planLabel} · expirada`,
    variant: "destructive" as const
  };
}

export function AppShell() {
  const location = useLocation();
  const sidebarCollapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar);
  const online = useNetworkStatus();
  const licenseStatus = useLicenseStore((state) => state.status);
  const planLabel = useLicenseStore((state) => state.planLabel);
  const syncPending = useSyncStore((state) => state.pendingCount);
  const syncSyncing = useSyncStore((state) => state.isSyncing);
  const { data: settings } = useSettingsSnapshot();

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long"
      }),
    []
  );

  const licenseBadge = getLicenseBadge(planLabel, licenseStatus);

  useEffect(() => {
    void syncQueueService.refreshPendingCount();
    warmupPrimaryRoutes();
  }, []);

  useEffect(() => {
    applyAppTheme(settings?.theme);
  }, [settings?.theme]);

  return (
    <div className="app-shell-grid min-h-screen bg-transparent lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
        <aside
          className={cn(
            "shell-sidebar hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-glow lg:flex lg:h-screen lg:flex-col lg:overflow-hidden",
            sidebarCollapsed ? "lg:w-[96px]" : "lg:w-[278px]"
          )}
        >
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <img alt="Smart Tech" className="h-10 w-10 shrink-0 rounded-2xl bg-white/5 p-2" src={logoMark} />
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-semibold text-white">Smart Tech PDV</p>
                  <p className="truncate text-[11px] uppercase tracking-[0.22em] text-slate-400">Moda e calçados</p>
                </div>
              ) : null}
            </div>
            <Button className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={toggleSidebar} size="icon" variant="ghost">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="native-scroll scrollbar-hidden flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              {Object.entries(groupedNavigation).map(([group, items]) => (
                <div className="space-y-2.5" key={group}>
                  {!sidebarCollapsed ? (
                    <p className="shell-section-label px-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">{group}</p>
                  ) : null}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon as typeof Settings2;
                      return (
                        <NavLink
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-[18px] border px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                              isActive
                                ? "border-sky-400/18 bg-sidebar-accent text-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14),0_14px_24px_-22px_rgba(96,165,250,0.65)]"
                                : "border-transparent text-slate-300 hover:border-white/8 hover:bg-white/5 hover:text-white",
                              sidebarCollapsed && "justify-center px-0"
                            )
                          }
                          key={item.path}
                          onFocus={() => void preloadRoute(item.path)}
                          onMouseEnter={() => void preloadRoute(item.path)}
                          to={item.path}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          {!sidebarCollapsed ? (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.badge ? (
                                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-sky-200">
                                  {item.badge}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {!sidebarCollapsed ? (
            <div className="border-t border-white/5 px-4 py-3">
              <div className="flex items-center justify-between gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] text-slate-400">
                <div className="flex min-w-0 items-center gap-2">
                  {online ? <Cloud className="h-3.5 w-3.5 text-emerald-300" /> : <WifiOff className="h-3.5 w-3.5 text-amber-300" />}
                  <span className="truncate">{online ? "Conectado" : "Modo offline"}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 text-sky-300" />
                  <span className="truncate">Fila {syncPending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
                  <span>Local</span>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
          <header className="glass-panel sticky top-0 z-30 border-b border-border/75 px-4 py-3 sm:px-5 lg:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="context-strip flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-4 py-2.5 xl:min-w-[360px] xl:max-w-[520px]">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  className="min-w-0 h-auto flex-1 border-0 bg-transparent p-0 shadow-none focus:ring-0"
                  placeholder="Busque produto, setor, pedido, cliente ou atalho"
                />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <div className="rounded-[18px] border border-white/70 bg-white/92 px-3.5 py-2 text-[13px] capitalize text-slate-600 shadow-card">
                  {todayLabel}
                </div>
                <Link className={cn(buttonVariants({ size: "default" }), "shadow-card")} to="/pdv">
                  <ShoppingCart className="h-4 w-4" />
                  Nova venda
                </Link>
                <Badge className="max-w-[220px] truncate px-3 py-1.5" variant={licenseBadge.variant}>
                  {licenseBadge.label}
                </Badge>
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "items-center gap-2")}
                  title="Detalhes de sincronização"
                  to="/licenca-sincronizacao"
                >
                  <Cloud className="h-4 w-4" />
                  {online ? "Sync" : "Offline"}
                  {syncPending > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                      {syncPending}
                    </span>
                  ) : null}
                  {syncSyncing ? <span className="text-[11px] text-muted-foreground">enviando...</span> : null}
                </Link>
                <Button size="icon" variant="outline">
                  <Bell className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3 rounded-[18px] border border-white/70 bg-white/92 px-3.5 py-2 shadow-card">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">ST</div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-950">Operador master</p>
                    <p className="text-[11px] text-slate-600">Administrador</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="native-scroll scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6">
            <div className="content-stage content-stage-strong min-h-full px-5 py-5 sm:px-6 sm:py-6">
              <Outlet />
            </div>
          </main>
          <AppStatusBar />
        </div>
      </div>
    </div>
  );
}
