const routeImporters = {
  "/dashboard": () => import("@/pages/dashboard/dashboard-page"),
  "/produtos": () => import("@/pages/products/products-page"),
  "/estoque": () => import("@/pages/stock/stock-page"),
  "/pdv": () => import("@/pages/pdv/pdv-page"),
  "/pedidos": () => import("@/pages/orders/orders-page"),
  "/clientes": () => import("@/pages/customers/customers-page"),
  "/fornecedores": () => import("@/pages/suppliers/suppliers-page"),
  "/compras": () => import("@/pages/purchases/purchases-page"),
  "/relatorios": () => import("@/pages/reports/reports-page"),
  "/financeiro": () => import("@/pages/finance/finance-page"),
  "/configuracoes": () => import("@/pages/settings/settings-page"),
  "/licenca-sincronizacao": () => import("@/pages/system/license-sync-page"),
  "/backup": () => import("@/pages/system/backup-page"),
  "/impressao": () => import("@/pages/printing/printing-page"),
  "/atualizacoes": () => import("@/pages/updates/updates-page"),
  "/diagnostico": () => import("@/pages/diagnostics/diagnostics-page"),
  "/login": () => import("@/pages/auth/login-page"),
  "/ativacao": () => import("@/pages/activation/activation-page"),
  "*": () => import("@/pages/not-found-page")
} as const;

export function preloadRoute(path: string) {
  const importer = routeImporters[path as keyof typeof routeImporters];
  if (!importer) {
    return Promise.resolve();
  }
  return importer().then(() => undefined);
}

export function warmupPrimaryRoutes() {
  const primaryRoutes = ["/dashboard", "/produtos", "/estoque", "/pdv", "/pedidos", "/clientes"];
  const preload = () => {
    void Promise.all(primaryRoutes.map((path) => preloadRoute(path)));
  };

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const requestIdleCallback = window.requestIdleCallback as (callback: IdleRequestCallback) => number;
    requestIdleCallback(() => preload());
    return;
  }

  setTimeout(preload, 180);
}

export { routeImporters };
