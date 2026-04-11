import type { DiagnosticsRuntimeSeverity, DiagnosticsRuntimeSource } from "@/types/domain";

export interface DiagnosticsHealthItem {
  id: string;
  label: string;
  value: string;
  tone: "success" | "warning" | "default";
}

export interface DiagnosticsChecklistItem {
  id: string;
  title: string;
  helper: string;
}

export interface DiagnosticsCommandGuideItem {
  id: string;
  title: string;
  helper: string;
  command: string;
  tone: "success" | "warning" | "outline";
}

export function buildDiagnosticsHealth(databaseStatus: string, updaterStatus: string, environment: string) {
  return [
    {
      id: "dh-1",
      label: "Banco local",
      value: databaseStatus,
      tone: databaseStatus.toLowerCase().includes("pronto") || databaseStatus.toLowerCase().includes("conectado") ? "success" : "warning"
    },
    {
      id: "dh-2",
      label: "Updater",
      value: updaterStatus,
      tone: updaterStatus.toLowerCase().includes("release") || updaterStatus.toLowerCase().includes("configurado") ? "success" : "warning"
    },
    { id: "dh-3", label: "Ambiente", value: environment, tone: "default" }
  ] as DiagnosticsHealthItem[];
}

export function buildDiagnosticsChecklist() {
  return [
    { id: "dc-1", title: "Validar SQLite", helper: "Conferir leitura, seed e migrations aplicadas antes da release." },
    { id: "dc-2", title: "Testar updater", helper: "Executar verificação de versão, banner e tratamento de falha." },
    { id: "dc-3", title: "Conferir backup", helper: "Garantir exportação e restauração coerentes na instalação local." },
    { id: "dc-4", title: "Checar DEV x PROD", helper: "Confirmar que shell, impressão, ACL e build desktop permanecem coerentes." }
  ] as DiagnosticsChecklistItem[];
}

export function getRuntimeLevelLabel(severity: DiagnosticsRuntimeSeverity) {
  if (severity === "error") return "Erro";
  if (severity === "warning") return "Warning";
  return "Info";
}

export function getRuntimeSourceLabel(source: DiagnosticsRuntimeSource) {
  if (source === "console") return "Console";
  if (source === "window") return "Janela";
  if (source === "promise") return "Promise";
  if (source === "router") return "Roteador";
  if (source === "data") return "Dados";
  return "Manual";
}
