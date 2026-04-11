import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Landmark, Search, Wallet2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  buildCashSnapshot,
  buildFinanceAging,
  buildFinanceOperationalSummary,
  buildFinanceReconciliationQueue,
  buildFinanceSummary,
  filterFinanceEntries,
  getFinanceReference
} from "@/features/finance/finance.service";
import { CashSnapshotPanel } from "@/components/finance/cash-snapshot-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { FinanceAgingList } from "@/components/finance/finance-aging-list";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { ResultLimitControl } from "@/components/shared/result-limit-control";
import { FinanceSummaryCards } from "@/components/finance/finance-summary-cards";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFinancialEntries } from "@/hooks/use-app-data";
import { confirmAction } from "@/lib/confirm-action";
import { formatCurrency, formatDate } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { recordAuditEntry } from "@/services/audit/audit-log.service";
import type { FinancialEntryCreateInput } from "@/types/domain";

interface FinanceRouteState {
  query?: string;
  draft?: Partial<FinancialEntryCreateInput>;
  feedback?: string;
}

function getFinanceStatusLabel(status: "aberto" | "pago" | "atrasado") {
  if (status === "pago") return "Pago";
  if (status === "atrasado") return "Atrasado";
  return "Aberto";
}

function getFinanceTypeLabel(type: "receber" | "pagar") {
  return type === "receber" ? "Conta a receber" : "Conta a pagar";
}

function getFinanceQueueToneLabel(tone: "default" | "warning" | "destructive" | "success") {
  if (tone === "destructive") return "Crítico";
  if (tone === "warning") return "Atenção";
  if (tone === "success") return "Conciliado";
  return "Na fila";
}

function createEmptyEntryDraft(): FinancialEntryCreateInput {
  const today = new Date();
  const dueAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);

  return {
    type: "receber",
    description: "",
    amount: 0,
    status: "aberto",
    dueAt: dueAt.toISOString()
  };
}

function toMiddayIso(dateValue: string, fallback: string) {
  if (!dateValue) {
    return fallback;
  }

  const nextDate = new Date(`${dateValue}T12:00:00`);
  return Number.isNaN(nextDate.getTime()) ? fallback : nextDate.toISOString();
}

