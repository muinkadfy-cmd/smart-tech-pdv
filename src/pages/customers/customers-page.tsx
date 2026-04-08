import { useMemo, useState } from "react";
import { HeartHandshake, Search, Sparkles, Users } from "lucide-react";
import { ModuleHeader } from "@/components/shared/module-header";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/use-app-data";
import { formatCurrency, formatDate } from "@/lib/utils";

function getCustomerSegment(lifetimeValue: number) {
  if (lifetimeValue >= 1800) return "premium";
  if (lifetimeValue >= 900) return "recorrente";
  return "reativar";
}

export default function CustomersPage() {
  const { data, loading } = useCustomers();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const customers = data ?? [];

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const customerSegment = getCustomerSegment(customer.lifetimeValue);
      const matchesSegment = segment === "all" || customerSegment === segment;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [customer.name, customer.phone, customer.email, customer.whatsapp, customer.notes].join(" ").toLowerCase().includes(normalizedQuery);

      return matchesSegment && matchesQuery;
    });
  }, [customers, query, segment]);

  const premiumCustomers = useMemo(() => filteredCustomers.filter((customer) => getCustomerSegment(customer.lifetimeValue) === "premium"), [filteredCustomers]);
  const reactivationCustomers = useMemo(() => filteredCustomers.filter((customer) => getCustomerSegment(customer.lifetimeValue) === "reativar"), [filteredCustomers]);
  const totalLifetime = useMemo(() => filteredCustomers.reduce((sum, customer) => sum + customer.lifetimeValue, 0), [filteredCustomers]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Foco em recompra"
        description="Cadastro limpo com sinais de valor de cliente, ultima compra e observacoes para atendimento mais rapido."
        eyebrow="Clientes"
        title="Relacionamento e historico"
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1.1fr]">
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Base ativa</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{filteredCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Clientes no recorte atual.</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Segmento premium</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{premiumCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Quem pede atendimento mais consultivo.</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reativar</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{reactivationCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Clientes que merecem campanha ou contato.</p>
          </CardContent>
        </Card>
        <Card className="border-white/80 bg-white/90">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lifetime consolidado</p>
            <p className="font-display text-3xl font-semibold text-slate-950">{formatCurrency(totalLifetime)}</p>
            <p className="text-sm text-muted-foreground">Visão comercial da carteira filtrada.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/80 bg-white/90">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl bg-secondary/45 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, email ou observacao" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setSegment(event.target.value)} value={segment}>
            <option value="all">Todos segmentos</option>
            <option value="premium">Premium</option>
            <option value="recorrente">Recorrente</option>
            <option value="reativar">Reativar</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => {
              const customerSegment = getCustomerSegment(customer.lifetimeValue);
              return (
                <Card className="border-white/80 bg-white/90" key={customer.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl font-semibold text-slate-950">{customer.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.phone} • {customer.email}</p>
                      </div>
                      <Badge variant={customerSegment === "premium" ? "success" : customerSegment === "recorrente" ? "default" : "warning"}>{customerSegment}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-secondary/45 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ultima compra</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(customer.lastPurchaseAt)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary/45 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ticket medio</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(customer.averageTicket)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary/45 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lifetime</p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(customer.lifetimeValue)}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">{customer.notes}</div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="border-white/80 bg-white/90 xl:col-span-2">
          <CardContent className="p-5"><div className="empty-state-box text-sm">Nenhum cliente encontrado nesse filtro. Ajuste o segmento ou a busca para reabrir a carteira.</div></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Radar de relacionamento</CardTitle>
              <CardDescription>Leitura simples para saber onde vender mais e onde reativar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl bg-secondary/45 p-4">
                <div className="flex items-center gap-2 text-slate-950">
                  <Sparkles className="h-4 w-4" />
                  <p className="font-semibold">Atendimento premium</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Clientes premium aceitam melhor curadoria, prova de look e indicação de coleção nova.</p>
              </div>
              <div className="rounded-2xl bg-secondary/45 p-4">
                <div className="flex items-center gap-2 text-slate-950">
                  <HeartHandshake className="h-4 w-4" />
                  <p className="font-semibold">Campanha de retorno</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Quem caiu em “reativar” merece lista de transmissão, WhatsApp ou ação de provador.</p>
              </div>
              <div className="rounded-2xl bg-secondary/45 p-4">
                <div className="flex items-center gap-2 text-slate-950">
                  <Users className="h-4 w-4" />
                  <p className="font-semibold">Carteira organizada</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Mesmo sistema para calçados e roupas, com visão clara de ticket e frequência.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/80 bg-white/90">
            <CardHeader>
              <CardTitle>Prioridade do dia</CardTitle>
              <CardDescription>Primeiros nomes que merecem atenção da equipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCustomers.slice(0, 5).map((customer) => (
                <div className="rounded-2xl bg-secondary/45 p-4" key={customer.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{customer.name}</p>
                    <Badge variant={getCustomerSegment(customer.lifetimeValue) === "premium" ? "success" : "outline"}>{getCustomerSegment(customer.lifetimeValue)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Última compra {formatDate(customer.lastPurchaseAt)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">WhatsApp {customer.whatsapp}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
