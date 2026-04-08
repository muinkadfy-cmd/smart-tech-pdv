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
  { label: "Painel", path: "/dashboard", group: "Operacao", icon: LayoutDashboard },
  { label: "Produtos", path: "/produtos", group: "Operacao", icon: PackageSearch },
  { label: "Estoque", path: "/estoque", group: "Operacao", icon: Boxes },
  { label: "PDV", path: "/pdv", group: "Operacao", icon: ShoppingCart, badge: "F2" },
  { label: "Pedidos", path: "/pedidos", group: "Operacao", icon: ClipboardList },
  { label: "Clientes", path: "/clientes", group: "Cadastros", icon: Users },
  { label: "Fornecedores", path: "/fornecedores", group: "Cadastros", icon: Truck },
  { label: "Compras", path: "/compras", group: "Gestao", icon: ShoppingBag },
  { label: "Relatorios", path: "/relatorios", group: "Gestao", icon: BarChart3 },
  { label: "Financeiro", path: "/financeiro", group: "Gestao", icon: WalletCards },
  { label: "Configuracoes", path: "/configuracoes", group: "Sistema", icon: Settings },
  { label: "Licenca e sync", path: "/licenca-sincronizacao", group: "Sistema", icon: Cloud },
  { label: "Backup", path: "/backup", group: "Sistema", icon: HardDrive },
  { label: "Impressao", path: "/impressao", group: "Sistema", icon: Printer },
  { label: "Atualizacoes", path: "/atualizacoes", group: "Sistema", icon: RefreshCcw },
  { label: "Diagnostico", path: "/diagnostico", group: "Sistema", icon: Activity }
];
