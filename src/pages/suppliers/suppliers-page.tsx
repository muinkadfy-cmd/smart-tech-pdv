import { useEffect, useMemo, useState } from "react";
import { Clock3, Handshake, Search, ShieldCheck } from "lucide-react";
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
import { useSuppliers } from "@/hooks/use-app-data";
import { confirmAction } from "@/lib/confirm-action";
import { appRepository } from "@/repositories/app-repository";
import { recordAuditEntry } from "@/services/audit/audit-log.service";
import type { SupplierFormValues } from "@/types/domain";

function createEmptySupplierDraft(): SupplierFormValues {
  return {
    name: "",
    cnpj: "",
    contact: "",
    email: "",
    leadTimeDays: 7
  };
}

export default function SuppliersPage() {
  const SUPPLIER_BASE_LIMIT = 6;
  const SUPPLIER_STEP = 6;
  const { data, loading, reload } = useSuppliers();
  const [query, setQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierDraft, setSupplierDraft] = useState<SupplierFormValues | null>(null);
  const [createDraft, setCreateDraft] = useState<SupplierFormValues>(() => createEmptySupplierDraft());
  const [visibleSupplierCount, setVisibleSupplierCount] = useState(SUPPLIER_BASE_LIMIT);
  const suppliers = data ?? [];

  function openSupplierEditor(supplier: (typeof suppliers)[number]) {
    setEditingSupplierId(supplier.id);
    setSupplierDraft({
      name: supplier.name,
      cnpj: supplier.cnpj,
      contact: supplier.contact,
      email: supplier.email,
      leadTimeDays: supplier.leadTimeDays
    });
    setFeedback(`Editando ${supplier.name}.`);
  }

  async function handleSaveSupplier() {
    if (!editingSupplierId || !supplierDraft) {
      return;
    }

    const confirmed = confirmAction(`Salvar alterações de ${supplierDraft.name}? O fornecedor será atualizado na base local.`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateSupplier(editingSupplierId, supplierDraft);
      reload();
      setFeedback("Fornecedor atualizado com sucesso.");
      setEditingSupplierId(null);
      setSupplierDraft(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o fornecedor.");
    }
  }

  async function handleCreateSupplier() {
    if (!createDraft.name.trim() || !createDraft.contact.trim()) {
      setFeedback("Preencha ao menos nome e contato principal para criar o fornecedor.");
      return;
    }

    const confirmed = confirmAction(`Criar ${createDraft.name.trim()} na base local de fornecedores?`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.createSupplier({
        ...createDraft,
        name: createDraft.name.trim(),
        cnpj: createDraft.cnpj.trim(),
        contact: createDraft.contact.trim(),
        email: createDraft.email.trim()
      });
      reload();
      setCreateDraft(createEmptySupplierDraft());
      setFeedback("Fornecedor criado com sucesso na base local.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível criar o fornecedor.");
    }
  }

  async function handleSupplierStatus(supplier: (typeof suppliers)[number], nextStatus: "active" | "inactive") {
    const confirmed = confirmAction(`${nextStatus === "inactive" ? "Inativar" : "Reativar"} ${supplier.name}? A base comercial sera preservada.`);
    if (!confirmed) {
      return;
    }

    try {
      await appRepository.updateSupplierStatus(supplier.id, nextStatus);
      reload();
      setFeedback(`Fornecedor ${supplier.name} ${nextStatus === "inactive" ? "inativado" : "reativado"} com sucesso.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível atualizar o status do fornecedor.");
    }
  }

  async function handleCopySupplierSummary(supplier: (typeof suppliers)[number]) {
    const payload = `${supplier.name} • ${supplier.contact} • ${supplier.email} • prazo ${supplier.leadTimeDays} dias`;
    try {
      await navigator.clipboard.writeText(payload);
      recordAuditEntry({
        area: "Fornecedores",
        action: supplier.leadTimeDays > 12 ? "Negociação retomada" : "Contato preparado",
        details: `${supplier.name} teve resumo/copiar contato preparado para compras.`
      });
      setFeedback(`Resumo de ${supplier.name} copiado para negociação.`);
    } catch {
      setFeedback(`Não foi possível copiar o resumo de ${supplier.name}.`);
    }
  }

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesLead =
        leadFilter === "all" ||
        (leadFilter === "agil" && supplier.leadTimeDays <= 8) ||
        (leadFilter === "medio" && supplier.leadTimeDays > 8 && supplier.leadTimeDays <= 12) ||
        (leadFilter === "critico" && supplier.leadTimeDays > 12);
      const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
      const matchesQuery = normalizedQuery.length === 0 || [supplier.name, supplier.contact, supplier.email, supplier.cnpj].join(" ").toLowerCase().includes(normalizedQuery);

      return matchesLead && matchesStatus && matchesQuery;
    });
  }, [suppliers, query, leadFilter, statusFilter]);

  const agileCount = useMemo(() => filteredSuppliers.filter((supplier) => supplier.leadTimeDays <= 8).length, [filteredSuppliers]);
  const criticalCount = useMemo(() => filteredSuppliers.filter((supplier) => supplier.leadTimeDays > 12).length, [filteredSuppliers]);
  const inactiveSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.status === "inactive").length, [suppliers]);
  const visibleSuppliers = useMemo(() => filteredSuppliers.slice(0, visibleSupplierCount), [filteredSuppliers, visibleSupplierCount]);

  useEffect(() => {
    setVisibleSupplierCount(SUPPLIER_BASE_LIMIT);
  }, [query, leadFilter, statusFilter, suppliers.length]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        badge="Compras mais previsiveis"
        compact
        description="Fornecedores com leitura direta de contato, prazo e base de produtos vinculados para acelerar reposicao."
        eyebrow="Fornecedores"
        title="Base de parceiros comerciais"
      />

      {feedback ? <div className="system-alert system-alert--info">{feedback}</div> : null}

      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        <Card className="surface-rule"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Parceiros ativos</p><p className="font-display text-3xl font-semibold text-slate-50">{filteredSuppliers.length}</p><p className="text-sm text-muted-foreground">Base filtrada para decisão rápida.</p></CardContent></Card>
        <Card className="surface-rule"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prazo ágil</p><p className="font-display text-3xl font-semibold text-slate-50">{agileCount}</p><p className="text-sm text-muted-foreground">Fornecedores com reposição mais segura.</p></CardContent></Card>
        <Card className="surface-rule"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prazo crítico</p><p className="font-display text-3xl font-semibold text-slate-50">{criticalCount}</p><p className="text-sm text-muted-foreground">Merecem compra antecipada ou plano B.</p></CardContent></Card>
        <Card className="surface-rule"><CardContent className="space-y-2 p-5"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Inativos</p><p className="font-display text-3xl font-semibold text-slate-50">{inactiveSuppliers}</p><p className="text-sm text-muted-foreground">Base preservada sem apagar histórico.</p></CardContent></Card>
      </div>

      <Card className="surface-rule">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 premium-tile rounded-2xl px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input className="h-auto border-0 bg-transparent p-0 shadow-none focus:ring-0" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por fornecedor, contato, email ou CNPJ" value={query} />
          </div>
            <select className="native-select h-11 text-sm" onChange={(event) => setLeadFilter(event.target.value)} value={leadFilter}>
            <option value="all">Todos prazos</option>
            <option value="agil">Até 8 dias</option>
            <option value="medio">9 a 12 dias</option>
            <option value="critico">Acima de 12 dias</option>
          </select>
          <select className="native-select h-11 text-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos status</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="grid gap-4 2xl:grid-cols-2">
          {filteredSuppliers.length > 0 ? (
            visibleSuppliers.map((supplier) => (
              <Card className={`surface-rule ${supplier.status === "inactive" ? "opacity-75" : ""}`} key={supplier.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-2xl font-semibold text-slate-50">{supplier.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{supplier.cnpj}</p>
                    </div>
                    <Badge variant={supplier.status === "inactive" ? "outline" : supplier.leadTimeDays <= 8 ? "success" : supplier.leadTimeDays <= 12 ? "warning" : "outline"}>{supplier.status === "inactive" ? "inativo" : `${supplier.leadTimeDays} dias`}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="premium-tile rounded-2xl p-3 text-sm text-muted-foreground">Contato: {supplier.contact}</div>
                    <div className="premium-tile rounded-2xl p-3 text-sm text-muted-foreground">Email: {supplier.email}</div>
                    <div className="premium-tile rounded-2xl p-3 text-sm text-muted-foreground">Prazo: {supplier.leadTimeDays} dias</div>
                    <div className="premium-tile rounded-2xl p-3 text-sm text-muted-foreground">Produtos vinculados: {supplier.linkedProducts}</div>
                  </div>
                  {editingSupplierId === supplier.id && supplierDraft ? (
                    <div className="space-y-3 rounded-2xl border border-[rgba(201,168,111,0.16)] bg-[linear-gradient(180deg,rgba(43,43,50,0.96),rgba(28,28,34,0.98))] p-4">
                      <FormAssistPanel
                        description="Se o operador não tiver todos os dados na hora, priorize nome, contato e prazo. O resto pode ser refinado sem travar a compra."
                        tips={[
                          "Prazo em dias é o campo que mais ajuda a equipe a prever reposição.",
                          "Contato principal precisa estar atualizado para não perder tempo no fechamento da compra.",
                          "CNPJ e email podem ser revisados depois se a negociação estiver correndo."
                        ]}
                        title="Preenchimento seguro para compras"
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                      <Input onChange={(event) => setSupplierDraft((current) => current ? { ...current, name: event.target.value } : current)} value={supplierDraft.name} />
                      <Input onChange={(event) => setSupplierDraft((current) => current ? { ...current, cnpj: event.target.value } : current)} value={supplierDraft.cnpj} />
                      <Input onChange={(event) => setSupplierDraft((current) => current ? { ...current, contact: event.target.value } : current)} value={supplierDraft.contact} />
                      <Input onChange={(event) => setSupplierDraft((current) => current ? { ...current, email: event.target.value } : current)} value={supplierDraft.email} />
                      <Input className="md:col-span-2" min={0} onChange={(event) => setSupplierDraft((current) => current ? { ...current, leadTimeDays: Number(event.target.value) || 0 } : current)} type="number" value={supplierDraft.leadTimeDays} />
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button onClick={() => void handleSaveSupplier()} size="sm">
                          Salvar fornecedor
                        </Button>
                        <Button onClick={() => { setEditingSupplierId(null); setSupplierDraft(null); }} size="sm" variant="outline">
                          Cancelar
                        </Button>
                      </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className={buttonVariants({ size: "sm" })} to="/compras">
                      Abrir compras
                    </Link>
                    <Button onClick={() => openSupplierEditor(supplier)} size="sm" variant="outline">
                      Editar
                    </Button>
                    <Button onClick={() => void handleCopySupplierSummary(supplier)} size="sm" variant="outline">
                      {supplier.leadTimeDays > 12 ? "Renovar negociação" : "Copiar contato"}
                    </Button>
                    <Button onClick={() => void handleSupplierStatus(supplier, supplier.status === "inactive" ? "active" : "inactive")} size="sm" variant={supplier.status === "inactive" ? "secondary" : "destructive"}>
                      {supplier.status === "inactive" ? "Reativar" : "Inativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
          <Card className="surface-rule xl:col-span-2"><CardContent className="p-5"><div className="empty-state-box text-sm">Nenhum fornecedor encontrado nesse recorte.</div></CardContent></Card>
          )}
        </div>
        <ResultLimitControl
          baseCount={SUPPLIER_BASE_LIMIT}
          itemLabel="fornecedores"
          onReset={() => setVisibleSupplierCount(SUPPLIER_BASE_LIMIT)}
          onShowMore={() => setVisibleSupplierCount((current) => Math.min(current + SUPPLIER_STEP, filteredSuppliers.length))}
          totalCount={filteredSuppliers.length}
          visibleCount={visibleSuppliers.length}
        />

        <div className="space-y-6">
          <Card className="surface-rule">
            <CardHeader>
              <CardTitle>Novo fornecedor</CardTitle>
              <CardDescription>Cadastro curto para liberar compra sem deixar a equipe travada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormAssistPanel
                description="Quando a negociação estiver correndo, nome, contato e prazo já resolvem quase toda a operação."
                tips={[
                  "CNPJ pode entrar depois se a prioridade for abrir o relacionamento comercial.",
                  "Prazo de entrega ajuda o estoque a decidir compra e cobertura.",
                  "Email é útil para deixar pedido, orçamento e cobrança mais organizados."
                ]}
                title="Cadastro rápido de parceiro"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Input onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nome do fornecedor" value={createDraft.name} />
                <Input onChange={(event) => setCreateDraft((current) => ({ ...current, cnpj: event.target.value }))} placeholder="CNPJ" value={createDraft.cnpj} />
                <Input onChange={(event) => setCreateDraft((current) => ({ ...current, contact: event.target.value }))} placeholder="Contato principal" value={createDraft.contact} />
                <Input onChange={(event) => setCreateDraft((current) => ({ ...current, email: event.target.value }))} placeholder="Email comercial" value={createDraft.email} />
                <Input
                  className="md:col-span-2"
                  min={0}
                  onChange={(event) => setCreateDraft((current) => ({ ...current, leadTimeDays: Number(event.target.value) || 0 }))}
                  placeholder="Prazo em dias"
                  type="number"
                  value={createDraft.leadTimeDays}
                />
              </div>
              <div className="premium-tile rounded-2xl p-4 text-sm text-muted-foreground">
                O fornecedor entra ativo e disponível para novas compras logo após o cadastro.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleCreateSupplier()}>
                  Criar fornecedor
                </Button>
                <Button onClick={() => setCreateDraft(createEmptySupplierDraft())} variant="outline">
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-rule">
            <CardHeader>
              <CardTitle>Radar de compra</CardTitle>
              <CardDescription>O que a equipe precisa enxergar antes de soltar pedido.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="premium-tile rounded-2xl p-4"><div className="flex items-center gap-2 text-slate-50"><Clock3 className="h-4 w-4" /><p className="font-semibold">Prazo manda no giro</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Fornecedor com prazo maior precisa entrar antes no radar de reposição.</p></div>
              <div className="premium-tile rounded-2xl p-4"><div className="flex items-center gap-2 text-slate-50"><Handshake className="h-4 w-4" /><p className="font-semibold">Contato pronto</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Deixe o melhor contato visível para a equipe não perder tempo procurando.</p></div>
              <div className="premium-tile rounded-2xl p-4"><div className="flex items-center gap-2 text-slate-50"><ShieldCheck className="h-4 w-4" /><p className="font-semibold">Plano B definido</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Quanto mais crítico o prazo, mais importante ter um fornecedor reserva.</p></div>
            </CardContent>
          </Card>

          <Card className="surface-rule">
            <CardHeader>
              <CardTitle>Top prioridade</CardTitle>
              <CardDescription>Quem deve ser revisado agora.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...filteredSuppliers].sort((a, b) => b.leadTimeDays - a.leadTimeDays).slice(0, 5).map((supplier) => (
                <div className="premium-tile rounded-2xl p-4" key={supplier.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-50">{supplier.name}</p>
                    <Badge variant={supplier.leadTimeDays > 12 ? "warning" : "outline"}>{supplier.leadTimeDays} dias</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{supplier.contact} • {supplier.email}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <RecentAreaAuditPanel
            area="Fornecedores"
            description="Negociações retomadas, contato preparado e cadastro revisado."
            emptyMessage="As próximas ações com fornecedores vão aparecer aqui."
            title="Últimas ações da base"
          />
        </div>
      </div>
    </div>
  );
}
