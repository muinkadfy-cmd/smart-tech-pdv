import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shared/module-header";
import { FormAssistPanel } from "@/components/shared/form-assist-panel";
import { PageLoader } from "@/components/shared/page-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LABEL_PRINT_TEMPLATE_OPTIONS, SALE_PRINT_BEHAVIOR_OPTIONS, SALE_PRINT_TEMPLATE_OPTIONS } from "@/features/printing/printing.service";
import { useSettingsSnapshot } from "@/hooks/use-app-data";
import {
  ACTION_LABELS,
  APP_ACTION_KEYS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  createLocalUserProfile,
  filterNavigationItemsByRole,
  filterNavigationItemsForProfile,
  getAllowedActionKeysByRole,
  getAllowedNavigationPathsByRole,
  getDefaultLocalUsers,
  getDefaultUserProfile,
  getRoleLabel,
  hasActionAccess,
  hasActionAccessForProfile,
  normalizeLocalUsers,
  resolveActiveLocalUser,
  resolveActiveLocalUserProfile
} from "@/lib/access-control";
import { confirmAction } from "@/lib/confirm-action";
import { applyAppTheme } from "@/lib/theme";
import { appRepository } from "@/repositories/app-repository";
import { navigationItems } from "@/routes/navigation";
import type { AppActionKey, LocalUserProfile, NavItem, SettingsSnapshot, UserRole } from "@/types/domain";

const defaultProfile = getDefaultUserProfile();
const roleOrder: UserRole[] = ["operador", "admin", "super_admin"];
const rolePresets: Array<{ role: UserRole; profileName: string; badge: string }> = [
  { role: "operador", profileName: "Operador do caixa", badge: "Caixa" },
  { role: "admin", profileName: "Gestor local", badge: "Loja" },
  { role: "super_admin", profileName: "Super admin master", badge: "Sistema" }
];

const initialForm: SettingsSnapshot = {
  companyName: "",
  document: "",
  legalName: "",
  stateRegistration: "",
  companyPhone: "",
  companyWhatsapp: "",
  companyEmail: "",
  addressLine: "",
  addressNumber: "",
  addressDistrict: "",
  addressCity: "",
  addressState: "",
  addressPostalCode: "",
  theme: "Windows Contrast",
  activeLocalUserId: "local-admin-1",
  localUsers: getDefaultLocalUsers(),
  currentUserName: defaultProfile.currentUserName,
  currentUserRole: defaultProfile.currentUserRole,
  notifyUpdates: "on",
  notifyLowStock: "on",
  notifyOrders: "on",
  notifyFinance: "on",
  notifySync: "on",
  thermalPrinter58: "POS-RAM BT 58mm",
  thermalPrinter80: "POS-RAM BT 80mm",
  defaultSalePrintTemplate: "tpl-58",
  defaultLabelTemplate: "tpl-label",
  salePrintBehavior: "preview",
  autoBackup: "Diario as 22:00",
  updaterChannel: "stable"
};

const companyFieldGroups: Array<Array<{ field: keyof SettingsSnapshot; label: string; className?: string; maxLength?: number }>> = [
  [
    { field: "companyName", label: "Nome fantasia" },
    { field: "legalName", label: "Razão social" },
    { field: "document", label: "CNPJ / documento principal" }
  ],
  [
    { field: "stateRegistration", label: "Inscrição estadual" },
    { field: "companyPhone", label: "Telefone" },
    { field: "companyWhatsapp", label: "WhatsApp" }
  ],
  [
    { field: "companyEmail", label: "E-mail operacional", className: "md:col-span-2 xl:col-span-2" },
    { field: "addressLine", label: "Logradouro", className: "md:col-span-2 xl:col-span-2" },
    { field: "addressNumber", label: "Número" }
  ],
  [
    { field: "addressDistrict", label: "Bairro" },
    { field: "addressCity", label: "Cidade" },
    { field: "addressState", label: "UF", maxLength: 2 }
  ],
  [{ field: "addressPostalCode", label: "CEP" }]
];

function groupNavigation(items: NavItem[]) {
  const groups = new Map<string, NavItem[]>();
  items.forEach((item) => {
    const current = groups.get(item.group) ?? [];
    current.push(item);
    groups.set(item.group, current);
  });
  return [...groups.entries()];
}

