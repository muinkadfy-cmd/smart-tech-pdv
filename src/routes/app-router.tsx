import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, useLocation, useRoutes } from "react-router-dom";
import { PageLoader } from "@/components/shared/page-loader";
import { RouteErrorBoundary } from "@/components/shared/route-error-boundary";
import { AppShell } from "@/layouts/app-shell";
import { routeImporters } from "@/routes/route-preload";

const DashboardPage = lazy(routeImporters["/dashboard"]);
const ProductsPage = lazy(routeImporters["/produtos"]);
const StockPage = lazy(routeImporters["/estoque"]);
const PdvPage = lazy(routeImporters["/pdv"]);
const OrdersPage = lazy(routeImporters["/pedidos"]);
const CustomersPage = lazy(routeImporters["/clientes"]);
const SuppliersPage = lazy(routeImporters["/fornecedores"]);
const PurchasesPage = lazy(routeImporters["/compras"]);
const ReportsPage = lazy(routeImporters["/relatorios"]);
const FinancePage = lazy(routeImporters["/financeiro"]);
const SettingsPage = lazy(routeImporters["/configuracoes"]);
const PrintingPage = lazy(routeImporters["/impressao"]);
const UpdatesPage = lazy(routeImporters["/atualizacoes"]);
const DiagnosticsPage = lazy(routeImporters["/diagnostico"]);
const ActivationPage = lazy(routeImporters["/ativacao"]);
const LicenseSyncPage = lazy(routeImporters["/licenca-sincronizacao"]);
const BackupPage = lazy(routeImporters["/backup"]);
const NotFoundPage = lazy(routeImporters["*"]);

function AppRoutes() {
  return useRoutes([
    { path: "/ativacao", element: <ActivationPage /> },
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate replace to="/dashboard" /> },
        { path: "/dashboard", element: <DashboardPage /> },
        { path: "/produtos", element: <ProductsPage /> },
        { path: "/estoque", element: <StockPage /> },
        { path: "/pdv", element: <PdvPage /> },
        { path: "/pedidos", element: <OrdersPage /> },
        { path: "/clientes", element: <CustomersPage /> },
        { path: "/fornecedores", element: <SuppliersPage /> },
        { path: "/compras", element: <PurchasesPage /> },
        { path: "/relatorios", element: <ReportsPage /> },
        { path: "/financeiro", element: <FinancePage /> },
        { path: "/configuracoes", element: <SettingsPage /> },
        { path: "/licenca-sincronizacao", element: <LicenseSyncPage /> },
        { path: "/backup", element: <BackupPage /> },
        { path: "/impressao", element: <PrintingPage /> },
        { path: "/atualizacoes", element: <UpdatesPage /> },
        { path: "/diagnostico", element: <DiagnosticsPage /> }
      ]
    },
    {
      path: "*",
      element: <NotFoundPage />
    }
  ]);
}

function AppRouterContent() {
  const location = useLocation();

  return (
    <RouteErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageLoader />}>
        <AppRoutes />
      </Suspense>
    </RouteErrorBoundary>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRouterContent />
    </BrowserRouter>
  );
}
