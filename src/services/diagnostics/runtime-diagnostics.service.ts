import type {
  DiagnosticsRuntimeEntry,
  DiagnosticsRuntimeModule,
  DiagnosticsRuntimeSeverity,
  DiagnosticsRuntimeSnapshot,
  DiagnosticsRuntimeSource
} from "@/types/domain";

const STORAGE_KEY = "smart-tech:runtime-diagnostics";
const MAX_RUNTIME_EVENTS = 40;

interface RuntimeDiagnosticInput {
  severity: DiagnosticsRuntimeSeverity;
  source: DiagnosticsRuntimeSource;
  title: string;
  message: string;
  detail?: string;
  module?: DiagnosticsRuntimeModule;
  routePath?: string;
  fingerprint?: string;
}

let runtimeEvents: DiagnosticsRuntimeEntry[] = loadPersistedEvents();

function isBrowser() {
  return typeof window !== "undefined";
}

function loadPersistedEvents(): DiagnosticsRuntimeEntry[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as DiagnosticsRuntimeEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeEvents.slice(0, MAX_RUNTIME_EVENTS)));
  } catch {
    // noop
  }
}

function normalizeChunk(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMessage(value: string) {
  return normalizeChunk(value).slice(0, 1200);
}

function inferModule(routePath: string, combinedText: string): DiagnosticsRuntimeModule {
  const text = `${routePath} ${combinedText}`.toLowerCase();

  if (text.includes("/produtos") || text.includes("product") || text.includes("catalog")) return "Produtos";
  if (text.includes("/pdv") || text.includes("cart") || text.includes("sale") || text.includes("coupon")) return "PDV";
  if (text.includes("/pedidos") || text.includes("order")) return "Pedidos";
  if (text.includes("/clientes") || text.includes("customer")) return "Clientes";
  if (text.includes("/fornecedores") || text.includes("supplier")) return "Fornecedores";
  if (text.includes("/compras") || text.includes("purchase")) return "Compras";
  if (text.includes("/estoque") || text.includes("stock") || text.includes("inventory")) return "Estoque";
  if (text.includes("/financeiro") || text.includes("finance")) return "Financeiro";
  if (text.includes("/relatorios") || text.includes("report")) return "Relatórios";
  if (text.includes("/configuracoes") || text.includes("setting")) return "Configurações";
  if (text.includes("/diagnostico") || text.includes("diagnostic")) return "Diagnóstico";
  if (text.includes("/licenca") || text.includes("license") || text.includes("sync")) return "Licença e sincronização";
  if (text.includes("/backup")) return "Backup";
  if (text.includes("/impressao") || text.includes("print")) return "Impressão";
  if (text.includes("/atualizacoes") || text.includes("update") || text.includes("release")) return "Atualizações";
  if (text.includes("/dashboard") || text.includes("painel")) return "Painel";
  return "Geral";
}

function buildFingerprint({ severity, source, title, message, module }: RuntimeDiagnosticInput) {
  return `${severity}|${source}|${module ?? ""}|${normalizeMessage(title)}|${normalizeMessage(message)}`.toLowerCase();
}

function resolveRoutePath(routePath?: string) {
  if (routePath) {
    return routePath;
  }

  if (!isBrowser()) {
    return "/";
  }

  return window.location.pathname || "/";
}

export function recordRuntimeDiagnostic(input: RuntimeDiagnosticInput) {
  const routePath = resolveRoutePath(input.routePath);
  const message = normalizeMessage(input.message);
  if (!message) {
    return;
  }

  const combinedText = `${input.title} ${message} ${input.detail ?? ""}`;
  const module = input.module ?? inferModule(routePath, combinedText);
  const fingerprint = input.fingerprint ?? buildFingerprint({ ...input, message, module, routePath });
  const now = new Date().toISOString();
  const detail = input.detail ? normalizeMessage(input.detail) : undefined;

  const existingIndex = runtimeEvents.findIndex((entry) => entry.fingerprint === fingerprint);
  if (existingIndex >= 0) {
    const existing = runtimeEvents[existingIndex];
    runtimeEvents[existingIndex] = {
      ...existing,
      count: existing.count + 1,
      lastSeenAt: now,
      routePath,
      detail: detail ?? existing.detail
    };
    const [updated] = runtimeEvents.splice(existingIndex, 1);
    runtimeEvents.unshift(updated);
    persistEvents();
    return;
  }

  runtimeEvents.unshift({
    id: `diag-${crypto.randomUUID()}`,
    severity: input.severity,
    source: input.source,
    module,
    title: normalizeMessage(input.title),
    message,
    detail,
    routePath,
    count: 1,
    firstSeenAt: now,
    lastSeenAt: now,
    fingerprint
  });
  runtimeEvents = runtimeEvents.slice(0, MAX_RUNTIME_EVENTS);
  persistEvents();
}

export function getRuntimeDiagnosticsSnapshot(): DiagnosticsRuntimeSnapshot {
  const events = [...runtimeEvents];
  const summary = {
    totalEvents: events.length,
    errorCount: events.filter((entry) => entry.severity === "error").length,
    warningCount: events.filter((entry) => entry.severity === "warning").length,
    infoCount: events.filter((entry) => entry.severity === "info").length,
    lastRecordedAt: events[0]?.lastSeenAt ?? null,
    sources: Array.from(new Set(events.map((entry) => entry.source)))
  };

  return {
    summary,
    events
  };
}

export function clearRuntimeDiagnostics() {
  runtimeEvents = [];
  persistEvents();
}

export function buildRuntimeDiagnosticsReport(snapshot: DiagnosticsRuntimeSnapshot) {
  const lines = [
    "Resumo técnico local",
    `- Eventos: ${snapshot.summary.totalEvents}`,
    `- Erros: ${snapshot.summary.errorCount}`,
    `- Warnings: ${snapshot.summary.warningCount}`,
    `- Infos: ${snapshot.summary.infoCount}`,
    `- Último registro: ${snapshot.summary.lastRecordedAt ?? "sem eventos"}`,
    `- Fontes: ${snapshot.summary.sources.join(", ") || "nenhuma"}`,
    ""
  ];

  snapshot.events.forEach((entry) => {
    const repeated = entry.count > 1 ? ` · repetiu ${entry.count}x` : "";
    lines.push(
      `[${entry.severity.toUpperCase()}] ${entry.source} · ${entry.title} · ${entry.message}${entry.detail ? ` · ${entry.detail}` : ""}${repeated}`
    );
  });

  return lines.join("\n");
}

export function formatConsoleArguments(args: unknown[]) {
  if (args.length === 0) {
    return "Sem detalhes enviados pelo console.";
  }

  const [first, ...rest] = args;
  if (typeof first === "string" && first.includes("%s")) {
    let restIndex = 0;
    const formatted = first.replace(/%s/g, () => String(rest[restIndex++] ?? "%s"));
    const remaining = rest.slice(restIndex).map((value) => stringifyConsoleValue(value));
    return normalizeMessage([formatted, ...remaining].join(" · "));
  }

  return normalizeMessage(args.map((value) => stringifyConsoleValue(value)).join(" · "));
}

function stringifyConsoleValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack || `${value.name}: ${value.message}`;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
