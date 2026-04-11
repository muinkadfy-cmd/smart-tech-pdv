import { useEffect } from "react";
import { formatConsoleArguments, recordRuntimeDiagnostic } from "@/services/diagnostics/runtime-diagnostics.service";

const IGNORED_CONSOLE_PATTERNS = ["Download the React DevTools for a better development experience"];

function shouldIgnoreMessage(message: string) {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function useRuntimeDiagnosticsMonitor() {
  useEffect(() => {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    function captureConsole(baseSeverity: "error" | "warning", args: unknown[]) {
      const message = formatConsoleArguments(args);
      if (!message || shouldIgnoreMessage(message)) {
        return;
      }

      const severity = baseSeverity === "error" && message.startsWith("Warning:") ? "warning" : baseSeverity;
      recordRuntimeDiagnostic({
        severity,
        source: "console",
        title: severity === "error" ? "Console error capturado" : "Console warning capturado",
        message
      });
    }

    console.error = (...args: unknown[]) => {
      captureConsole("error", args);
      originalError(...args);
    };

    console.warn = (...args: unknown[]) => {
      captureConsole("warning", args);
      originalWarn(...args);
    };

    function handleWindowError(event: ErrorEvent) {
      const detail = [event.filename, event.lineno, event.colno].filter(Boolean).join(":");
      recordRuntimeDiagnostic({
        severity: "error",
        source: "window",
        title: "Erro global de janela",
        message: event.message || "Falha global não identificada.",
        detail: detail || event.error?.stack
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason instanceof Error ? event.reason.stack || event.reason.message : formatConsoleArguments([event.reason]);
      recordRuntimeDiagnostic({
        severity: "error",
        source: "promise",
        title: "Promise rejeitada sem tratamento",
        message: typeof reason === "string" ? reason : "Promise rejeitada sem detalhe legível."
      });
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);
}
