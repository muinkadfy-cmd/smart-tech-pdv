import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, useLocation, useRoutes } from "react-router-dom";
import { AuthProtectedRoute } from "@/auth/auth-protected-route";
import { PublicAuthRoute } from "@/auth/public-auth-route";
import { RoleProtectedRoute } from "@/auth/role-protected-route";
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
const LoginPage = lazy(routeImporters["/login"]);
const ActivationPage = lazy(routeImporters["/ativacao"]);
const LicenseSyncPage = lazy(routeImporters["/licenca-sincronizacao"]);
const BackupPage = lazy(routeImporters["/backup"]);
const NotFoundPage = lazy(routeImporters["*"]);

function AppRoutes() {
  return useRoutes([
    { path: "/login", element: <PublicAuthRoute><LoginPage /></PublicAuthRoute> },
    { path: "/ativacao", element: <ActivationPage /> },
    {
      path: "/",
      element: <AuthProtectedRoute><AppShell /></AuthProtectedRoute>,
      children: [
        { index: true, element: <Navigate replace to="/dashboard" /> },
        { path: "/dashboard", element: <DashboardPage /> },
        { path: "/produtos", element: <ProductsPage /> },
        { path: "/estoque", element: <StockPage /> },
        { path: "/pdv", element: <PdvPage /> },
        { path: "/pedidos", element: <OrdersPage /> },
        { path: "/clientes", element: <CustomersPage /> },
        { path: "/fornecedores", element: <RoleProtectedRoute minRole="admin"><SuppliersPage /></RoleProtectedRoute> },
        { path: "/compras", element: <RoleProtectedRoute minRole="admin"><PurchasesPage /></RoleProtectedRoute> },
        { path: "/relatorios", element: <RoleProtectedRoute minRole="admin"><ReportsPage /></RoleProtectedRoute> },
        { path: "/financeiro", element: <RoleProtectedRoute minRole="admin"><FinancePage /></RoleProtectedRoute> },
        { path: "/configuracoes", element: <RoleProtectedRoute minRole="admin"><SettingsPage /></RoleProtectedRoute> },
        { path: "/licenca-sincronizacao", element: <RoleProtectedRoute minRole="super_admin"><LicenseSyncPage /></RoleProtectedRoute> },
        { path: "/backup", element: <RoleProtectedRoute minRole="super_admin"><BackupPage /></RoleProtectedRoute> },
        { path: "/impressao", element: <RoleProtectedRoute minRole="admin"><PrintingPage /></RoleProtectedRoute> },
        { path: "/atualizacoes", element: <RoleProtectedRoute minRole="super_admin"><UpdatesPage /></RoleProtectedRoute> },
        { path: "/diagnostico", element: <RoleProtectedRoute minRole="super_admin"><DiagnosticsPage /></RoleProtectedRoute> }
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
