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

export function buildDiagnosticsHealth(databaseStatus: string, updaterStatus: string, environment: string) {
  return [
    { id: "dh-1", label: "Banco local", value: databaseStatus, tone: databaseStatus.toLowerCase().includes("pronto") || databaseStatus.toLowerCase().includes("conectado") ? "success" : "warning" },
    { id: "dh-2", label: "Updater", value: updaterStatus, tone: updaterStatus.toLowerCase().includes("release") || updaterStatus.toLowerCase().includes("configurado") ? "success" : "warning" },
    { id: "dh-3", label: "Ambiente", value: environment, tone: "default" }
  ] as DiagnosticsHealthItem[];
}

export function buildDiagnosticsChecklist() {
  return [
    { id: "dc-1", title: "Validar SQLite", helper: "Conferir leitura, seed e migrations aplicadas." },
    { id: "dc-2", title: "Testar updater", helper: "Executar verificacao de versao e tratamento de erro." },
    { id: "dc-3", title: "Conferir backup", helper: "Garantir ultima rotina registrada antes da release." },
    { id: "dc-4", title: "Checar DEV x PROD", helper: "Confirmar que shell e build desktop permanecem coerentes." }
  ] as DiagnosticsChecklistItem[];
}
