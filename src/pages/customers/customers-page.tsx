import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Search, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { RecentAreaAuditPanel } from "@/components/shared/recent-area-audit-panel";
import { ResultLimitControl } from "@/components/shared/result-limit-control";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/use-app-data";
import { confirmAction } from "@/lib/confirm-action";
import { formatDate, formatCurrency } from "@/lib/utils";
import { appRepository } from "@/repositories/app-repository";
import { recordAuditEntry } from "@/services/audit/audit-log.service";
import type { CustomerFormValues } from "@/types/domain";

function getCustomerSegment(lifetimeValue: number) {
  if (lifetimeValue >= 1800) return "premium";
  if (lifetimeValue >= 900) return "recorrente";
  return "reativar";
}

export default function CustomersPage() {
  const CUSTOMER_BASE_LIMIT = 6;
  const CUSTOMER_STEP = 6;
  const { data, loading, reload } = useCustomers();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [visibleCustomerCount, setVisibleCustomerCount] = useState(CUSTOMER_BASE_LIMIT);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [customerDraft, setCustomerDraft] = useState<CustomerFormValues | null>(null);
  const customers = data ?? [];

  function createEmptyCustomerDraft(): CustomerFormValues {
    return {
      name: "",
      phone: "",
      whatsapp: "",
      email: "",
      notes: ""
    };
  }

  function openNewCustomerEditor() {
    setEditingCustomerId("new");
    setCustomerDraft(createEmptyCustomerDraft());
    setFeedback("Novo cliente pronto para cadastro.");
  }

  function openCustomerEditor(customer: (typeof customers)[number]) {
    setEditingCustomerId(customer.id);
    setCustomerDraft({
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      notes: customer.notes
    });
    setFeedback(`Editando ${customer.name}.`);
  }

  async function handleSaveCustomer() {
    if (!editingCustomerId || !customerDraft) {
      return;
    }

    if (!customerDraft.name.trim()) {
      setFeedback("Informe o nome do cliente para salvar o cadastro.");
      return;
    }

    const isCreating = editingCustomerId === "new";
    const confirmed = confirmAction(
      isCreating
        ? `Criar cliente ${customerDraft.name}? O cadastro entrará na base local agora.`
        : `Salvar alterações de ${customerDraft.name}? O cadastro do cliente será atualizado na base local.`
    );
    if (!confirmed) {
      return;
    }

    try {
      if (isCreating) {
        await appRepository.createCustomer(customerDraft);
      } else {
        await appRepository.updateCustomer(editingCustomerId, customerDraft);
      }
      reload();
      setFeedback(isCreating ? "Cliente criado com sucesso." : "Cliente atualizado com sucesso.");
      setEditingCustomerId(null);
      setCustomerDraft(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : `Não foi possível ${isCreating ? "criar" : "atualizar"} o cliente.`);
    }
  }

  async function handleCustomerStatus(customer: (typeof customers)[number], nextStatus: "active" | "inactive") {
    const confirmed = confirmAction(`${nextStatus === "inactive" ? "Inativar" : "Reativar"} ${customer.name}? O histórico comercial sera preservado.`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateCustomerStatus(customer.id, nextStatus);
      reload();
      setFeedback(`Cliente ${customer.name} ${nextStatus === "inactive" ? "inativado" : "reativado"} com sucesso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o status do cliente.");
    }
  }

  async function handleCopyContact(customer: (typeof customers)[number], preferredLabel: string) {
    const payload = `${customer.name} • ${customer.whatsapp || customer.phone} • Última compra ${formatDate(customer.lastPurchaseAt)}`;
    try {
      await navigator.clipboard.writeText(payload);
      recordAuditEntry({
        area: "Clientes",
        action: preferredLabel === "Resumo para reativação" ? "Reativação iniciada" : "Contato preparado",
        details: `${customer.name} teve contato preparado para abordagem comercial.`
      });
      setFeedback(`${preferredLabel} copiado para ${customer.name}.`);
    } catch {
      setFeedback(`Não foi possível copiar o contato de ${customer.name}.`);
    }
  }

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const customerSegment = getCustomerSegment(customer.lifetimeValue);
      const matchesSegment = segment === "all" || customerSegment === segment;
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [customer.name, customer.phone, customer.email, customer.whatsapp, customer.notes].join(" ").toLowerCase().includes(normalizedQuery);

      return matchesSegment && matchesStatus && matchesQuery;
    });
  }, [customers, query, segment, statusFilter]);

  const premiumCustomers = useMemo(() => filteredCustomers.filter((customer) => getCustomerSegment(customer.lifetimeValue) === "premium"), [filteredCustomers]);
  const reactivationCustomers = useMemo(() => filteredCustomers.filter((customer) => getCustomerSegment(customer.lifetimeValue) === "reativar"), [filteredCustomers]);
  const inactiveCustomers = useMemo(() => customers.filter((customer) => customer.status === "inactive").length, [customers]);
  const visibleCustomers = useMemo(() => filteredCustomers.slice(0, visibleCustomerCount), [filteredCustomers, visibleCustomerCount]);

  useEffect(() => {
    setVisibleCustomerCount(CUSTOMER_BASE_LIMIT);
  }, [query, segment, statusFilter, customers.length]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Foco em recompra"
        compact
        description="Cadastro limpo com sinais de valor de cliente, última compra e observacoes para atendimento mais rápido."
        eyebrow="Clientes"
        title="Relacionamento e histórico"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <Card className="surface-rule">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-slate-50">Cadastro rápido de clientes</p>
            <p className="mt-1 text-sm text-muted-foreground">Abra um cliente novo sem sair da carteira e mantenha o atendimento mais rápido no balcão.</p>
          </div>
          <Button onClick={openNewCustomerEditor} size="sm">
            Criar cliente
          </Button>
        </CardContent>
      </Card>

      {editingCustomerId === "new" && customerDraft ? (
        <Card className="surface-rule">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-2xl font-semibold text-slate-50">Novo cliente</p>
                <p className="mt-1 text-sm text-muted-foreground">Cadastro leve para balcão, recompra e histórico comercial.</p>
              </div>
              <Badge variant="success">novo cadastro</Badge>
            </div>
            <FormAssistPanel
              description="Se a loja estiver correndo, cadastre nome e WhatsApp primeiro. O restante pode ser enriquecido depois sem perder a operação."
              tips={[
                "Nome e WhatsApp já deixam o contato utilizável no PDV e em campanhas.",
                "Email pode ficar vazio se o cliente não usar no atendimento do dia.",
                "Observações ajudam a lembrar preferências, grade e estilo de compra."
              ]}
              title="Preenchimento enxuto"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Nome do cliente" value={customerDraft.name} />
              <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, phone: event.target.value } : current)} placeholder="Telefone" value={customerDraft.phone} />
              <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, whatsapp: event.target.value } : current)} placeholder="WhatsApp" value={customerDraft.whatsapp} />
              <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, email: event.target.value } : current)} placeholder="E-mail" value={customerDraft.email} />
              <Input className="md:col-span-2" onChange={(event) => setCustomerDraft((current) => current ? { ...current, notes: event.target.value } : current)} placeholder="Observações de atendimento, preferências e histórico" value={customerDraft.notes} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSaveCustomer()} size="sm">
                Salvar cliente
              </Button>
              <Button onClick={() => { setEditingCustomerId(null); setCustomerDraft(null); }} size="sm" variant="outline">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_1.1fr]">
        <Card className="surface-rule">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Base ativa</p>
            <p className="font-display text-3xl font-semibold text-slate-50">{filteredCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Clientes no recorte atual.</p>
          </CardContent>
        </Card>
        <Card className="surface-rule">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Segmento premium</p>
            <p className="font-display text-3xl font-semibold text-slate-50">{premiumCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Quem pede atendimento mais consultivo.</p>
          </CardContent>
        </Card>
        <Card className="surface-rule">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reativar</p>
            <p className="font-display text-3xl font-semibold text-slate-50">{reactivationCustomers.length}</p>
            <p className="text-sm text-muted-foreground">Clientes que merecem campanha ou contato.</p>
          </CardContent>
        </Card>
        <Card className="surface-rule">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inativos</p>
            <p className="font-display text-3xl font-semibold text-slate-50">{inactiveCustomers}</p>
            <p className="text-sm text-muted-foreground">Preservados sem sair do histórico.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-rule">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 premium-tile rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, telefone, email ou observação" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setSegment(event.target.value)} value={segment}>
            <option value="all">Todos segmentos</option>
            <option value="premium">Premium</option>
            <option value="recorrente">Recorrente</option>
            <option value="reativar">Reativar</option>
          </select>
          <select className="native-select h-11 text-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos status</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="grid gap-4 2xl:grid-cols-2">
          {filteredCustomers.length > 0 ? (
            visibleCustomers.map((customer) => {
              const customerSegment = getCustomerSegment(customer.lifetimeValue);
              return (
                <Card className={`surface-rule ${customer.status === "inactive" ? "opacity-75" : ""}`} key={customer.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl font-semibold text-slate-50">{customer.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{customer.phone} • {customer.email}</p>
                      </div>
                      <Badge variant={customer.status === "inactive" ? "outline" : customerSegment === "premium" ? "success" : customerSegment === "recorrente" ? "default" : "warning"}>{customer.status === "inactive" ? "inativo" : customerSegment}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="premium-tile rounded-2xl p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Última compra</p>
                        <p className="mt-2 text-sm font-semibold text-slate-50">{formatDate(customer.lastPurchaseAt)}</p>
                      </div>
                      <div className="premium-tile rounded-2xl p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ticket médio</p>
                        <p className="mt-2 text-sm font-semibold text-slate-50">{formatCurrency(customer.averageTicket)}</p>
                      </div>
                      <div className="premium-tile rounded-2xl p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Lifetime</p>
                        <p className="mt-2 text-sm font-semibold text-slate-50">{formatCurrency(customer.lifetimeValue)}</p>
                      </div>
                    </div>
                    <div className="premium-tile rounded-2xl p-4 text-sm leading-6 text-muted-foreground">{customer.notes}</div>
                    {editingCustomerId === customer.id && customerDraft ? (
                      <div className="space-y-3 rounded-2xl border border-[rgba(201,168,111,0.16)] bg-[linear-gradient(180deg,rgba(43,43,50,0.96),rgba(28,28,34,0.98))] p-4">
                        <FormAssistPanel
                          description="Se o cliente for leigo ou estiver no balcão, foque primeiro em nome e WhatsApp. Os outros campos podem ser completados aos poucos sem perder a venda."
                          tips={[
                            "WhatsApp costuma ser o campo mais valioso para retorno e campanha.",
                            "Use observações para registrar gosto, tamanho ou preferência de atendimento.",
                            "Se o email estiver em branco, o cadastro continua válido para operação local."
                          ]}
                          title="Como preencher sem complicar"
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                        <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, name: event.target.value } : current)} value={customerDraft.name} />
                        <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, phone: event.target.value } : current)} value={customerDraft.phone} />
                        <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, whatsapp: event.target.value } : current)} value={customerDraft.whatsapp} />
                        <Input onChange={(event) => setCustomerDraft((current) => current ? { ...current, email: event.target.value } : current)} value={customerDraft.email} />
                        <Input className="md:col-span-2" onChange={(event) => setCustomerDraft((current) => current ? { ...current, notes: event.target.value } : current)} value={customerDraft.notes} />
                        <div className="flex flex-wrap gap-2 md:col-span-2">
                          <Button onClick={() => void handleSaveCustomer()} size="sm">
                            Salvar cliente
                          </Button>
                          <Button onClick={() => { setEditingCustomerId(null); setCustomerDraft(null); }} size="sm" variant="outline">
                            Cancelar
                          </Button>
                        </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link className={buttonVariants({ size: "sm" })} to="/pdv">
                        Abrir no PDV
                      </Link>
                      <Button onClick={() => openCustomerEditor(customer)} size="sm" variant="outline">
                        Editar
                      </Button>
                      <Button onClick={() => void handleCopyContact(customer, customerSegment === "reativar" ? "Resumo para reativação" : "Contato")} size="sm" variant="outline">
                        {customerSegment === "reativar" ? "Reativar contato" : "Copiar WhatsApp"}
                      </Button>
                      <Button onClick={() => void handleCustomerStatus(customer, customer.status === "inactive" ? "active" : "inactive")} size="sm" variant={customer.status === "inactive" ? "secondary" : "destructive"}>
                        {customer.status === "inactive" ? "Reativar" : "Inativar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="surface-rule xl:col-span-2">
          <CardContent className="p-5"><div className="empty-state-box text-sm">Nenhum cliente encontrado nesse filtro. Ajuste o segmento ou a busca para reabrir a carteira.</div></CardContent>
            </Card>
          )}
        </div>
        <ResultLimitControl
          baseCount={CUSTOMER_BASE_LIMIT}
          itemLabel="clientes"
          onReset={() => setVisibleCustomerCount(CUSTOMER_BASE_LIMIT)}
          onShowMore={() => setVisibleCustomerCount((current) => Math.min(current + CUSTOMER_STEP, filteredCustomers.length))}
          totalCount={filteredCustomers.length}
          visibleCount={visibleCustomers.length}
        />

        <div className="space-y-6">
          <Card className="surface-rule">
            <CardHeader>
              <CardTitle>Radar de relacionamento</CardTitle>
              <CardDescription>Leitura simples para saber onde vender mais e onde reativar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="premium-tile rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-50">
                  <Sparkles className="h-4 w-4" />
                  <p className="font-semibold">Atendimento premium</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Clientes premium aceitam melhor curadoria, prova de look e indicação de coleção nova.</p>
              </div>
              <div className="premium-tile rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-50">
                  <HeartHandshake className="h-4 w-4" />
                  <p className="font-semibold">Campanha de retorno</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Quem caiu em “reativar” merece lista de transmissão, WhatsApp ou ação de provador.</p>
              </div>
              <div className="premium-tile rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-50">
                  <Users className="h-4 w-4" />
                  <p className="font-semibold">Carteira organizada</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Mesmo sistema para calçados e roupas, com visão clara de ticket e frequência.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-rule">
            <CardHeader>
              <CardTitle>Prioridade do dia</CardTitle>
              <CardDescription>Primeiros nomes que merecem atenção da equipe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCustomers.slice(0, 5).map((customer) => (
                <div className="premium-tile rounded-2xl p-4" key={customer.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-50">{customer.name}</p>
                    <Badge variant={getCustomerSegment(customer.lifetimeValue) === "premium" ? "success" : "outline"}>{getCustomerSegment(customer.lifetimeValue)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Última compra {formatDate(customer.lastPurchaseAt)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">WhatsApp {customer.whatsapp}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <RecentAreaAuditPanel
            area="Clientes"
            description="Contato preparado, cadastro salvo e reativação iniciada."
            emptyMessage="As próximas ações comerciais com clientes vão aparecer aqui."
            title="Últimas ações da carteira"
          />
        </div>
      </div>
    </div>
  );
}