export default function FinancePage() {
  const FINANCE_BASE_LIMIT = 6;
  const FINANCE_STEP = 6;
  const location = useLocation();
  const { data, loading, reload } = useFinancialEntries();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<Record<string, string>>({});
  const [entryDraft, setEntryDraft] = useState<FinancialEntryCreateInput>(() => createEmptyEntryDraft());
  const [visibleEntryCount, setVisibleEntryCount] = useState(FINANCE_BASE_LIMIT);
  const entries = data ?? [];

  const filteredEntries = useMemo(() => {
    const base = filterFinanceEntries(entries, type, status);
    const normalizedQuery = query.trim().toLowerCase();
    return base.filter((entry) => normalizedQuery.length === 0 || [entry.description, entry.type, entry.status].join(" ").toLowerCase().includes(normalizedQuery));
  }, [entries, query, status, type]);
  const cards = useMemo(() => buildFinanceSummary(filteredEntries), [filteredEntries]);
  const aging = useMemo(() => buildFinanceAging(filteredEntries), [filteredEntries]);
  const snapshot = useMemo(() => buildCashSnapshot(entries), [entries]);
  const operationalSummary = useMemo(() => buildFinanceOperationalSummary(entries), [entries]);
  const reconciliationQueue = useMemo(() => buildFinanceReconciliationQueue(filteredEntries), [filteredEntries]);
  const overdueEntries = useMemo(() => filteredEntries.filter((entry) => entry.status === "atrasado"), [filteredEntries]);
  const agendaToday = useMemo(() => filteredEntries.slice().sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()).slice(0, 5), [filteredEntries]);
  const netFlow = useMemo(() => filteredEntries.reduce((sum, entry) => sum + (entry.type === "receber" ? entry.amount : -entry.amount), 0), [filteredEntries]);
  const visibleEntries = useMemo(() => filteredEntries.slice(0, visibleEntryCount), [filteredEntries, visibleEntryCount]);
  const entriesPaidCount = useMemo(() => filteredEntries.filter((entry) => entry.status === "pago").length, [filteredEntries]);
  const financeOverview = useMemo(
    () => [
      {
        label: "Fluxo líquido",
        value: formatCurrency(netFlow),
        helper: netFlow >= 0 ? "Recorte atual saudável para o caixa." : "Recorte atual pressionando o caixa.",
        icon: Wallet2,
      },
      {
        label: "Atrasos prioritários",
        value: `${overdueEntries.length}`,
        helper: overdueEntries.length > 0 ? "Há títulos precisando ação imediata." : "Sem atraso crítico no momento.",
        icon: AlertTriangle,
      },
      {
        label: "Agenda do dia",
        value: `${agendaToday.length}`,
        helper: agendaToday.length > 0 ? "Títulos filtrados para atacar primeiro." : "Nenhum título urgente no filtro atual.",
        icon: Landmark,
      },
      {
        label: "Conciliações prontas",
        value: `${entriesPaidCount}`,
        helper: `${filteredEntries.length} lançamento(s) no recorte atual.`,
        icon: Wallet2,
      }
    ],
    [agendaToday.length, entriesPaidCount, filteredEntries.length, netFlow, overdueEntries.length]
  );

  useEffect(() => {
    setVisibleEntryCount(FINANCE_BASE_LIMIT);
  }, [type, status, query, entries.length]);

  useEffect(() => {
    const routeState = location.state as FinanceRouteState | null;
    if (!routeState) {
      return;
    }

    if (routeState.query) {
      setQuery(routeState.query);
    }

    if (routeState.draft) {
      setEntryDraft((current) => ({
        ...current,
        ...routeState.draft
      }));
    }

    if (routeState.feedback) {
      setFeedback(routeState.feedback);
    }
  }, [location.state]);

  async function handleCopyFinanceAction(entry: (typeof filteredEntries)[number]) {
    const payload = `${entry.description} • ${formatCurrency(entry.amount)} • vencimento ${formatDate(entry.dueAt)} • status ${entry.status}`;
    try {
      await navigator.clipboard.writeText(payload);
      recordAuditEntry({
        area: "Financeiro",
        action: entry.type === "receber" ? "Cobrança preparada" : "Pagamento preparado",
        details: `${entry.description} foi preparado para ação financeira com vencimento em ${formatDate(entry.dueAt)}.`
      });
      setFeedback(`${entry.type === "receber" ? "Cobrança" : "Pagamento"} preparado para ${entry.description}.`);
    } catch {
      setFeedback(`Não foi possível preparar a ação para ${entry.description}.`);
    }
  }

  async function handleFinanceStatus(entryId: string, nextStatus: (typeof entries)[number]["status"]) {
    const confirmed = confirmAction(
      nextStatus === "pago"
        ? `Marcar esse lançamento como pago/recebido? A baixa será registrada na auditoria local.`
        : `Reabrir esse lançamento para voltar ao fluxo financeiro?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateFinancialEntry(entryId, { status: nextStatus });
      reload();
      setFeedback(`Lançamento ${entryId} atualizado para ${getFinanceStatusLabel(nextStatus)}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o lançamento.");
    }
  }

  async function handleFinanceDueDate(entryId: string) {
    const nextDueDate = editingDueDate[entryId];
    if (!nextDueDate) {
      return;
    }

    const confirmed = confirmAction(`Atualizar o vencimento desse lançamento para ${nextDueDate}?`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateFinancialEntry(entryId, { dueAt: new Date(`${nextDueDate}T12:00:00`).toISOString() });
      reload();
      setFeedback(`Vencimento do lançamento ${entryId} atualizado.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o vencimento.");
    }
  }

  async function handleMarkOverdue(entryId: string) {
    const confirmed = confirmAction("Marcar esse lançamento como atrasado para subir prioridade de cobrança/pagamento?");
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateFinancialEntry(entryId, { status: "atrasado" });
      reload();
      setFeedback(`Lançamento ${entryId} movido para atraso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível marcar o lançamento como atrasado.");
    }
  }

  async function handleCreateEntry() {
    if (!entryDraft.description.trim()) {
      setFeedback("Informe a descrição do lançamento antes de salvar.");
      return;
    }

    if (entryDraft.amount <= 0) {
      setFeedback("O valor do lançamento precisa ser maior que zero.");
      return;
    }

    const confirmed = confirmAction(
      `Criar lançamento de ${entryDraft.type === "receber" ? "recebimento" : "pagamento"} para ${entryDraft.description.trim()}?`
    );
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createFinancialEntry({
        ...entryDraft,
        description: entryDraft.description.trim()
      });
      reload();
      setEntryDraft(createEmptyEntryDraft());
      setFeedback("Lançamento financeiro criado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível criar o lançamento.");
    }
  }

  async function handleSweepOverdueEntries() {
    const candidates = entries.filter((entry) => entry.status === "aberto" && new Date(entry.dueAt).getTime() < new Date().setHours(0, 0, 0, 0));
    if (!candidates.length) {
      setFeedback("Nenhum lançamento aberto está vencido fora do prazo hoje.");
      return;
    }

    const confirmed = confirmAction(`Marcar ${candidates.length} lançamento(s) vencido(s) como atrasado?`);
    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(candidates.map((entry) => appRepository.updateFinancialEntry(entry.id, { status: "atrasado" })));
      reload();
      setFeedback(`${candidates.length} lançamento(s) vencido(s) foram movidos para atraso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar os vencidos em lote.");
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        badge="Caixa e contas separados"
        compact
        description="Financeiro mais direto para cobrar, pagar, reclassificar atraso e manter o caixa sob controle com menos ruído visual."
        eyebrow="Financeiro"
        title="Fluxo financeiro executivo"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {financeOverview.map((item) => {
          const Icon = item.icon;
          return (
            <Card className="executive-panel" key={item.label}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Icon className="h-4 w-4 text-[color:rgba(214,190,142,0.78)]" />
                </div>
                <p className="font-display text-3xl font-semibold text-slate-50">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Novo lançamento</CardTitle>
            <CardDescription>Cadastro rápido para cobrança, conta a pagar ou ajuste do caixa sem travar a equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <select
                className="native-select h-10 text-[13px]"
                onChange={(event) =>
                  setEntryDraft((current) => ({ ...current, type: event.target.value as FinancialEntryCreateInput["type"] }))
                }
                value={entryDraft.type}
              >
                <option value="receber">Receber</option>
                <option value="pagar">Pagar</option>
              </select>
              <Input
                onChange={(event) => setEntryDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descrição do lançamento"
                value={entryDraft.description}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  min={0}
                  onChange={(event) => setEntryDraft((current) => ({ ...current, amount: Number(event.target.value) || 0 }))}
                  placeholder="Valor"
                  step="0.01"
                  type="number"
                  value={entryDraft.amount}
                />
                <Input
                  onChange={(event) =>
                    setEntryDraft((current) => ({ ...current, dueAt: toMiddayIso(event.target.value, current.dueAt) }))
                  }
                  type="date"
                  value={entryDraft.dueAt.slice(0, 10)}
                />
              </div>
              <select
                className="native-select h-10 text-[13px]"
                onChange={(event) =>
                  setEntryDraft((current) => ({ ...current, status: event.target.value as FinancialEntryCreateInput["status"] }))
                }
                value={entryDraft.status ?? "aberto"}
              >
                <option value="aberto">Aberto</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <div className="premium-tile rounded-[18px] p-4">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Prévia</p>
              <p className="mt-2 text-[14px] font-semibold text-slate-50">{entryDraft.description.trim() || "Sem descrição ainda"}</p>
              <p className="mt-2 text-[12px] text-slate-400">
                {entryDraft.type === "receber" ? "Recebimento" : "Pagamento"} • {formatCurrency(entryDraft.amount)} • vencimento {formatDate(entryDraft.dueAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleCreateEntry()}>
                Criar lançamento
              </Button>
              <Button onClick={() => setEntryDraft(createEmptyEntryDraft())} variant="outline">
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <FormAssistPanel
          description="Use o financeiro em três passos: filtre, revise vencimento e só depois marque como pago ou recebido para evitar baixa errada."
          tips={[
            "Se ainda não recebeu ou pagou de verdade, mantenha como aberto.",
            "Use atraso apenas quando a conta realmente saiu do prazo.",
            "Atualizar vencimento é mais seguro do que reescrever a descrição do lançamento."
          ]}
          title="Como evitar baixa errada"
          tone="warning"
        />
      </div>

      <div className="section-rule pt-4">
        <FinanceSummaryCards cards={cards} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Conciliação rápida</CardTitle>
            <CardDescription>Radar curto para saber o que já pode ser cobrado, pago ou reclassificado como atraso.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Vencidos</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{operationalSummary.overdueCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Precisam virar atraso ou baixa.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Pedidos vinculados</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{operationalSummary.linkedOrdersCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Cobranças ligadas à operação.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Compras vinculadas</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{operationalSummary.linkedPurchasesCount}</p>
              <p className="mt-1 text-[12px] text-slate-400">Títulos vindos do abastecimento.</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Receber vencido</p>
              <p className="mt-2 font-semibold text-slate-50">{formatCurrency(operationalSummary.overdueReceivables)}</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Pagar vencido</p>
              <p className="mt-2 font-semibold text-slate-50">{formatCurrency(operationalSummary.overduePayables)}</p>
            </div>
            <div className="premium-tile rounded-[18px] p-3.5">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Vence hoje</p>
              <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{operationalSummary.dueTodayCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="executive-panel">
          <CardHeader>
            <CardTitle>Ações em lote</CardTitle>
            <CardDescription>Ajustes rápidos para a equipe administrativa sem abrir título por título.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" onClick={() => void handleSweepOverdueEntries()} variant="outline">
              Marcar vencidos em aberto como atraso
            </Button>
            <Button className="w-full justify-start" onClick={() => { setStatus("atrasado"); setType("all"); }} variant="outline">
              Filtrar somente atrasados
            </Button>
            <Button className="w-full justify-start" onClick={() => { setType("receber"); setStatus("aberto"); }} variant="outline">
              Focar cobranças em aberto
            </Button>
            <Button className="w-full justify-start" onClick={() => { setType("pagar"); setStatus("aberto"); }} variant="outline">
              Focar pagamentos em aberto
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="section-rule executive-panel pt-4">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-[18px] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(36,32,40,0.98),rgba(24,21,28,0.98))] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,248,228,0.08),0_18px_34px_-30px_rgba(0,0,0,0.72)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descrição, tipo ou status" value={query} />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="native-select h-10 text-[13px]" onChange={(event) => setType(event.target.value)} value={type}>
              <option value="all">Todos os tipos</option>
              <option value="receber">Receber</option>
              <option value="pagar">Pagar</option>
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">Todos os status</option>
              <option value="aberto">Aberto</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card className="executive-panel">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-3">
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Saldo</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{formatCurrency(netFlow)}</p>
                <p className="mt-1 text-[12px] text-slate-400">Recorte atual.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Atrasos</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{overdueEntries.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Ação imediata.</p>
              </div>
              <div className="premium-tile rounded-[18px] p-3.5">
                <p className="text-[12px] uppercase tracking-[0.14em] text-[color:rgba(214,190,142,0.78)]">Agenda</p>
                <p className="mt-2 font-display text-[24px] font-semibold text-slate-50">{agendaToday.length}</p>
                <p className="mt-1 text-[12px] text-slate-400">Prioridade do dia.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Lançamentos</CardTitle>
              <CardDescription>Leitura operacional dos títulos do período filtrado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 2xl:grid-cols-2">
              {filteredEntries.length > 0 ? (
                visibleEntries.map((entry) => (
                  <Card className="premium-tile shadow-none" key={entry.id}>
                    <CardContent className="space-y-4 p-4">
                      {(() => {
                        const reference = getFinanceReference(entry);
                        return (
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-slate-50">{entry.description}</p>
                              <p className="text-[12px] text-slate-400">Vencimento {formatDate(entry.dueAt)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="outline">{reference.label}</Badge>
                              <Badge variant={entry.status === "pago" ? "success" : entry.status === "atrasado" ? "destructive" : "warning"}>{getFinanceStatusLabel(entry.status)}</Badge>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] text-slate-400">{getFinanceTypeLabel(entry.type)}</span>
                        <span className="font-display text-[22px] font-semibold text-slate-50">{formatCurrency(entry.amount)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button onClick={() => void handleFinanceStatus(entry.id, entry.status === "pago" ? "aberto" : "pago")} size="sm" variant="outline">
                          {entry.status === "pago" ? "Reabrir" : entry.type === "receber" ? "Marcar recebido" : "Marcar pago"}
                        </Button>
                        {entry.status !== "atrasado" ? (
                          <Button onClick={() => void handleMarkOverdue(entry.id)} size="sm" variant="outline">
                            Marcar atraso
                          </Button>
                        ) : null}
                        <Button onClick={() => void handleCopyFinanceAction(entry)} size="sm" variant="outline">
                          {entry.type === "receber" ? "Copiar cobrança" : "Preparar pagamento"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="h-8 w-[180px]"
                          onChange={(event) => setEditingDueDate((current) => ({ ...current, [entry.id]: event.target.value }))}
                          type="date"
                          value={editingDueDate[entry.id] ?? entry.dueAt.slice(0, 10)}
                        />
                        <Button onClick={() => void handleFinanceDueDate(entry.id)} size="sm" variant="outline">
                          Atualizar vencimento
                        </Button>
                        {(() => {
                          const reference = getFinanceReference(entry);
                          if (reference.origin === "pedido" && reference.code) {
                            return (
                              <Link className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs" to="/pedidos" state={{ query: reference.code }}>
                                Abrir pedido
                              </Link>
                            );
                          }

                          if (reference.origin === "compra" && reference.code) {
                            return (
                              <Link className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs" to="/compras" state={{ query: reference.code }}>
                                Abrir compra
                              </Link>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="empty-state-box text-sm xl:col-span-2">Nenhum lançamento encontrado nesse recorte.</div>
              )}
            </CardContent>
          </Card>
          <ResultLimitControl
            baseCount={FINANCE_BASE_LIMIT}
            itemLabel="lançamentos"
            onReset={() => setVisibleEntryCount(FINANCE_BASE_LIMIT)}
            onShowMore={() => setVisibleEntryCount((current) => Math.min(current + FINANCE_STEP, filteredEntries.length))}
            totalCount={filteredEntries.length}
            visibleCount={visibleEntries.length}
          />

          <FinanceAgingList items={aging} />
        </div>

        <div className="space-y-5">
          <CashSnapshotPanel snapshot={snapshot} />

          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Fila de conciliação</CardTitle>
              <CardDescription>Os próximos títulos que mais pedem ação administrativa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reconciliationQueue.map((item) => (
                <div className="premium-tile rounded-[18px] p-3.5" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-50">{item.title}</p>
                      <p className="text-[12px] leading-5 text-slate-400">{item.helper}</p>
                    </div>
                    <Badge variant={item.tone === "destructive" ? "destructive" : item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "outline"}>
                      {getFinanceQueueToneLabel(item.tone)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-slate-50">{item.amount}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="executive-panel">
            <CardHeader>
              <CardTitle>Agenda prioritária</CardTitle>
              <CardDescription>O que a equipe financeira precisa atacar primeiro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agendaToday.map((entry) => (
                <div className="premium-tile rounded-[18px] p-3.5" key={entry.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-semibold text-slate-50">{entry.description}</p>
                    <Badge variant={entry.status === "atrasado" ? "destructive" : entry.type === "receber" ? "success" : "outline"}>{entry.type === "receber" ? "Receber" : "Pagar"}</Badge>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-400">{formatDate(entry.dueAt)} • {formatCurrency(entry.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <RecentAreaAuditPanel
            area="Financeiro"
            description="Baixas, reaberturas, vencimentos e ações de cobrança/pagamento."
            emptyMessage="As próximas ações financeiras vão aparecer aqui."
            title="Últimas ações do caixa"
          />
        </div>
      </div>
    </div>
  );
}



