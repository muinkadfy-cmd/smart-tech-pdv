import type { AppActionKey, LocalUserProfile, NavItem, QuickAction, UserRole } from "@/types/domain";

export const DEFAULT_LOCAL_USER_NAME = "Gestor local";
export const DEFAULT_LOCAL_USER_ROLE: UserRole = "admin";
export const FIXED_SUPER_ADMIN_NAME = "Super admin master";
export const FIXED_SUPER_ADMIN_ROLE: UserRole = "super_admin";

export const ROLE_LABELS: Record<UserRole, string> = {
  operador: "Operador",
  admin: "Administrador",
  super_admin: "Super admin"
};

export const ROLE_DESCRIPTIONS: Record<UserRole, { title: string; summary: string; helper: string }> = {
  operador: {
    title: "Frente de loja",
    summary: "Mantem PDV, clientes, pedidos e rotina operacional visiveis.",
    helper: "Ideal para caixa, atendimento rapido e equipe que nao deve ver areas administrativas."
  },
  admin: {
    title: "Gestao da loja",
    summary: "Libera compras, financeiro, relatorios, impressao e configuracoes.",
    helper: "Perfil recomendado para gestor local e fechamento administrativo do dia."
  },
  super_admin: {
    title: "Sistema e suporte",
    summary: "Acrescenta licenca, backup, updates e diagnostico tecnico.",
    helper: "Use quando precisar revisar instalacao, suporte, auditoria tecnica ou release."
  }
};

export const ACTION_LABELS: Record<AppActionKey, { label: string; helper: string; minRole: UserRole }> = {
  catalog_manage: {
    label: "Editar cadastro de produto",
    helper: "Criar, editar, duplicar e inativar SKU no catálogo.",
    minRole: "admin"
  },
  catalog_view_cost: {
    label: "Ver custo e margem base",
    helper: "Exibe preço de custo e informações mais sensíveis de composição comercial.",
    minRole: "admin"
  },
  stock_manage: {
    label: "Registrar entradas e saídas manuais",
    helper: "Permite lançar reposição, baixa manual e ajuste fora da venda automática.",
    minRole: "admin"
  },
  stock_inventory: {
    label: "Executar inventário e conferência",
    helper: "Libera ajustes de contagem física e fechamento de recebimento guiado.",
    minRole: "admin"
  },
  pdv_discount: {
    label: "Aplicar desconto no PDV",
    helper: "Libera desconto manual no carrinho principal e no fechamento da venda.",
    minRole: "admin"
  },
  print_labels: {
    label: "Imprimir etiquetas de produto",
    helper: "Libera preview e impressão de etiqueta fora do fluxo automático do caixa.",
    minRole: "admin"
  },
  user_switch: {
    label: "Trocar usuário da instalação",
    helper: "Permite alternar rapidamente o perfil local ativo no shell do sistema.",
    minRole: "operador"
  },
  user_manage: {
    label: "Gerenciar perfis locais",
    helper: "Criar, editar, ativar e inativar perfis locais da instalação offline.",
    minRole: "admin"
  }
};

export const APP_ACTION_KEYS = Object.keys(ACTION_LABELS) as AppActionKey[];

const ROLE_ORDER: Record<UserRole, number> = {
  operador: 0,
  admin: 1,
  super_admin: 2
};

export function hasRoleAccess(currentRole: UserRole, requiredRole: UserRole = "operador") {
  return ROLE_ORDER[currentRole] >= ROLE_ORDER[requiredRole];
}

export function getDefaultRole() {
  return DEFAULT_LOCAL_USER_ROLE;
}

export function normalizeUserRole(role: string | null | undefined): UserRole {
  if (role === "operador" || role === "admin" || role === "super_admin") {
    return role;
  }

  return getDefaultRole();
}

export function getDefaultUserProfile() {
  return {
    currentUserName: DEFAULT_LOCAL_USER_NAME,
    currentUserRole: DEFAULT_LOCAL_USER_ROLE
  };
}

function normalizeNavPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniquePaths = new Set<string>();
  value.forEach((entry) => {
    if (typeof entry !== "string") {
      return;
    }

    const trimmed = entry.trim();
    if (trimmed) {
      uniquePaths.add(trimmed);
    }
  });

  return [...uniquePaths];
}

function normalizeActionKeys(value: unknown): AppActionKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueActions = new Set<AppActionKey>();
  value.forEach((entry) => {
    if (typeof entry !== "string") {
      return;
    }

    if (APP_ACTION_KEYS.includes(entry as AppActionKey)) {
      uniqueActions.add(entry as AppActionKey);
    }
  });

  return [...uniqueActions];
}

function ensureMinimumNavPaths(paths: string[]) {
  return paths.length ? paths : ["/dashboard"];
}

export function createLocalUserProfile(
  input?: Partial<Pick<LocalUserProfile, "id" | "name" | "role" | "pin" | "status" | "permissionMode" | "allowedNavPaths" | "allowedActions">>
): LocalUserProfile {
  const role = input?.role ? normalizeUserRole(input.role) : DEFAULT_LOCAL_USER_ROLE;
  const permissionMode = input?.permissionMode === "custom" ? "custom" : "role";
  const allowedNavPaths = normalizeNavPaths(input?.allowedNavPaths);
  const allowedActions = normalizeActionKeys(input?.allowedActions);
  return {
    id: input?.id ?? `local-user-${crypto.randomUUID()}`,
    name: input?.name?.trim() || DEFAULT_LOCAL_USER_NAME,
    role,
    pin: input?.pin?.trim() || "",
    status: input?.status ?? "active",
    permissionMode,
    allowedNavPaths: permissionMode === "custom" ? ensureMinimumNavPaths(allowedNavPaths) : allowedNavPaths,
    allowedActions
  };
}

export function getDefaultLocalUsers() {
  return [createLocalUserProfile({ name: DEFAULT_LOCAL_USER_NAME, role: DEFAULT_LOCAL_USER_ROLE, id: "local-admin-1" })];
}

export function normalizeLocalUsers(value: unknown): LocalUserProfile[] {
  if (!Array.isArray(value)) {
    return getDefaultLocalUsers();
  }

  const users = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const id = typeof Reflect.get(entry, "id") === "string" ? String(Reflect.get(entry, "id")) : undefined;
      const name = typeof Reflect.get(entry, "name") === "string" ? String(Reflect.get(entry, "name")) : DEFAULT_LOCAL_USER_NAME;
      const role = normalizeUserRole(typeof Reflect.get(entry, "role") === "string" ? String(Reflect.get(entry, "role")) : DEFAULT_LOCAL_USER_ROLE);
      const pin = typeof Reflect.get(entry, "pin") === "string" ? String(Reflect.get(entry, "pin")) : "";
      const status = Reflect.get(entry, "status") === "inactive" ? "inactive" : "active";
      const permissionMode = Reflect.get(entry, "permissionMode") === "custom" ? "custom" : "role";
      const allowedNavPaths = normalizeNavPaths(Reflect.get(entry, "allowedNavPaths"));
      const allowedActions = normalizeActionKeys(Reflect.get(entry, "allowedActions"));

      return createLocalUserProfile({ id, name, role, pin, status, permissionMode, allowedNavPaths, allowedActions });
    })
    .filter((entry): entry is LocalUserProfile => Boolean(entry));

  return users.length ? users : getDefaultLocalUsers();
}

export function resolveActiveLocalUser(localUsers: LocalUserProfile[], activeLocalUserId?: string | null) {
  const normalizedUsers = normalizeLocalUsers(localUsers);
  const activeUser = normalizedUsers.find((user) => user.id === activeLocalUserId && user.status === "active")
    ?? normalizedUsers.find((user) => user.status === "active")
    ?? normalizedUsers[0];

  return {
    activeLocalUserId: activeUser.id,
    currentUserName: activeUser.name,
    currentUserRole: activeUser.role,
    localUsers: normalizedUsers
  };
}

