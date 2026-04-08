import { useMemo, useState } from "react";
import { Clock3, Handshake, Search, ShieldCheck } from "lucide-react";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSuppliers } from "@/hooks/use-app-data";

export default function SuppliersPage() {
  const { data, loading } = useSuppliers();
  const [query, setQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const suppliers = data ?? [];

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesLead =
        leadFilter === "all" ||
        (leadFilter === "agil" && supplier.leadTimeDays <= 8) ||
        (leadFilter === "medio" && supplier.leadTimeDays > 8 && supplier.leadTimeDays <= 12) ||
        (leadFilter === "critico" && supplier.leadTimeDays > 12);
      const matchesQuery = normalizedQuery.length === 0 || [supplier.name, supplier.contact, supplier.email, supplier.cnpj].join(" ").toLowerCase().includes(normalizedQuery);

      return matchesLead && matchesQuery;
    });
  }, [suppliers, query, leadFilter]);

  const agileCount = useMemo(() => filteredSuppliers.filter((supplier) => supplier.leadTimeDays <= 8).length, [filteredSuppliers]);
  const criticalCount = useMemo(() => filteredSuppliers.filter((supplier) => supplier.leadTimeDays > 12).length, [filteredSuppliers]);
  const linkedProducts = useMemo(() => filteredSuppliers.reduce((sum, supplier) => sum + supplier.linkedProducts, 0), [filteredSuppliers]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Compras mais previsiveis"
        description="Fornecedores com leitura direta de contato, prazo e base de produtos vinculados para acelerar reposicao."
        eyebrow="Fornecedores"
        title="Base de parceiros comerciais"
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Parceiros ativos</p><p className="font-display text-3xl font-semibold text-slate-950">{filteredSuppliers.length}</p><p className="text-sm text-muted-foreground">Base filtrada para decisão rápida.</p></CardContent></Card>
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prazo ágil</p><p className="font-display text-3xl font-semibold text-slate-950">{agileCount}</p><p className="text-sm text-muted-foreground">Fornecedores com reposição mais segura.</p></CardContent></Card>
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prazo crítico</p><p className="font-display text-3xl font-semibold text-slate-950">{criticalCount}</p><p className="text-sm text-muted-foreground">Merecem compra antecipada ou plano B.</p></CardContent></Card>
        <Card className="border-white/80 bg-white/90"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Catálogo vinculado</p><p className="font-display text-3xl font-semibold text-slate-950">{linkedProducts}</p><p className="text-sm text-muted-foreground">Produtos conectados a essa carteira.</p></CardContent></Card>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-secondary/45 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por fornecedor, contato, email ou CNPJ" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setLeadFilter(event.target.value)} value={leadFilter}>
            <option value="all">Todos prazos</option>
            <option value="agil">Até 8 dias</option>
            <option value="medio">9 a 12 dias</option>
            <option value="critico">Acima de 12 dias</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <Card className="border-white/80 bg-white/90" key={supplier.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl font-semibold text-slate-950">{supplier.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{supplier.cnpj}</p>
                    </div>
                    <Badge variant={supplier.leadTimeDays <= 8 ? "success" : supplier.leadTimeDays <= 12 ? "warning" : "outline"}>{supplier.leadTimeDays} dias</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-secondary/45 p-3 text-sm text-muted-foreground">Contato: {supplier.contact}</div>
                    <div className="rounded-2xl bg-secondary/45 p-3 text-sm text-muted-foreground">Email: {supplier.email}</div>
                    <div className="rounded-2xl bg-secondary/45 p-3 text-sm text-muted-foreground">Prazo: {supplier.leadTimeDays} dias</div>
                    <div className="rounded-2xl bg-secondary/45 p-3 text-sm text-muted-foreground">Produtos vinculados: {supplier.linkedProducts}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
          <Card className="border-white/80 bg-white/90 xl:col-span-2"><CardContent className="p-5"><div className="empty-state-box text-sm">Nenhum fornecedor encontrado nesse recorte.</div></CardContent></Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Radar de compra</CardTitle>
              <CardDescription>O que a equipe precisa enxergar antes de soltar pedido.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl bg-secondary/45 p-4"><div className="flex items-center gap-2 text-slate-950"><Clock3 className="h-4 w-4" /><p className="font-semibold">Prazo manda no giro</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Fornecedor com prazo maior precisa entrar antes no radar de reposição.</p></div>
              <div className="rounded-2xl bg-secondary/45 p-4"><div className="flex items-center gap-2 text-slate-950"><Handshake className="h-4 w-4" /><p className="font-semibold">Contato pronto</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Deixe o melhor contato visível para a equipe não perder tempo procurando.</p></div>
              <div className="rounded-2xl bg-secondary/45 p-4"><div className="flex items-center gap-2 text-slate-950"><ShieldCheck className="h-4 w-4" /><p className="font-semibold">Plano B definido</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Quanto mais crítico o prazo, mais importante ter um fornecedor reserva.</p></div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Top prioridade</CardTitle>
              <CardDescription>Quem deve ser revisado agora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...filteredSuppliers].sort((a, b) => b.leadTimeDays - a.leadTimeDays).slice(0, 5).map((supplier) => (
                <div className="rounded-2xl bg-secondary/45 p-4" key={supplier.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{supplier.name}</p>
                    <Badge variant={supplier.leadTimeDays > 12 ? "warning" : "outline"}>{supplier.leadTimeDays} dias</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{supplier.contact} • {supplier.email}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
