import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  Cloud,
  HardDrive,
  LayoutDashboard,
  PackageSearch,
  Printer,
  RefreshCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  WalletCards
} from "lucide-react";
import type { NavItem } from "@/types/domain";

export const navigationItems: NavItem[] = [
  { label: "Painel", path: "/dashboard", group: "Operação", icon: LayoutDashboard },
  { label: "Produtos", path: "/produtos", group: "Operação", icon: PackageSearch, badge: "F3" },
  { label: "Estoque", path: "/estoque", group: "Operação", icon: Boxes },
  { label: "PDV", path: "/pdv", group: "Operação", icon: ShoppingCart },
  { label: "Pedidos", path: "/pedidos", group: "Operação", icon: ClipboardList },
  { label: "Clientes", path: "/clientes", group: "Cadastros", icon: Users, badge: "F5" },
  { label: "Fornecedores", path: "/fornecedores", group: "Cadastros", icon: Truck, minRole: "admin" },
  { label: "Compras", path: "/compras", group: "Gestão", icon: ShoppingBag, minRole: "admin" },
  { label: "Relatórios", path: "/relatorios", group: "Gestão", icon: BarChart3, minRole: "admin" },
  { label: "Financeiro", path: "/financeiro", group: "Gestão", icon: WalletCards, minRole: "admin" },
  { label: "Configurações", path: "/configuracoes", group: "Sistema", icon: Settings, minRole: "admin" },
  { label: "Licença e sincronização", path: "/licenca-sincronizacao", group: "Sistema", icon: Cloud, minRole: "super_admin" },
  { label: "Backup", path: "/backup", group: "Sistema", icon: HardDrive, minRole: "super_admin" },
  { label: "Impressão", path: "/impressao", group: "Sistema", icon: Printer, minRole: "admin" },
  { label: "Atualizações", path: "/atualizacoes", group: "Sistema", icon: RefreshCcw, minRole: "super_admin" },
  { label: "Diagnóstico", path: "/diagnostico", group: "Sistema", icon: Activity, minRole: "super_admin" }
];
