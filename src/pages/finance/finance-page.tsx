import { useMemo, useState } from "react";
import { AlertTriangle, Landmark, Search, Wallet2 } from "lucide-react";
import { buildCashSnapshot, buildFinanceAging, buildFinanceSummary, filterFinanceEntries } from "@/features/finance/finance.service";
import { CashSnapshotPanel } from "@/components/finance/cash-snapshot-panel";
import { ModuleHeader } from "@/components/shared/module-header";
import { FinanceAgingList } from "@/components/finance/finance-aging-list";
import { FinanceSummaryCards } from "@/components/finance/finance-summary-cards";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFinancialEntries } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function FinancePage() {
  const { data, loading } = useFinancialEntries();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const entries = data ?? [];

  const filteredEntries = useMemo(() => {
    const base = filterFinanceEntries(entries, type, status);
    const normalizedQuery = query.trim().toLowerCase();
    return base.filter((entry) => normalizedQuery.length === 0 || [entry.description, entry.type, entry.status].join(" ").toLowerCase().includes(normalizedQuery));
  }, [entries, query, status, type]);
  const cards = useMemo(() => buildFinanceSummary(filteredEntries), [filteredEntries]);
  const aging = useMemo(() => buildFinanceAging(filteredEntries), [filteredEntries]);
  const snapshot = useMemo(() => buildCashSnapshot(entries), [entries]);
  const overdueEntries = useMemo(() => filteredEntries.filter((entry) => entry.status === "atrasado"), [filteredEntries]);
  const agendaToday = useMemo(() => filteredEntries.slice().sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()).slice(0, 5), [filteredEntries]);
  const netFlow = useMemo(() => filteredEntries.reduce((sum, entry) => sum + (entry.type === "receber" ? entry.amount : -entry.amount), 0), [filteredEntries]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        badge="Caixa e contas separados"
        description="Financeiro com leitura mais gerencial: resumo, prioridades, vencimentos e status sem virar planilha pesada na tela inteira."
        eyebrow="Financeiro"
        title="Fluxo financeiro resumido"
      />

      <div className="section-rule pt-4">
        <FinanceSummaryCards cards={cards} />
      </div>

      <Card className="section-rule workspace-strip pt-4">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Leitura financeira</p>
            <p className="text-[15px] font-semibold text-slate-950">O financeiro ficou mais claro para decidir cobrança, pagamento e fechamento sem parecer planilha crua.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Saldo</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{formatCurrency(netFlow)}</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Atrasos</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">{overdueEntries.length} itens</p>
            </div>
            <div className="workspace-chip rounded-[18px] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Prioridade</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-950">Agenda do dia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="section-rule grid gap-3 pt-4 xl:grid-cols-3">
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Saldo do recorte</p><p className="font-display text-[24px] font-semibold text-slate-950">{formatCurrency(netFlow)}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">Entradas menos saídas do filtro atual.</p></CardContent></Card>
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Em atraso</p><p className="font-display text-[24px] font-semibold text-slate-950">{overdueEntries.length}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">Títulos que merecem ação imediata.</p></CardContent></Card>
        <Card className="executive-panel"><CardContent className="space-y-2 p-4"><p className="text-[12px] uppercase tracking-[0.18em] text-slate-500">Agenda do dia</p><p className="font-display text-[24px] font-semibold text-slate-950">{agendaToday.length}</p><div className="h-px bg-gradient-to-r from-slate-200/80 to-transparent" /><p className="text-[13px] text-slate-600">Itens priorizados por vencimento.</p></CardContent></Card>
      </div>

      <Card className="section-rule surface-rule border-white/80 bg-white/92 pt-4">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-[18px] border border-white/70 bg-secondary/35 px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descrição, tipo ou status" value={query} />
          </div>
          <div className="flex flex-wrap gap-3">
            <select className="native-select h-10 text-[13px]" onChange={(event) => setType(event.target.value)} value={type}>
              <option value="all">Todos tipos</option>
              <option value="receber">Receber</option>
              <option value="pagar">Pagar</option>
            </select>
            <select className="native-select h-10 text-[13px]" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="all">Todos status</option>
              <option value="aberto">Aberto</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="section-rule grid gap-5 pt-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card className="surface-rule border-white/80 bg-white/92">
            <CardHeader>
              <CardTitle>Lançamentos</CardTitle>
              <CardDescription>Leitura operacional dos títulos do período filtrado.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <Card className="surface-rule border-slate-100 bg-secondary/30 shadow-none" key={entry.id}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-semibold text-slate-950">{entry.description}</p>
                          <p className="text-[12px] text-slate-600">Vencimento {formatDate(entry.dueAt)}</p>
                        </div>
                        <Badge variant={entry.status === "pago" ? "success" : entry.status === "atrasado" ? "destructive" : "warning"}>{entry.status}</Badge>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] text-slate-600">{entry.type === "receber" ? "Conta a receber" : "Conta a pagar"}</span>
                        <span className="font-display text-[22px] font-semibold text-slate-950">{formatCurrency(entry.amount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="empty-state-box text-sm xl:col-span-2">Nenhum lançamento encontrado nesse recorte.</div>
              )}
            </CardContent>
          </Card>

          <FinanceAgingList items={aging} />
        </div>

        <div className="space-y-5">
          <CashSnapshotPanel snapshot={snapshot} />

          <Card className="surface-rule border-white/80 bg-white/92">
            <CardHeader>
              <CardTitle>Agenda prioritária</CardTitle>
              <CardDescription>O que a equipe financeira precisa atacar primeiro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agendaToday.map((entry) => (
                <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-3.5" key={entry.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-semibold text-slate-950">{entry.description}</p>
                    <Badge variant={entry.status === "atrasado" ? "destructive" : entry.type === "receber" ? "success" : "outline"}>{entry.type}</Badge>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-600">{formatDate(entry.dueAt)} • {formatCurrency(entry.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="surface-rule border-white/80 bg-white/92">
            <CardHeader>
              <CardTitle>Guia do caixa</CardTitle>
              <CardDescription>Três regras para manter o fluxo local saudável.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-4"><div className="flex items-center gap-2 text-slate-950"><AlertTriangle className="h-4 w-4" /><p className="text-[14px] font-semibold">Virou atraso, virou ação</p></div><p className="mt-2 text-[13px] leading-5 text-slate-600">Não deixe título em atraso perder visibilidade no painel.</p></div>
              <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-4"><div className="flex items-center gap-2 text-slate-950"><Wallet2 className="h-4 w-4" /><p className="text-[14px] font-semibold">Recebíveis merecem ritmo</p></div><p className="mt-2 text-[13px] leading-5 text-slate-600">Fluxo previsível dá segurança para comprar e negociar.</p></div>
              <div className="rounded-[18px] border border-white/70 bg-secondary/35 p-4"><div className="flex items-center gap-2 text-slate-950"><Landmark className="h-4 w-4" /><p className="text-[14px] font-semibold">Caixa e contas separados</p></div><p className="mt-2 text-[13px] leading-5 text-slate-600">Visão limpa reduz erro e ajuda o fechamento do turno.</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