export function resolveActiveLocalUserProfile(localUsers: LocalUserProfile[], activeLocalUserId?: string | null) {
  const resolved = resolveActiveLocalUser(localUsers, activeLocalUserId);
  return resolved.localUsers.find((user) => user.id === resolved.activeLocalUserId) ?? resolved.localUsers[0];
}

export function getFixedSuperAdminProfile() {
  return {
    currentUserName: FIXED_SUPER_ADMIN_NAME,
    currentUserRole: FIXED_SUPER_ADMIN_ROLE
  };
}

export function getRoleLabel(role: string) {
  if (role === "admin" || role === "operador" || role === "super_admin") {
    return ROLE_LABELS[role];
  }

  return ROLE_LABELS[getDefaultRole()];
}

export function hasActionAccess(currentRole: UserRole, actionKey: AppActionKey) {
  return hasRoleAccess(currentRole, ACTION_LABELS[actionKey].minRole);
}

export function hasActionAccessForProfile(profile: LocalUserProfile | null | undefined, actionKey: AppActionKey, fallbackRole: UserRole = DEFAULT_LOCAL_USER_ROLE) {
  if (profile?.permissionMode === "custom") {
    return normalizeActionKeys(profile.allowedActions).includes(actionKey);
  }

  return hasActionAccess(profile?.role ?? fallbackRole, actionKey);
}

export function filterNavigationItemsByRole(items: NavItem[], currentRole: UserRole) {
  return items.filter((item) => hasRoleAccess(currentRole, item.minRole ?? "operador"));
}

export function getAllowedNavigationPathsByRole(items: NavItem[], currentRole: UserRole) {
  return filterNavigationItemsByRole(items, currentRole).map((item) => item.path);
}

export function getAllowedActionKeysByRole(currentRole: UserRole) {
  return APP_ACTION_KEYS.filter((actionKey) => hasActionAccess(currentRole, actionKey));
}

export function canAccessNavigationItem(item: NavItem, currentRole: UserRole, profile?: LocalUserProfile | null) {
  if (profile?.permissionMode === "custom") {
    return ensureMinimumNavPaths(normalizeNavPaths(profile.allowedNavPaths)).includes(item.path);
  }

  return hasRoleAccess(profile?.role ?? currentRole, item.minRole ?? "operador");
}

export function filterNavigationItemsForProfile(items: NavItem[], profile?: LocalUserProfile | null, fallbackRole: UserRole = DEFAULT_LOCAL_USER_ROLE) {
  return items.filter((item) => canAccessNavigationItem(item, fallbackRole, profile));
}

export function filterQuickActionsByRole(actions: QuickAction[], currentRole: UserRole, items: NavItem[]) {
  const allowedPaths = new Set(filterNavigationItemsByRole(items, currentRole).map((item) => item.path));
  return actions.filter((action) => allowedPaths.has(action.path));
}

export function filterQuickActionsForProfile(
  actions: QuickAction[],
  items: NavItem[],
  profile?: LocalUserProfile | null,
  fallbackRole: UserRole = DEFAULT_LOCAL_USER_ROLE
) {
  const allowedPaths = new Set(filterNavigationItemsForProfile(items, profile, fallbackRole).map((item) => item.path));
  return actions.filter((action) => allowedPaths.has(action.path));
}

export function getRoleHomePath(currentRole: UserRole) {
  return hasRoleAccess(currentRole, "operador") ? "/dashboard" : "/";
}

export function getProfileHomePath(items: NavItem[], currentRole: UserRole, profile?: LocalUserProfile | null) {
  return filterNavigationItemsForProfile(items, profile, currentRole)[0]?.path ?? "/dashboard";
}
