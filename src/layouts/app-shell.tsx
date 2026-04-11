import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Cloud,
  HardDrive,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  WifiOff
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppStatusBar } from "@/components/shared/app-status-bar";
import { OperationAlertCenter } from "@/components/shared/operation-alert-center";
import { CustomerQuickRegisterOverlay } from "@/components/customers/customer-quick-register-overlay";
import { ProductQuickRegisterOverlay } from "@/components/products/product-quick-register-overlay";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFinancialEntries, useOrders, useSettingsSnapshot, useStockSnapshot } from "@/hooks/use-app-data";
import {
  filterNavigationItemsForProfile,
  getDefaultRole,
  getDefaultUserProfile,
  getRoleLabel,
  hasActionAccessForProfile,
  hasRoleAccess,
  resolveActiveLocalUserProfile
} from "@/lib/access-control";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { applyAppTheme } from "@/lib/theme";
import { finalizeInstalledUpdate } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { navigationItems } from "@/routes/navigation";
import { preloadRoute, warmupPrimaryRoutes } from "@/routes/route-preload";
import { recordAuditEntry, setAuditActorContext } from "@/services/audit/audit-log.service";
import { supabaseAuthService } from "@/services/auth/supabase-auth.service";
import { syncQueueService } from "@/services/sync/sync-queue.service";
import { useAuthStore } from "@/stores/auth-store";
import { useAppShellStore } from "@/stores/app-shell-store";
import { useLicenseStore } from "@/stores/license-store";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { usePdvStore } from "@/stores/pdv-store";
import { useSyncStore } from "@/stores/sync-store";
import { useUpdaterStore } from "@/stores/updater-store";
import { buildNotificationCenterItems } from "@/features/notifications/notification-center.service";

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
      label: `${planLabel} · carência offline`,
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
  const navigate = useNavigate();
  const sidebarCollapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar);
  const openProductQuickRegister = useAppShellStore((state) => state.openProductQuickRegister);
  const openCustomerQuickRegister = useAppShellStore((state) => state.openCustomerQuickRegister);
  const online = useNetworkStatus();
  const authSession = useAuthStore((state) => state.session);
  const licenseStatus = useLicenseStore((state) => state.status);
  const planLabel = useLicenseStore((state) => state.planLabel);
  const syncPending = useSyncStore((state) => state.pendingCount);
  const syncSyncing = useSyncStore((state) => state.isSyncing);
  const syncError = useSyncStore((state) => state.lastError);
  const updateState = useUpdaterStore((state) => state.state);
  const updateBannerVisible = useUpdaterStore((state) => state.bannerVisible);
  const forceUpdateRequired = useUpdaterStore((state) => state.forceUpdateRequired);
  const forcedUpdateVersion = useUpdaterStore((state) => state.forcedUpdateVersion);
  const dismissUpdateBanner = useUpdaterStore((state) => state.dismissBanner);
  const showUpdateBanner = useUpdaterStore((state) => state.showBanner);
  const checkUpdatesNow = useUpdaterStore((state) => state.checkNow);
  const installUpdateNow = useUpdaterStore((state) => state.installNow);
  const installBusy = useUpdaterStore((state) => state.installBusy);
  const readNotificationIds = useNotificationCenterStore((state) => state.readIds);
  const markNotificationAsRead = useNotificationCenterStore((state) => state.markAsRead);
  const markAllNotificationsAsRead = useNotificationCenterStore((state) => state.markAllAsRead);
  const clearStaleReadNotifications = useNotificationCenterStore((state) => state.clearReadIds);
  const cart = usePdvStore((state) => state.cart);
  const { data: settings } = useSettingsSnapshot();
  const { data: stockSnapshot } = useStockSnapshot();
  const { data: orders } = useOrders();
  const { data: financialEntries } = useFinancialEntries();
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [userSwitcherOpen, setUserSwitcherOpen] = useState(false);
  const [pendingSwitchUserId, setPendingSwitchUserId] = useState<string | null>(null);
  const [switchPinInput, setSwitchPinInput] = useState("");
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [viewportDensity, setViewportDensity] = useState<"regular" | "compact" | "condensed">("regular");
  const defaultUserProfile = getDefaultUserProfile();
  const currentRole = settings?.currentUserRole ?? getDefaultRole();
  const currentUserName = settings?.currentUserName ?? defaultUserProfile.currentUserName;
  const activeLocalUser = useMemo(
    () => (settings ? resolveActiveLocalUserProfile(settings.localUsers, settings.activeLocalUserId) : null),
    [settings]
  );
  const allowedNavigationItems = useMemo(
    () => filterNavigationItemsForProfile(navigationItems, activeLocalUser, currentRole),
    [activeLocalUser, currentRole]
  );
  const groupedNavigation = useMemo(() => {
    return allowedNavigationItems.reduce<Record<string, typeof navigationItems>>((accumulator, item) => {
      accumulator[item.group] ??= [];
      accumulator[item.group].push(item);
      return accumulator;
    }, {});
  }, [allowedNavigationItems]);
  const allowedNavigationPaths = useMemo(() => new Set(allowedNavigationItems.map((item) => item.path)), [allowedNavigationItems]);

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
  const cartItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const canSwitchUsers = hasActionAccessForProfile(activeLocalUser, "user_switch", currentRole);
  const canOpenCustomers = allowedNavigationPaths.has("/clientes");
  const canOpenSettings = allowedNavigationPaths.has("/configuracoes");
  const cloudUserName = authSession?.user.fullName ?? currentUserName;
  const cloudAccountLabel =
    authSession?.user.licensePackage === "permanent" ? "Licença permanente" : authSession?.user.licensePackage === "trial_15d" ? "Trial 15 dias" : null;

  async function handleSwitchLocalUser(userId: string) {
    if (!settings) {
      return;
    }

    const nextUser = settings.localUsers.find((user) => user.id === userId && user.status === "active");
    if (!nextUser) {
      return;
    }

    const requiredPin = nextUser.pin?.trim() ?? "";
    if (requiredPin) {
      if (pendingSwitchUserId !== userId) {
        setPendingSwitchUserId(userId);
        setSwitchPinInput("");
        setSwitchError(null);
        return;
      }

      if (switchPinInput.trim() !== requiredPin) {
        setSwitchError("PIN inválido para esse perfil local.");
        return;
      }
    }

    recordAuditEntry({
      area: "Configuracoes",
      action: "Troca de usuário local",
      details: `Instalação alternada de ${currentUserName} para ${nextUser.name}.`
    });

    await appRepository.updateSettings({
      ...settings,
      activeLocalUserId: nextUser.id,
      currentUserName: nextUser.name,
      currentUserRole: nextUser.role
    });
    window.location.reload();
  }

  useEffect(() => {
    void syncQueueService.refreshPendingCount();
    warmupPrimaryRoutes();
  }, []);

  useEffect(() => {
    function resolveViewportDensity() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 1280 || height <= 720) {
        return "condensed" as const;
      }

      if (width <= 1440 || height <= 820) {
        return "compact" as const;
      }

      return "regular" as const;
    }

    function applyViewportDensity() {
      const nextDensity = resolveViewportDensity();
      setViewportDensity(nextDensity);
      document.documentElement.dataset.uiDensity = nextDensity;
    }

    applyViewportDensity();
    window.addEventListener("resize", applyViewportDensity);

    return () => {
      window.removeEventListener("resize", applyViewportDensity);
      delete document.documentElement.dataset.uiDensity;
    };
  }, []);

  useEffect(() => {
    applyAppTheme(settings?.theme);
  }, [settings?.theme]);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setAuditActorContext({
      actorName: settings.currentUserName,
      actorRole: getRoleLabel(settings.currentUserRole),
      actorUserId: settings.activeLocalUserId
    });
  }, [settings]);

  useEffect(() => {
    setNotificationPanelOpen(false);
    setUserSwitcherOpen(false);
    setPendingSwitchUserId(null);
    setSwitchPinInput("");
    setSwitchError(null);
  }, [location.pathname]);

  useEffect(() => {
    function handleGlobalShortcuts(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (event.key === "F3") {
        if (!hasActionAccessForProfile(activeLocalUser, "catalog_manage", currentRole)) {
          return;
        }
        event.preventDefault();
        openProductQuickRegister();
        return;
      }

      if (event.key === "F5") {
        if (!canOpenCustomers) {
          return;
        }
        event.preventDefault();
        openCustomerQuickRegister();
      }
    }

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [activeLocalUser, canOpenCustomers, currentRole, openProductQuickRegister, openCustomerQuickRegister]);

  const notificationItems = useMemo(
    () =>
      buildNotificationCenterItems({
        settings,
        updaterState: updateState,
        stockSnapshot,
        orders,
        financialEntries,
        syncPending,
        syncOnline: online,
        syncError,
        licenseStatus
      }),
    [settings, updateState, stockSnapshot, orders, financialEntries, syncPending, online, syncError, licenseStatus]
  );
  const unreadNotificationItems = useMemo(
    () => notificationItems.filter((item) => !readNotificationIds.includes(item.id)),
    [notificationItems, readNotificationIds]
  );
  const notificationCount = unreadNotificationItems.length;
  const hasCriticalNotification = unreadNotificationItems.some((item) => item.tone === "error");

  useEffect(() => {
    clearStaleReadNotifications(notificationItems.map((item) => item.id));
  }, [clearStaleReadNotifications, notificationItems]);

  const updateBannerTone =
    updateState.status === "error"
      ? "system-alert--error"
      : updateState.status === "installed"
        ? "system-alert--success"
        : "system-alert--info";

  const updateBannerTitle =
    updateState.status === "installed"
      ? forceUpdateRequired
        ? "Atualização obrigatória pronta para concluir"
        : "Atualização pronta para concluir a instalação"
      : updateState.status === "latest"
        ? "Esta instalação já está atualizada"
        : updateState.status === "error"
          ? forceUpdateRequired
            ? "A instalação obrigatória falhou"
            : "Não foi possível validar a nova atualização"
          : forceUpdateRequired
            ? "Atualização obrigatória encontrada"
            : "Nova atualização pronta para esta instalação";
  const compactViewport = viewportDensity !== "regular";
  const condensedViewport = viewportDensity === "condensed";

  return (
    <div className="app-shell-grid app-shell-root min-h-screen bg-transparent lg:h-screen lg:overflow-hidden" data-viewport-density={viewportDensity}>
      <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
        <aside
          className={cn(
            "shell-sidebar shell-sidebar-frame hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-glow lg:flex lg:h-screen lg:flex-col lg:overflow-hidden",
            sidebarCollapsed ? (condensedViewport ? "lg:w-[84px]" : "lg:w-[92px]") : compactViewport ? "lg:w-[248px]" : "lg:w-[278px]"
          )}
        >
          <div className={cn("shell-sidebar-header flex items-center justify-between border-b border-white/5", compactViewport ? "px-3 py-3" : "px-4 py-4")}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={cn("shell-brand-badge flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_-20px_rgba(0,0,0,0.45)]", sidebarCollapsed ? "h-9 w-9 text-sm font-semibold" : compactViewport ? "h-9 w-9 text-[13px] font-bold" : "h-10 w-10 text-[14px] font-bold")}>
                ST
              </div>
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <p className={cn("truncate font-semibold tracking-[-0.02em] text-white", compactViewport ? "text-[15px]" : "text-[17px]")}>Smart Tech PDV</p>
                  <p className="truncate text-[10px] uppercase tracking-[0.24em] text-slate-400">Operação comercial premium</p>
                </div>
              ) : null}
            </div>
            <Button className="text-slate-300 hover:bg-white/10 hover:text-white" onClick={toggleSidebar} size="icon" variant="ghost">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className={cn("native-scroll scrollbar-hidden flex-1 overflow-y-auto", compactViewport ? "px-2.5 py-3" : "px-3 py-4")}>
            <div className={cn(compactViewport ? "space-y-4" : "space-y-6")}>
              {Object.entries(groupedNavigation).map(([group, items]) => (
                <div className={cn(compactViewport ? "space-y-2" : "space-y-2.5")} key={group}>
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
                              "shell-nav-item flex items-center gap-3 border font-medium transition-all duration-200",
                              compactViewport ? "rounded-[16px] px-3 py-2 text-[13px]" : "rounded-[18px] px-3 py-2.5 text-[14px]",
                              isActive
                                ? "border-white/12 bg-white/[0.07] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_28px_-24px_rgba(0,0,0,0.48)]"
                                : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
                              sidebarCollapsed && "justify-center px-0"
                            )
                          }
                          key={item.path}
                          onFocus={() => void preloadRoute(item.path)}
                          onMouseEnter={() => void preloadRoute(item.path)}
                          to={item.path}
                        >
                          <Icon className={cn("shrink-0", compactViewport ? "h-4 w-4" : "h-[18px] w-[18px]")} />
                          {!sidebarCollapsed ? (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.badge ? (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-200">
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
            <div className={cn("border-t border-white/5", compactViewport ? "px-3 py-2.5" : "px-4 py-3")}>
              <div className={cn("shell-sidebar-footer flex items-center justify-between gap-2 rounded-[18px] border border-white/8 bg-black/10 text-[11px] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]", compactViewport ? "px-2.5 py-2" : "px-3 py-2.5")}>
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
          <header className={cn("glass-panel shell-topbar sticky top-0 z-30 border-b border-slate-500/12", compactViewport ? "px-3 py-2 sm:px-4 lg:px-5" : "px-4 py-2.5 sm:px-5 lg:px-6")}>
            <div className={cn("shell-topbar-row flex flex-wrap items-center justify-end", compactViewport ? "gap-2" : "gap-2.5")}>
              <div className={cn("theme-preview-card shell-toolbar-chip border border-[rgba(201,168,111,0.12)] px-3.5 py-2 text-[13px] capitalize text-slate-300", compactViewport && "hidden")}>
                {todayLabel}
              </div>
              {allowedNavigationPaths.has("/pdv") ? (
                <>
                  <Link className={cn(buttonVariants({ size: compactViewport ? "sm" : "default" }), "shadow-card shell-toolbar-primary")} to="/pdv">
                    <ShoppingCart className="h-4 w-4" />
                    Nova venda
                  </Link>
                  <Badge className={cn("gap-2 border-[rgba(201,168,111,0.16)] bg-[rgba(34,39,49,0.9)] text-slate-100", compactViewport ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5")} variant="outline">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Carrinho
                    <span className="rounded-full border border-[rgba(214,190,142,0.18)] bg-[rgba(214,190,142,0.12)] px-2 py-0.5 text-[11px] font-semibold text-[#f4e6c8]">
                      {cartItemsCount}
                    </span>
                  </Badge>
                </>
              ) : null}
              <Badge className={cn("truncate", compactViewport ? "max-w-[180px] px-2.5 py-1 text-[11px]" : "max-w-[220px] px-3 py-1.5")} variant={licenseBadge.variant}>
                {licenseBadge.label}
              </Badge>
              {hasRoleAccess(currentRole, "super_admin") ? (
                <Link
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "items-center gap-2 shell-toolbar-chip")}
                  title="Detalhes de sincronização"
                  to="/licenca-sincronizacao"
                >
                  <Cloud className="h-4 w-4" />
                  {compactViewport ? (online ? "Sync" : "Offline") : online ? "Sincronizar" : "Offline"}
                  {syncPending > 0 ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                      {syncPending}
                    </span>
                  ) : null}
                  {syncSyncing && !compactViewport ? <span className="text-[11px] text-muted-foreground">enviando...</span> : null}
                </Link>
              ) : null}
              <div className="relative">
                <Button
                  className="relative"
                  onClick={() => {
                    setNotificationPanelOpen((current) => !current);
                    if (updateState.status === "idle" || updateState.status === "checking") {
                      void checkUpdatesNow("manual");
                    }
                  }}
                  size="icon"
                  variant="outline"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 ? (
                    <span
                      className={cn(
                        "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ring-2 ring-white",
                        hasCriticalNotification ? "bg-rose-500" : updateState.status === "available" ? "bg-emerald-500" : "bg-sky-500"
                      )}
                    >
                      {notificationCount}
                    </span>
                  ) : null}
                </Button>
                {notificationPanelOpen ? (
                  <div className={cn("shell-flyout absolute right-0 top-[calc(100%+10px)] z-40 rounded-[24px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(34,38,46,0.98),rgba(22,26,33,0.98))] p-4 shadow-[0_34px_60px_-30px_rgba(0,0,0,0.58)] backdrop-blur", compactViewport ? "w-[340px]" : "w-[380px]")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-50">Central de alertas</p>
                        <p className="mt-1 text-[12px] text-slate-400">
                          {notificationCount > 0 ? `${notificationCount} alerta(s) relevantes para o turno.` : "Nenhum alerta crítico ativo agora."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadNotificationItems.length > 0 ? (
                          <Button onClick={() => markAllNotificationsAsRead(unreadNotificationItems.map((item) => item.id))} size="sm" variant="outline">
                            Ler tudo
                          </Button>
                        ) : null}
                        {canOpenSettings ? <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/configuracoes">Ajustar</Link> : null}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {unreadNotificationItems.length > 0 ? (
                        unreadNotificationItems.map((item) => {
                          const isRead = false;
                          return (
                            <div className={cn("premium-tile rounded-[18px] p-3.5", isRead && "opacity-65")} key={item.id}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-[13px] font-semibold text-slate-50">{item.title}</p>
                                    <Badge variant={item.tone === "success" ? "success" : item.tone === "error" ? "destructive" : item.tone === "warning" ? "warning" : "outline"}>
                                      {item.tone === "success" ? "ação pronta" : item.tone === "error" ? "crítico" : item.tone === "warning" ? "atenção" : "informativo"}
                                    </Badge>
                                  </div>
                                  <p className="mt-2 text-[12px] leading-5 text-slate-400">{item.description}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <Link
                                  className={buttonVariants({ size: "sm" })}
                                  onClick={() => {
                                    markNotificationAsRead(item.id);
                                    setNotificationPanelOpen(false);
                                    if (item.path === "/atualizacoes" && updateState.status !== "idle" && updateState.status !== "checking") {
                                      showUpdateBanner();
                                    }
                                  }}
                                  to={item.path}
                                >
                                  {item.actionLabel}
                                </Link>
                                {!isRead ? (
                                  <Button onClick={() => markNotificationAsRead(item.id)} size="sm" variant="outline">
                                    Marcar como lido
                                  </Button>
                                ) : (
                                  <Badge variant="outline">Lido</Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="premium-tile rounded-[18px] p-4">
                          <p className="text-[13px] font-semibold text-slate-50">Turno sem pendências críticas</p>
                          <p className="mt-2 text-[12px] leading-5 text-slate-400">
                            O sistema continua monitorando atualização, estoque, pedidos, financeiro e sincronização. O que já foi lido sai da fila para não acumular no sino.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <Button onClick={() => void checkUpdatesNow("manual")} size="sm" variant="outline">
                              Verificar atualizações
                            </Button>
                            {canOpenSettings ? <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/configuracoes">Configurar alertas</Link> : null}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative">
                <button
                  className={cn("theme-preview-card shell-user-chip border border-[rgba(201,168,111,0.12)] flex items-center gap-3 text-left", compactViewport ? "px-3 py-1.5" : "px-3.5 py-2")}
                  onClick={() => (canSwitchUsers || authSession) && setUserSwitcherOpen((current) => !current)}
                  title={canSwitchUsers ? "Trocar usuário local ou revisar a conta cloud" : authSession ? "Revisar a conta cloud" : "Este perfil não pode trocar o usuário ativo"}
                  type="button"
                >
                  <div className={cn("flex items-center justify-center rounded-2xl border border-[rgba(201,168,111,0.16)] bg-[linear-gradient(180deg,rgba(18,21,28,1),rgba(10,13,19,1))] text-sm font-semibold text-[#f4e6c8] shadow-[0_16px_28px_-22px_rgba(0,0,0,0.55)]", compactViewport ? "h-8 w-8" : "h-9 w-9")}>ST</div>
                  <div className="min-w-0">
                    <p className={cn("truncate font-semibold text-slate-50", compactViewport ? "text-[12px]" : "text-[13px]")}>{cloudUserName}</p>
                    <p className="truncate text-[11px] text-slate-400">{authSession?.user.email ?? getRoleLabel(currentRole)}</p>
                  </div>
                </button>
                {userSwitcherOpen && settings ? (
                  <div className={cn("shell-flyout absolute right-0 top-[calc(100%+10px)] z-40 rounded-[24px] border border-[rgba(201,168,111,0.14)] bg-[linear-gradient(180deg,rgba(34,38,46,0.98),rgba(22,26,33,0.98))] p-4 shadow-[0_34px_60px_-30px_rgba(0,0,0,0.58)] backdrop-blur", compactViewport ? "w-[300px]" : "w-[320px]")}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold text-slate-50">Troca rápida de usuário</p>
                        <p className="mt-1 text-[12px] text-slate-400">Perfis locais ativos nesta instalação offline.</p>
                      </div>
                      {canOpenSettings ? <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/configuracoes">Gerenciar</Link> : null}
                    </div>
                    <div className="mt-4 space-y-3">
                      {settings.localUsers.filter((user) => user.status === "active").map((user) => (
                        <div
                          className={cn(
                            "rounded-[18px] border px-3 py-3 transition",
                            settings.activeLocalUserId === user.id
                              ? "border-[rgba(201,168,111,0.28)] bg-[rgba(201,168,111,0.08)]"
                              : "border-white/8 bg-white/[0.03]"
                          )}
                          key={user.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-semibold text-slate-50">{user.name}</p>
                              <p className="mt-1 text-[11px] text-slate-400">{getRoleLabel(user.role)}{user.pin?.trim() ? " • PIN" : ""}</p>
                            </div>
                            {settings.activeLocalUserId === user.id ? (
                              <Badge variant="success">Ativo</Badge>
                            ) : (
                              <Button onClick={() => void handleSwitchLocalUser(user.id)} size="sm" type="button" variant="outline">
                                {pendingSwitchUserId === user.id && user.pin?.trim() ? "Validar PIN" : "Trocar"}
                              </Button>
                            )}
                          </div>
                          {pendingSwitchUserId === user.id && user.pin?.trim() ? (
                            <div className="mt-3 space-y-2">
                              <input
                                className="h-10 w-full rounded-xl border border-white/10 bg-black/10 px-3 text-sm text-slate-100 outline-none transition focus:border-[rgba(201,168,111,0.28)]"
                                inputMode="numeric"
                                maxLength={8}
                                onChange={(event) => setSwitchPinInput(event.target.value)}
                                placeholder="Digite o PIN para confirmar"
                                type="password"
                                value={switchPinInput}
                              />
                              {switchError ? <p className="text-[12px] text-rose-200">{switchError}</p> : null}
                              <div className="flex gap-2">
                                <Button onClick={() => void handleSwitchLocalUser(user.id)} size="sm" type="button">
                                  Confirmar troca
                                </Button>
                                <Button
                                  onClick={() => {
                                    setPendingSwitchUserId(null);
                                    setSwitchPinInput("");
                                    setSwitchError(null);
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {authSession ? (
                      <div className="mt-4 rounded-[18px] border border-[rgba(201,168,111,0.14)] bg-[rgba(255,255,255,0.03)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-semibold text-slate-50">Conta conectada</p>
                            <p className="mt-1 text-[12px] text-slate-200">{authSession.user.fullName}</p>
                            <p className="mt-1 text-[11px] text-slate-400">{authSession.user.email}</p>
                          </div>
                          {cloudAccountLabel ? <Badge variant="outline">{cloudAccountLabel}</Badge> : null}
                        </div>
                        <p className="mt-3 text-[11px] leading-5 text-slate-400">
                          Se quiser usar outra conta, saia da sessão atual e o sistema volta para a tela de login.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            onClick={() => {
                              void (async () => {
                                await supabaseAuthService.signOut();
                                setUserSwitcherOpen(false);
                                navigate("/login", { replace: true });
                              })();
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Sair da conta
                          </Button>
                          <Button
                            onClick={() => {
                              void (async () => {
                                await supabaseAuthService.signOut();
                                setUserSwitcherOpen(false);
                                navigate("/login", { replace: true, state: { from: "/dashboard" } });
                              })();
                            }}
                            size="sm"
                            type="button"
                          >
                            Entrar com outra
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {updateBannerVisible ? (
              <div className={cn(compactViewport ? "mt-2.5" : "mt-3")}>
                <div className={cn("system-alert flex flex-col gap-3 rounded-[22px] lg:flex-row lg:items-center lg:justify-between", compactViewport ? "px-3 py-2.5" : "px-4 py-3", updateBannerTone)}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{updateBannerTitle}</p>
                      {updateState.version ? <Badge variant="outline">v{updateState.version}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm opacity-90">{updateState.message}</p>
                    {updateState.details ? <p className="mt-1 text-[12px] opacity-80">{updateState.details}</p> : null}
                    {updateState.checkedAt ? (
                      <p className="mt-1 text-[11px] opacity-75">Última verificação: {new Date(updateState.checkedAt).toLocaleString("pt-BR")}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {updateState.status === "available" ? (
                      <Button disabled={installBusy} onClick={() => void installUpdateNow()} size="sm">
                        {installBusy ? "Instalando..." : "Instalar agora"}
                      </Button>
                    ) : null}
                    {updateState.status === "installed" ? (
                      <Button onClick={() => void finalizeInstalledUpdate()} size="sm">
                        Fechar para concluir
                      </Button>
                    ) : null}
                    <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/atualizacoes">
                      Ver detalhes
                    </Link>
                    {!forceUpdateRequired ? (
                      <Button onClick={dismissUpdateBanner} size="sm" variant="outline">
                        {updateState.status === "installed" || updateState.status === "available" ? "Lembrar depois" : updateState.status === "latest" ? "Fechar" : "Agora não"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </header>

          <main className={cn("native-scroll scrollbar-hidden min-h-0 flex-1 overflow-y-auto", compactViewport ? "px-3 py-3 sm:px-4 lg:px-5" : "px-4 py-4 sm:px-5 lg:px-6")}>
            <div className={cn("content-stage content-stage-strong min-h-full", compactViewport ? "px-3.5 py-3.5 sm:px-4 sm:py-4" : "px-4 py-4 sm:px-5 sm:py-5")}>
              <Outlet />
            </div>
          </main>
          <AppStatusBar />
        </div>
      </div>
      <ProductQuickRegisterOverlay />
      <CustomerQuickRegisterOverlay />
      <OperationAlertCenter />
      {forceUpdateRequired ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[150] flex justify-center px-4 pt-4">
            <div className="system-alert system-alert--warning flex w-full max-w-[980px] flex-col gap-3 rounded-[24px] border border-[rgba(201,168,111,0.24)] px-4 py-3 shadow-[0_28px_60px_-32px_rgba(0,0,0,0.72)] lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">
                    {updateState.status === "installed"
                      ? "Atualização obrigatória pronta para concluir"
                      : updateState.status === "installing"
                        ? "Instalando atualização obrigatória"
                        : updateState.status === "error"
                          ? "Falha na instalação obrigatória"
                          : "Atualização obrigatória detectada"}
                  </p>
                  {forcedUpdateVersion ? <Badge variant="outline">v{forcedUpdateVersion}</Badge> : null}
                </div>
                <p className="mt-1 text-sm opacity-90">
                  {updateState.status === "installed"
                    ? "Feche e reabra o app agora para liberar o sistema."
                    : updateState.status === "error"
                      ? "O sistema segue bloqueado até a instalação obrigatória ser concluída."
                      : "O sistema foi bloqueado e precisa concluir a atualização antes de continuar."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {updateState.status === "installed" ? (
                  <Button onClick={() => void finalizeInstalledUpdate()} size="sm">
                    Fechar para concluir
                  </Button>
                ) : (
                  <Button disabled={installBusy || updateState.status === "installing"} onClick={() => void installUpdateNow()} size="sm">
                    {installBusy || updateState.status === "installing" ? "Instalando..." : updateState.status === "error" ? "Tentar novamente" : "Instalar agora"}
                  </Button>
                )}
                <Link className={buttonVariants({ size: "sm", variant: "outline" })} to="/atualizacoes">
                  Ver detalhes
                </Link>
              </div>
            </div>
          </div>
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[rgba(6,8,12,0.72)] p-4 pt-28 backdrop-blur-md">
          <div className="w-full max-w-[640px] rounded-[28px] border border-[rgba(201,168,111,0.2)] bg-[linear-gradient(180deg,rgba(28,32,40,0.98),rgba(17,20,27,0.98))] p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant="warning">Atualização obrigatória</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-slate-50">
                  {updateState.status === "installed"
                    ? "Reinicie para concluir a atualização obrigatória"
                    : updateState.status === "installing"
                      ? "Instalando atualização obrigatória"
                      : updateState.status === "error"
                        ? "Falha ao instalar a atualização obrigatória"
                        : "Uma nova versão precisa ser instalada agora"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {updateState.details ??
                    "Por regra de operação, esta instalação fica bloqueada até concluir a atualização. Isso evita que o usuário continue trabalhando em uma versão desatualizada."}
                </p>
              </div>
              {forcedUpdateVersion ? <Badge variant="outline">v{forcedUpdateVersion}</Badge> : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="premium-tile rounded-[20px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">
                  {updateState.status === "available"
                    ? "Preparando instalação"
                    : updateState.status === "installing"
                      ? "Baixando pacote"
                      : updateState.status === "installed"
                        ? "Pronto para reiniciar"
                        : "Tentativa necessária"}
                </p>
              </div>
              <div className="premium-tile rounded-[20px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Uso do sistema</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">Bloqueado</p>
              </div>
              <div className="premium-tile rounded-[20px] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Ação obrigatória</p>
                <p className="mt-2 text-lg font-semibold text-slate-50">
                  {updateState.status === "installed" ? "Fechar e reabrir" : "Instalar agora"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {updateState.status === "installed" ? (
                <Button onClick={() => void finalizeInstalledUpdate()} size="lg">
                  Fechar para concluir
                </Button>
              ) : (
                <Button disabled={installBusy || updateState.status === "installing"} onClick={() => void installUpdateNow()} size="lg">
                  {installBusy || updateState.status === "installing" ? "Instalando..." : updateState.status === "error" ? "Tentar instalar novamente" : "Instalar atualização obrigatória"}
                </Button>
              )}
              <Link className={buttonVariants({ size: "lg", variant: "outline" })} to="/atualizacoes">
                Abrir painel de atualização
              </Link>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-400">
              O sistema não libera navegação, vendas ou cadastros enquanto a atualização obrigatória não for instalada e concluída.
            </p>
          </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