function buildAddressSummary(form: SettingsSnapshot) {
  return [
    [form.addressLine.trim(), form.addressNumber.trim()].filter(Boolean).join(", "),
    form.addressDistrict.trim(),
    [form.addressCity.trim(), form.addressState.trim()].filter(Boolean).join(" - "),
    form.addressPostalCode.trim() ? `CEP ${form.addressPostalCode.trim()}` : ""
  ]
    .filter(Boolean)
    .join(" • ");
}

function syncFormWithActiveLocalUser(form: SettingsSnapshot): SettingsSnapshot {
  const resolved = resolveActiveLocalUser(form.localUsers, form.activeLocalUserId);
  return {
    ...form,
    activeLocalUserId: resolved.activeLocalUserId,
    localUsers: resolved.localUsers,
    currentUserName: resolved.currentUserName,
    currentUserRole: resolved.currentUserRole
  };
}

export default function SettingsPage() {
  const { data, loading, reload } = useSettingsSnapshot();
  const [form, setForm] = useState<SettingsSnapshot>(initialForm);
  const [selectedLocalUserId, setSelectedLocalUserId] = useState(initialForm.activeLocalUserId);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      const nextForm = syncFormWithActiveLocalUser({ ...data, theme: "Windows Contrast" });
      setForm(nextForm);
      setSelectedLocalUserId(nextForm.activeLocalUserId);
    }
  }, [data]);

  useEffect(() => {
    applyAppTheme(form.theme);
  }, [form.theme]);

  const groupedNavigation = useMemo(() => groupNavigation(navigationItems), []);
  const roleAccessMap = useMemo(
    () =>
      roleOrder.reduce<Record<UserRole, NavItem[]>>(
        (acc, role) => ({ ...acc, [role]: filterNavigationItemsByRole(navigationItems, role) }),
        { operador: [], admin: [], super_admin: [] }
      ),
    []
  );
  const activeLocalUser = useMemo(
    () => resolveActiveLocalUserProfile(form.localUsers, form.activeLocalUserId),
    [form.activeLocalUserId, form.localUsers]
  );
  const currentRoleItems = useMemo(
    () => filterNavigationItemsForProfile(navigationItems, activeLocalUser, form.currentUserRole),
    [activeLocalUser, form.currentUserRole]
  );
  const companyChecks = useMemo(
    () => [
      { label: "Identificação comercial", ok: form.companyName.trim().length > 2 && form.legalName.trim().length > 2 },
      { label: "Cadastro fiscal", ok: form.document.trim().length > 8 && form.stateRegistration.trim().length > 3 },
      { label: "Contato", ok: form.companyPhone.trim().length > 7 && form.companyEmail.trim().length > 5 },
      {
        label: "Endereço",
        ok:
          form.addressLine.trim().length > 2 &&
          form.addressNumber.trim().length > 0 &&
          form.addressCity.trim().length > 1 &&
          form.addressState.trim().length > 1 &&
          form.addressPostalCode.trim().length > 7
      }
    ],
    [form]
  );
  const companyCompleteness = useMemo(() => Math.round((companyChecks.filter((item) => item.ok).length / companyChecks.length) * 100), [companyChecks]);
  const companySummary = useMemo(() => buildAddressSummary(form), [form]);
  const currentRoleGroups = useMemo(() => new Set(currentRoleItems.map((item) => item.group)).size, [currentRoleItems]);
  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(data ?? initialForm), [data, form]);
  const selectedLocalUser = useMemo(
    () => form.localUsers.find((user) => user.id === selectedLocalUserId) ?? form.localUsers[0] ?? null,
    [form.localUsers, selectedLocalUserId]
  );
  const actionEntries = useMemo(() => Object.entries(ACTION_LABELS), []);
  const selectedLocalUserNavItems = useMemo(
    () => (selectedLocalUser ? filterNavigationItemsForProfile(navigationItems, selectedLocalUser, selectedLocalUser.role) : []),
    [selectedLocalUser]
  );
  const selectedLocalUserActionCount = useMemo(
    () =>
      selectedLocalUser
        ? APP_ACTION_KEYS.filter((actionKey) => hasActionAccessForProfile(selectedLocalUser, actionKey, selectedLocalUser.role)).length
        : 0,
    [selectedLocalUser]
  );

  async function handleSave() {
    const roleChanged = data && form.currentUserRole !== data.currentUserRole;
    if (roleChanged) {
      const confirmed = confirmAction(
        form.currentUserRole === "operador"
          ? "Salvar a instalação em modo Operador? Áreas administrativas ficarão ocultas até outro perfil local assumir a gestão."
          : `Salvar o perfil local como ${getRoleLabel(form.currentUserRole).toLowerCase()}?`
      );
      if (!confirmed) return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const saved = await appRepository.updateSettings({ ...form, theme: "Windows Contrast" });
      const synced = syncFormWithActiveLocalUser(saved);
      setForm(synced);
      setSelectedLocalUserId(synced.activeLocalUserId);
      setFeedback("Configurações salvas no banco local com sucesso.");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SettingsSnapshot>(field: K, value: SettingsSnapshot[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "currentUserName" || field === "currentUserRole") {
        const nextUsers = current.localUsers.map((user) =>
          user.id === current.activeLocalUserId
            ? {
                ...user,
                name: field === "currentUserName" ? String(value) : user.name,
                role: field === "currentUserRole" ? (value as UserRole) : user.role
              }
            : user
        );
        return syncFormWithActiveLocalUser({ ...next, localUsers: nextUsers });
      }
      return next;
    });
  }

  function applyRolePreset(role: UserRole) {
    const preset = rolePresets.find((entry) => entry.role === role);
    setForm((current) =>
      syncFormWithActiveLocalUser({
        ...current,
        localUsers: current.localUsers.map((user) =>
          user.id === current.activeLocalUserId
            ? { ...user, role, name: preset?.profileName ?? current.currentUserName, permissionMode: "role" }
            : user
        )
      })
    );
  }

  function updateSelectedLocalUser(patch: Partial<LocalUserProfile>) {
    if (!selectedLocalUser) {
      return;
    }

    setForm((current) => {
      const nextUsers = current.localUsers.map((user) =>
        user.id === selectedLocalUser.id
          ? {
              ...user,
              ...patch,
              role: patch.role ? patch.role : user.role,
              name: patch.name !== undefined ? patch.name : user.name,
              pin: patch.pin !== undefined ? patch.pin : user.pin,
              status: patch.status ?? user.status
            }
          : user
      );
      return syncFormWithActiveLocalUser({ ...current, localUsers: normalizeLocalUsers(nextUsers) });
    });
  }

  function handleAddLocalUser() {
    const nextUser = createLocalUserProfile({
      name: `Usuario local ${form.localUsers.length + 1}`,
      role: "operador"
    });

    setForm((current) =>
      syncFormWithActiveLocalUser({
        ...current,
        localUsers: [...current.localUsers, nextUser]
      })
    );
    setSelectedLocalUserId(nextUser.id);
    setFeedback("Novo perfil local criado. Ajuste nome, papel e PIN antes de salvar.");
    setError(null);
  }

  function handleActivateLocalUser(userId: string) {
    setForm((current) =>
      syncFormWithActiveLocalUser({
        ...current,
        activeLocalUserId: userId
      })
    );
    setSelectedLocalUserId(userId);
    setFeedback("Perfil local ativo alterado. Salve para aplicar na instalação.");
    setError(null);
  }

  function handleToggleLocalUserStatus(user: LocalUserProfile) {
    const activeUsers = form.localUsers.filter((entry) => entry.status === "active");
    if (user.status === "active" && activeUsers.length <= 1) {
      setError("A instalação precisa manter ao menos um perfil local ativo.");
      return;
    }

    updateSelectedLocalUser({
      status: user.status === "active" ? "inactive" : "active"
    });
    setFeedback(`${user.name} ${user.status === "active" ? "marcado como inativo" : "reativado"} no cadastro local.`);
    setError(null);
  }

  function handleSelectedLocalUserPermissionModeChange(nextMode: "role" | "custom") {
    if (!selectedLocalUser) {
      return;
    }

    if (nextMode === "custom") {
      updateSelectedLocalUser({
        permissionMode: "custom",
        allowedNavPaths: selectedLocalUser.allowedNavPaths.length
          ? selectedLocalUser.allowedNavPaths
          : getAllowedNavigationPathsByRole(navigationItems, selectedLocalUser.role),
        allowedActions: selectedLocalUser.allowedActions.length
          ? selectedLocalUser.allowedActions
          : getAllowedActionKeysByRole(selectedLocalUser.role)
      });
      setFeedback(`Permissões personalizadas liberadas para ${selectedLocalUser.name}.`);
      setError(null);
      return;
    }

    updateSelectedLocalUser({ permissionMode: "role" });
    setFeedback(`${selectedLocalUser.name} voltou a herdar as permissões padrão do papel.`);
    setError(null);
  }

  function handleToggleSelectedLocalUserNav(path: string) {
    if (!selectedLocalUser) {
      return;
    }

    const nextPaths = new Set(selectedLocalUser.allowedNavPaths);
    if (nextPaths.has(path)) {
      nextPaths.delete(path);
    } else {
      nextPaths.add(path);
    }

    updateSelectedLocalUser({
      allowedNavPaths: navigationItems.filter((item) => nextPaths.has(item.path)).map((item) => item.path)
    });
  }

  function handleToggleSelectedLocalUserAction(actionKey: AppActionKey) {
    if (!selectedLocalUser) {
      return;
    }

    const nextActions = new Set(selectedLocalUser.allowedActions);
    if (nextActions.has(actionKey)) {
      nextActions.delete(actionKey);
    } else {
      nextActions.add(actionKey);
    }

    updateSelectedLocalUser({
      allowedActions: APP_ACTION_KEYS.filter((entry) => nextActions.has(entry))
    });
  }

  if (loading || !data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <ModuleHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={hasChanges ? "warning" : "success"}>{hasChanges ? "Alterações pendentes" : "Tudo salvo"}</Badge>
            <Button disabled={!hasChanges || saving} onClick={handleSave}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
          </div>
        }
        badge="Empresa, níveis e permissões mais claros"
        description="Configurações mais diretas para loja, impressão, alertas e release sem alongar a operação."
        eyebrow="Configurações"
        title="Painel de ajustes do sistema"
      />

      {error ? <div className="system-alert system-alert--error">{error}</div> : null}
      {feedback ? <div className="system-alert system-alert--success">{feedback}</div> : null}

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="acesso">Acesso</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="impressao">Impressão</TabsTrigger>
          <TabsTrigger value="pdv">PDV</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="atualizacoes">Atualizações</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        </TabsList>

        <FormAssistPanel
          className="settings-guide-panel"
          description="Altere configurações com calma e salve no fim. Se tiver dúvida, priorize empresa, acesso, impressão e alertas; o resto pode ser refinado depois sem parar a loja."
          tips={[
            "O perfil local define exatamente quais abas entram no menu da instalação offline.",
            "Cadastre empresa e contato completos para cupom, relatório e suporte ficarem mais profissionais.",
            "Canal stable continua sendo o mais indicado para cliente final."
          ]}
          title="Guia rápido para operador e gestor"
        />

        <TabsContent value="acesso">
          <Card className="surface-rule executive-panel shadow-card">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Nome do perfil local</p>
                      <Input onChange={(event) => updateField("currentUserName", event.target.value)} value={form.currentUserName} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Papel do perfil local</p>
                      <select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("currentUserRole", event.target.value as SettingsSnapshot["currentUserRole"])} value={form.currentUserRole}>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">Presets rápidos de abertura</p>
                    <div className="flex flex-wrap gap-3">
                      {rolePresets.map((preset) => (
                        <Button key={preset.role} className="min-w-[170px] justify-start" onClick={() => applyRolePreset(preset.role)} size="sm" type="button" variant={form.currentUserRole === preset.role ? "default" : "outline"}>
                          <span>{ROLE_LABELS[preset.role]}</span>
                          <Badge className="ml-auto" variant={form.currentUserRole === preset.role ? "secondary" : "outline"}>{preset.badge}</Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="premium-tile space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">Perfil ativo</Badge>
                    <Badge variant="outline">{currentRoleItems.length} módulos</Badge>
                    <Badge variant="outline">{currentRoleGroups} grupos</Badge>
                    <Badge variant="outline">{activeLocalUser.permissionMode === "custom" ? "Permissão personalizada" : "Herança do papel"}</Badge>
                  </div>
                  <p className="font-semibold text-slate-50">{form.currentUserName || defaultProfile.currentUserName}</p>
                  <p className="text-sm text-slate-400">Abertura local como {getRoleLabel(form.currentUserRole).toLowerCase()}.</p>
                  <p className="text-sm text-slate-400">{ROLE_DESCRIPTIONS[form.currentUserRole].summary}</p>
                  <p className="text-sm text-slate-400">{ROLE_DESCRIPTIONS[form.currentUserRole].helper}</p>
                  <Separator className="bg-white/8" />
                  <div className="flex flex-wrap gap-2">
                    {currentRoleItems.map((item) => <Badge key={item.path} variant="secondary">{item.label}</Badge>)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="premium-tile space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-50">Perfis locais da instalação</p>
                      <p className="mt-1 text-sm text-slate-400">Cada perfil local pode abrir o sistema com um papel diferente ou com permissões customizadas, sem depender de internet.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{form.localUsers.length} perfil(is)</Badge>
                      <Button onClick={handleAddLocalUser} size="sm" type="button" variant="outline">Novo perfil</Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {form.localUsers.map((user) => (
                      <button
                        className={`rounded-[18px] border px-4 py-3 text-left transition ${selectedLocalUserId === user.id ? "border-[rgba(201,168,111,0.28)] bg-[rgba(201,168,111,0.08)]" : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]"}`}
                        key={user.id}
                        onClick={() => setSelectedLocalUserId(user.id)}
                        type="button"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-50">{user.name}</p>
                            <p className="mt-1 text-sm text-slate-400">
                              {ROLE_LABELS[user.role]} • {user.permissionMode === "custom" ? "Acesso customizado" : "Herança do papel"} • PIN {user.pin?.trim() ? "configurado" : "pendente"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {form.activeLocalUserId === user.id ? <Badge variant="success">Ativo na instalação</Badge> : null}
                            <Badge variant={user.status === "active" ? "outline" : "secondary"}>{user.status === "active" ? "Disponível" : "Inativo"}</Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="premium-tile space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-50">Perfil selecionado</p>
                      <p className="mt-1 text-sm text-slate-400">Edite o usuário local escolhido e defina quem fica ativo na abertura.</p>
                    </div>
                    {selectedLocalUser ? <Badge variant="outline">{selectedLocalUser.id}</Badge> : null}
                  </div>

                  {selectedLocalUser ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{selectedLocalUserNavItems.length} abas liberadas</Badge>
                        <Badge variant="outline">{selectedLocalUserActionCount} ações liberadas</Badge>
                        <Badge variant={selectedLocalUser.permissionMode === "custom" ? "warning" : "secondary"}>
                          {selectedLocalUser.permissionMode === "custom" ? "Permissão personalizada" : "Herança do papel"}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-400">Nome</p>
                        <Input onChange={(event) => updateSelectedLocalUser({ name: event.target.value })} value={selectedLocalUser.name} />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-sm text-slate-400">Papel</p>
                          <select className="native-select h-11 w-full text-sm" onChange={(event) => updateSelectedLocalUser({ role: event.target.value as UserRole })} value={selectedLocalUser.role}>
                            {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-400">PIN local</p>
                          <Input maxLength={8} onChange={(event) => updateSelectedLocalUser({ pin: event.target.value })} placeholder="Ex.: 1020" value={selectedLocalUser.pin ?? ""} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-400">Modo de permissão</p>
                        <select
                          className="native-select h-11 w-full text-sm"
                          onChange={(event) => handleSelectedLocalUserPermissionModeChange(event.target.value as "role" | "custom")}
                          value={selectedLocalUser.permissionMode}
                        >
                          <option value="role">Herdar permissões do papel</option>
                          <option value="custom">Escolher permissões manualmente</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={selectedLocalUser.status !== "active"} onClick={() => handleActivateLocalUser(selectedLocalUser.id)} size="sm" type="button">
                          Tornar ativo no shell
                        </Button>
                        <Button onClick={() => handleToggleLocalUserStatus(selectedLocalUser)} size="sm" type="button" variant="outline">
                          {selectedLocalUser.status === "active" ? "Marcar como inativo" : "Reativar perfil"}
                        </Button>
                      </div>
                      {selectedLocalUser.permissionMode === "custom" ? (
                        <div className="space-y-4 rounded-[20px] border border-[rgba(201,168,111,0.14)] bg-[rgba(255,255,255,0.02)] p-4">
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-50">Abas liberadas para esse perfil</p>
                            <p className="text-sm text-slate-400">O sistema mantém o Painel como rota mínima para a instalação não ficar sem ponto de entrada.</p>
                          </div>
                          <div className="space-y-3">
                            {groupedNavigation.map(([group, items]) => (
                              <div className="panel-block rounded-[18px] p-3" key={`custom-nav-${group}`}>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-slate-50">{group}</p>
                                  <Badge variant="outline">
                                    {items.filter((item) => selectedLocalUserNavItems.some((entry) => entry.path === item.path)).length}/{items.length}
                                  </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {items.map((item) => {
                                    const allowed = selectedLocalUserNavItems.some((entry) => entry.path === item.path);
                                    return (
                                      <Button
                                        className="min-w-[132px] justify-start"
                                        key={`selected-user-nav-${item.path}`}
                                        onClick={() => handleToggleSelectedLocalUserNav(item.path)}
                                        size="sm"
                                        type="button"
                                        variant={allowed ? "default" : "outline"}
                                      >
                                        {item.label}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-3">
                            <p className="font-semibold text-slate-50">Ações sensíveis liberadas</p>
                            <div className="flex flex-wrap gap-2">
                              {actionEntries.map(([actionKey, meta]) => {
                                const allowed = hasActionAccessForProfile(selectedLocalUser, actionKey as AppActionKey, selectedLocalUser.role);
                                return (
                                  <Button
                                    className="min-h-[44px] min-w-[210px] justify-start text-left"
                                    key={`selected-user-action-${actionKey}`}
                                    onClick={() => handleToggleSelectedLocalUserAction(actionKey as AppActionKey)}
                                    size="sm"
                                    type="button"
                                    variant={allowed ? "default" : "outline"}
                                  >
                                    {meta.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[18px] border border-[rgba(201,168,111,0.12)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
                          Este perfil segue o pacote padrão do papel escolhido. Se quiser liberar ou cortar abas e ações específicas, troque para permissão personalizada.
                        </div>
                      )}
                      <p className="text-sm text-slate-400">
                        O perfil ativo no shell controla menu, rotas e ações sensíveis da instalação. O PIN já protege a troca rápida quando estiver configurado.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Selecione um perfil local para editar.</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {roleOrder.map((role) => (
                  <div className="premium-tile space-y-3" key={role}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-400">{ROLE_LABELS[role]}</p>
                        <p className="mt-2 font-semibold text-slate-50">{ROLE_DESCRIPTIONS[role].title}</p>
                      </div>
                      <Badge variant={form.currentUserRole === role ? "success" : "outline"}>{roleAccessMap[role].length} abas</Badge>
                    </div>
                    <p className="text-sm text-slate-400">{ROLE_DESCRIPTIONS[role].summary}</p>
                    <div className="flex flex-wrap gap-2">
                      {roleAccessMap[role].map((item) => <Badge key={`${role}-${item.path}`} variant={form.currentUserRole === role ? "secondary" : "outline"}>{item.label}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-50">Permissões por ação</p>
                    <p className="mt-1 text-sm text-slate-400">Além das abas, o sistema agora diferencia ações mais sensíveis dentro das telas principais.</p>
                  </div>
                  <Badge variant="outline">Travas operacionais reais</Badge>
                </div>

                <div className="space-y-2">
                  {actionEntries.map(([actionKey, meta]) => (
                    <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 xl:grid-cols-2 2xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]" key={actionKey}>
                      <div>
                        <p className="font-semibold text-slate-50">{meta.label}</p>
                        <p className="mt-1 text-sm text-slate-400">{meta.helper}</p>
                      </div>
                      {roleOrder.map((role) => (
                        <div className="flex items-center xl:justify-center" key={`${actionKey}-${role}`}>
                          <Badge variant={hasActionAccess(role, actionKey as keyof typeof ACTION_LABELS) ? "success" : "secondary"}>
                            {ROLE_LABELS[role]}: {hasActionAccess(role, actionKey as keyof typeof ACTION_LABELS) ? "Liberado" : "Bloqueado"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-50">Matriz de abas e permissões</p>
                    <p className="mt-1 text-sm text-slate-400">Aqui fica claro o que cada papel realmente enxerga no menu e nas rotas protegidas.</p>
                  </div>
                  <Badge variant="outline">Baseado na navegação real do sistema</Badge>
                </div>

                {groupedNavigation.map(([group, items]) => (
                  <div className="premium-tile space-y-3" key={group}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-50">{group}</p>
                      <Badge variant="outline">{items.length} abas</Badge>
                    </div>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 xl:grid-cols-2 2xl:grid-cols-[1.3fr_repeat(3,minmax(0,1fr))]" key={item.path}>
                          <div>
                            <p className="font-semibold text-slate-50">{item.label}</p>
                            <p className="mt-1 text-sm text-slate-400">{item.path}</p>
                          </div>
                          {roleOrder.map((role) => {
                            const allowed = roleAccessMap[role].some((entry) => entry.path === item.path);
                            return <div className="flex items-center xl:justify-center" key={`${item.path}-${role}`}><Badge variant={allowed ? "success" : "secondary"}>{ROLE_LABELS[role]}: {allowed ? "Liberado" : "Oculto"}</Badge></div>;
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="premium-tile">
                <p className="font-semibold text-slate-50">Regra de segurança local</p>
                <p className="mt-2 text-sm text-slate-400">Se você salvar como operador, as áreas administrativas saem do menu desta instalação. Use esse modo só quando a loja realmente quiser operação enxuta no caixa.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["notifyUpdates", "Atualizações", "Avisa quando existir nova versão, quando a instalação pedir reinício e quando a checagem falhar."],
                ["notifyLowStock", "Estoque baixo", "Liga alertas do sino para produtos críticos e reposição urgente."],
                ["notifyOrders", "Pedidos", "Mostra itens prontos para liberar e filas que merecem ação do turno."],
                ["notifyFinance", "Financeiro", "Sinaliza contas atrasadas e cobranças que não podem sair do radar."],
                ["notifySync", "Sync e licença", "Avisa fila pendente, falha de sync, modo offline e revisão de licença."]
              ].map(([field, title, helper]) => (
                <div className="space-y-2" key={field}>
                  <p className="text-sm text-slate-400">{title}</p>
                  <select className="native-select h-11 w-full text-sm" onChange={(event) => updateField(field as keyof SettingsSnapshot, event.target.value as SettingsSnapshot[keyof SettingsSnapshot])} value={form[field as keyof SettingsSnapshot] as string}>
                    <option value="on">Habilitado</option><option value="off">Desabilitado</option>
                  </select>
                  <p className="text-sm text-slate-400">{helper}</p>
                </div>
              ))}
            </div>
            <div className="premium-tile"><p className="font-semibold text-slate-50">Regra recomendada</p><p className="mt-2 text-sm text-slate-400">Deixe só os alertas que realmente precisam aparecer no topo; o resto vira ruído e atrasa a operação.</p></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="empresa">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="space-y-6 p-6">
            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="space-y-4">
                {companyFieldGroups.map((group, groupIndex) => (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" key={groupIndex}>
                    {group.map((item) => (
                      <div className={`space-y-2 ${item.className ?? ""}`.trim()} key={String(item.field)}>
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <Input maxLength={item.maxLength} onChange={(event) => updateField(item.field, item.field === "addressState" ? event.target.value.toUpperCase() : event.target.value)} value={form[item.field] as string} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="premium-tile space-y-3">
                  <div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-50">Resumo da empresa</p><Badge variant={companyCompleteness === 100 ? "success" : "warning"}>{companyCompleteness}% completo</Badge></div>
                  <p className="text-lg font-semibold text-slate-50">{form.companyName || "Nome fantasia pendente"}</p>
                  <p className="text-sm text-slate-400">{form.legalName || "Razão social pendente"}</p>
                  <p className="text-sm text-slate-400">CNPJ: {form.document || "Não informado"}</p>
                  <p className="text-sm text-slate-400">IE: {form.stateRegistration || "Não informada"}</p>
                  <p className="text-sm text-slate-400">{companySummary || "Endereço comercial ainda incompleto."}</p>
                  <p className="text-sm text-slate-400">Contato: {[form.companyPhone, form.companyWhatsapp, form.companyEmail].filter(Boolean).join(" • ") || "Contato principal pendente"}</p>
                </div>
                <div className="premium-tile space-y-3">
                  <p className="font-semibold text-slate-50">Checklist comercial</p>
                  {companyChecks.map((item) => <div className="flex items-center justify-between gap-3" key={item.label}><p className="text-sm text-slate-300">{item.label}</p><Badge variant={item.ok ? "success" : "secondary"}>{item.ok ? "Ok" : "Pendente"}</Badge></div>)}
                </div>
                <div className="premium-tile"><p className="font-semibold text-slate-50">Uso recomendado</p><p className="mt-2 text-sm text-slate-400">Com empresa completa, relatórios, impressão, suporte e apresentação comercial ficam mais profissionais para cliente final.</p></div>
              </div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="impressao">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><p className="text-sm text-slate-400">Impressora 58mm</p><Input onChange={(event) => updateField("thermalPrinter58", event.target.value)} value={form.thermalPrinter58} /></div>
              <div className="space-y-2"><p className="text-sm text-slate-400">Impressora 80mm</p><Input onChange={(event) => updateField("thermalPrinter80", event.target.value)} value={form.thermalPrinter80} /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2"><p className="text-sm text-slate-400">Impressora padrão do caixa</p><select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("defaultSalePrintTemplate", event.target.value)} value={form.defaultSalePrintTemplate}>{SALE_PRINT_TEMPLATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              <div className="space-y-2"><p className="text-sm text-slate-400">Etiqueta padrão</p><select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("defaultLabelTemplate", event.target.value)} value={form.defaultLabelTemplate}>{LABEL_PRINT_TEMPLATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              <div className="space-y-2"><p className="text-sm text-slate-400">Ação após fechar venda</p><select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("salePrintBehavior", event.target.value)} value={form.salePrintBehavior}>{SALE_PRINT_BEHAVIOR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="premium-tile"><p className="text-sm text-slate-400">Caixa rápido</p><p className="mt-2 font-semibold text-slate-50">{form.defaultSalePrintTemplate === "tpl-80" ? "Cupom detalhado 80 mm" : "Comprovante PDV 58 mm"}</p><p className="mt-2 text-sm text-slate-400">Define a térmica padrão do operador no fechamento da venda e reduz clique repetido no balcão.</p></div>
              <div className="premium-tile"><p className="text-sm text-slate-400">Política automática</p><p className="mt-2 font-semibold text-slate-50">{form.salePrintBehavior === "auto" ? "Fluxo direto do caixa" : form.salePrintBehavior === "preview" ? "Abre preview para conferência" : "Fluxo manual"}</p><p className="mt-2 text-sm text-slate-400">Mantém o offline forte e deixa a loja escolher entre revisão visual ou saída direta em 58/80 mm.</p></div>
              <div className="premium-tile"><p className="text-sm text-slate-400">Termicas configuradas</p><p className="mt-2 font-semibold text-slate-50">{form.thermalPrinter58 || "58 mm pendente"} • {form.thermalPrinter80 || "80 mm pendente"}</p><p className="mt-2 text-sm text-slate-400">O fluxo comercial principal agora fica focado só nas duas térmicas do caixa.</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="pdv">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="grid gap-4 p-6 md:grid-cols-3">
            {[
              ["Atalhos de teclado", "F9 para fechamento e Ctrl+K para busca."],
              ["Cliente opcional", "Fluxo preparado para venda rápida sem travar a operação do balcão."],
              ["Desconto controlado", "Base pronta para governança por usuário e permissões futuras."]
            ].map(([title, helper]) => <div className="premium-tile" key={title}><p className="font-semibold text-slate-50">{title}</p><p className="mt-2 text-sm text-slate-400">{helper}</p></div>)}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-2"><p className="text-sm text-slate-400">Rotina automática</p><select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("autoBackup", event.target.value)} value={form.autoBackup}><option value="Diario as 22:00">Diário às 22:00</option><option value="Diario as 18:00">Diário às 18:00</option><option value="A cada 6 horas">A cada 6 horas</option><option value="Manual com alerta">Manual com alerta</option></select></div>
            <div className="premium-tile"><p className="text-sm text-slate-400">Modo atual</p><p className="mt-2 font-semibold text-slate-50">{form.autoBackup === "Diario as 22:00" ? "Diário às 22:00" : form.autoBackup === "Diario as 18:00" ? "Diário às 18:00" : form.autoBackup}</p><p className="mt-2 text-sm text-slate-400">Mantém o desktop pronto para o cliente trabalhar offline com risco menor de perda.</p></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="atualizacoes">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-2"><p className="text-sm text-slate-400">Canal do updater</p><select className="native-select h-11 w-full text-sm" onChange={(event) => updateField("updaterChannel", event.target.value)} value={form.updaterChannel}><option value="stable">Stable</option><option value="beta">Beta</option></select></div>
            <div className="premium-tile"><p className="text-sm text-slate-400">Política recomendada</p><p className="mt-2 font-semibold text-slate-50">{form.updaterChannel === "beta" ? "Beta para homologação" : "Stable para cliente final"}</p><p className="mt-2 text-sm text-slate-400">Deixa a operação principal protegida e leva melhorias por pacote futuro.</p></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card className="surface-rule executive-panel shadow-card"><CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-2"><p className="text-sm text-slate-400">Tema da interface</p><div className="premium-tile"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-50">Windows Contrast</p><p className="mt-2 text-sm text-slate-400">Tema único do sistema, fixado para manter leitura forte, estrutura de software pago e navegação clara para o operador.</p></div><Badge variant="success">Ativo</Badge></div></div></div>
            <div className="premium-tile"><p className="text-sm text-slate-400">Estilo atual</p><p className="mt-2 font-semibold text-slate-50">Windows Contrast</p><p className="mt-2 text-sm text-slate-400">Pensado para parecer app desktop instalado, com contornos mais fortes, contraste mais claro e leitura firme no monitor comercial.</p></div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
