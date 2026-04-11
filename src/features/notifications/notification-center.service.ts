import type { FinancialEntry, Order, SettingsSnapshot, StockSnapshot, UpdateCheckState } from "@/types/domain";
import type { LicenseStatus } from "@/stores/license-store";

export interface NotificationCenterItem {
  id: string;
  title: string;
  description: string;
  tone: "success" | "warning" | "error" | "info";
  path: string;
  actionLabel: string;
}

interface NotificationContext {
  settings?: SettingsSnapshot | null;
  updaterState?: UpdateCheckState;
  stockSnapshot?: StockSnapshot | null;
  orders?: Order[] | null;
  financialEntries?: FinancialEntry[] | null;
  syncPending?: number;
  syncOnline?: boolean;
  syncError?: string | null;
  licenseStatus?: LicenseStatus;
}

function isEnabled(value: string | undefined) {
  return value !== "off";
}

export function buildNotificationCenterItems(context: NotificationContext): NotificationCenterItem[] {
  const items: NotificationCenterItem[] = [];
  const settings = context.settings;
  const orders = context.orders ?? [];
  const financialEntries = context.financialEntries ?? [];
  const updaterState = context.updaterState;
  const shouldAlwaysWarnAboutUpdates = updaterState?.status === "available" || updaterState?.status === "installed";

  if (shouldAlwaysWarnAboutUpdates || isEnabled(settings?.notifyUpdates)) {
    if (updaterState?.status === "available" && updaterState.version) {
      items.push({
        id: `notification-update-available-${updaterState.version}`,
        title: `Nova versão ${updaterState.version} pronta`,
        description: "Existe um pacote novo pronto para baixar, instalar e reiniciar com segurança.",
        tone: "success",
        path: "/atualizacoes",
        actionLabel: "Instalar agora"
      });
    } else if (updaterState?.status === "installed") {
      items.push({
        id: `notification-update-installed-${updaterState.version ?? "pendente"}`,
        title: "Atualização aguardando conclusão",
        description: "O lote já foi preparado. Feche e reabra o app para concluir a troca de versão.",
        tone: "info",
        path: "/atualizacoes",
        actionLabel: "Concluir atualização"
      });
    } else if (updaterState?.status === "error") {
      items.push({
        id: `notification-update-error-${updaterState.checkedAt ?? "agora"}`,
        title: "Falha ao validar atualizações",
        description: updaterState.details ?? updaterState.message,
        tone: "warning",
        path: "/atualizacoes",
        actionLabel: "Revisar updater"
      });
    }
  }

  if (isEnabled(settings?.notifyLowStock) && context.stockSnapshot && context.stockSnapshot.lowStockCount > 0) {
    items.push({
      id: "notification-low-stock",
      title: `${context.stockSnapshot.lowStockCount} item(ns) com estoque baixo`,
      description: "Reposição, compra ou ajuste de grade merecem prioridade para não travar venda no balcão.",
      tone: context.stockSnapshot.lowStockCount >= 4 ? "error" : "warning",
      path: "/estoque",
      actionLabel: "Abrir estoque"
    });
  }

  if (isEnabled(settings?.notifyOrders) && orders.length > 0) {
    const readyOrders = orders.filter((order) => order.status === "pronto");
    const pendingOrders = orders.filter((order) => order.status === "novo" || order.status === "em separacao");

    if (readyOrders.length > 0) {
      items.push({
        id: "notification-orders-ready",
        title: `${readyOrders.length} pedido(s) pronto(s) para liberar`,
        description: "Há pedidos que já podem sair para retirada, entrega ou confirmação com o cliente.",
        tone: "success",
        path: "/pedidos",
        actionLabel: "Liberar pedidos"
      });
    } else if (pendingOrders.length >= 3) {
      items.push({
        id: "notification-orders-queue",
        title: `${pendingOrders.length} pedido(s) pedem andamento`,
        description: "A fila operacional merece triagem para não deixar separação e conferências acumularem no turno.",
        tone: "warning",
        path: "/pedidos",
        actionLabel: "Organizar fila"
      });
    }
  }

  if (isEnabled(settings?.notifyFinance) && financialEntries.length > 0) {
    const overdueEntries = financialEntries.filter((entry) => entry.status === "atrasado");

    if (overdueEntries.length > 0) {
      items.push({
        id: "notification-finance-overdue",
        title: `${overdueEntries.length} título(s) em atraso`,
        description: "Cobranças e renegociações estão pedindo ação do financeiro para não contaminar o caixa.",
        tone: "error",
        path: "/financeiro",
        actionLabel: "Abrir financeiro"
      });
    }
  }

  if (isEnabled(settings?.notifySync)) {
    if (context.syncError) {
      items.push({
        id: "notification-sync-error",
        title: "Fila de sync com falha",
        description: context.syncError,
        tone: "error",
        path: "/licenca-sincronizacao",
        actionLabel: "Revisar sync"
      });
    } else if (context.syncOnline === false) {
      items.push({
        id: "notification-sync-offline",
        title: "Sync em modo offline",
        description: "O sistema continua operando localmente, mas a fila cloud só volta a drenar quando a rede retornar.",
        tone: "warning",
        path: "/licenca-sincronizacao",
        actionLabel: "Ver status"
      });
    } else if ((context.syncPending ?? 0) > 0) {
      items.push({
        id: "notification-sync-pending",
        title: `${context.syncPending} evento(s) aguardando envio`,
        description: "Existe fila pendente pronta para sincronizar assim que a rotina rodar novamente.",
        tone: "info",
        path: "/licenca-sincronizacao",
        actionLabel: "Sincronizar agora"
      });
    }

    if (context.licenseStatus === "grace" || context.licenseStatus === "expired" || context.licenseStatus === "unknown") {
      items.push({
        id: "notification-license-review",
        title: "Licença merece revisão",
        description: "A governança da instalação precisa de conferência para evitar surpresa em rollout, grace ou expiração.",
        tone: context.licenseStatus === "expired" ? "error" : "warning",
        path: "/licenca-sincronizacao",
        actionLabel: "Revisar licença"
      });
    }
  }

  const priority = { error: 0, warning: 1, success: 2, info: 3 } as const;
  return items.sort((left, right) => priority[left.tone] - priority[right.tone]).slice(0, 8);
}
