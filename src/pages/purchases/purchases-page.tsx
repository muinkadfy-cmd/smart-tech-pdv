import { useMemo, useState } from "react";
import { Boxes, Search, Wallet } from "lucide-react";
import { buildPurchasePipeline, buildPurchaseSummary, buildSupplierPerformance, filterPurchases } from "@/features/purchases/purchase.service";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { PurchasePipelinePanel } from "@/components/purchases/purchase-pipeline-panel";
import { PurchaseSummaryCards } from "@/components/purchases/purchase-summary-cards";
import { SupplierPerformancePanel } from "@/components/purchases/supplier-performance-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePurchases, useSuppliers } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchasesPage() {
  const { data: purchasesData, loading: loadingPurchases } = usePurchases();
  const { data: suppliersData, loading: loadingSuppliers } = useSuppliers();
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  const purchases = purchasesData ?? [];
  const suppliers = suppliersData ?? [];
  const loading = loadingPurchases || loadingSuppliers;

  const filteredPurchases = useMemo(() => {
    const base = filterPurchases(purchases, status);
    const normalizedQuery = query.trim().toLowerCase();
    const supplierMap = Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name]));

    return base.filter((purchase) => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      return [purchase.id, purchase.status, supplierMap[purchase.supplierId] ?? purchase.supplierId].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [purchases, query, status, suppliers]);

  const supplierMap = useMemo(() => Object.fromEntries(suppliers.map((supplier) => [supplier.id, supplier.name])), [suppliers]);
  const cards = useMemo(() => buildPurchaseSummary(filteredPurchases), [filteredPurchases]);
  const pipeline = useMemo(() => buildPurchasePipeline(filteredPurchases, suppliers), [filteredPurchases, suppliers]);
  const supplierPerformance = useMemo(() => buildSupplierPerformance(suppliers), [suppliers]);
  const openValue = useMemo(() => filteredPurchases.filter((purchase) => purchase.status !== "recebida").reduce((sum, purchase) => sum + purchase.total, 0), [filteredPurchases]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Conferencia por lote pronta"
        description="Compras mais legiveis, com pipeline de abastecimento, volume financeiro e leitura rapida de recebimento por fornecedor."
        eyebrow="Compras"
        title="Abastecimento controlado"
      />

      <PurchaseSummaryCards cards={cards} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pedidos no radar</p><p className="font-display text-3xl font-semibold text-slate-950">{filteredPurchases.length}</p><p className="text-sm text-muted-foreground">Lotes ativos após filtros.</p></CardContent></Card>
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Capital em aberto</p><p className="font-display text-3xl font-semibold text-slate-950">{formatCurrency(openValue)}</p><p className="text-sm text-muted-foreground">Volume ainda não totalmente recebido.</p></CardContent></Card>
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fornecedores ativos</p><p className="font-display text-3xl font-semibold text-slate-950">{suppliers.length}</p><p className="text-sm text-muted-foreground">Base pronta para negociação e reposição.</p></CardContent></Card>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-secondary/45 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por compra, fornecedor ou status" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">Todos status</option>
            <option value="aberta">Aberta</option>
            <option value="conferida">Conferida</option>
            <option value="recebida">Recebida</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Compras em andamento</CardTitle>
              <CardDescription>Fila de lotes para acompanhamento do comprador ou do estoque.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <Card className="border-slate-100 bg-secondary/35 shadow-none" key={purchase.id}>
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-2xl font-semibold text-slate-950">{purchase.id}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{supplierMap[purchase.supplierId] ?? purchase.supplierId}</p>
                        </div>
                        <Badge variant="outline">{purchase.status}</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Total: {formatCurrency(purchase.total)}</p>
                        <p>Itens: {purchase.items}</p>
                        <p>Abertura: {formatDate(purchase.createdAt)}</p>
                        {purchase.receivedAt ? <p>Recebimento: {formatDate(purchase.receivedAt)}</p> : null}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="empty-state-box text-sm xl:col-span-2">Nenhuma compra caiu nesse filtro.</div>
              )}
            </CardContent>
          </Card>

          <PurchasePipelinePanel items={pipeline} />
        </div>

        <div className="space-y-6">
          <SupplierPerformancePanel items={supplierPerformance} />

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Guia de abastecimento</CardTitle>
              <CardDescription>Leitura rápida para compras moda + calçados sem bagunça.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl bg-secondary/45 p-4"><div className="flex items-center gap-2 text-slate-950"><Boxes className="h-4 w-4" /><p className="font-semibold">Conferir por lote</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Separar recebimento por lote evita erro de custo, quantidade e grade.</p></div>
              <div className="rounded-2xl bg-secondary/45 p-4"><div className="flex items-center gap-2 text-slate-950"><Wallet className="h-4 w-4" /><p className="font-semibold">Olhar capital travado</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Acompanhar o valor em aberto ajuda a não sobrecarregar o caixa da loja.</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
