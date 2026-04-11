import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";
import { useBackgroundSyncWorker } from "@/hooks/use-background-sync-worker";
import { useLicenseBootstrap } from "@/hooks/use-license-bootstrap";
import { useUpdaterNotifier } from "@/hooks/use-updater-notifier";
import { useRuntimeDiagnosticsMonitor } from "@/hooks/use-runtime-diagnostics-monitor";

export function RuntimeBootstrap() {
  useRuntimeDiagnosticsMonitor();
  useLicenseBootstrap();
  useAuthBootstrap();
  useBackgroundSyncWorker();
  useUpdaterNotifier();
  return null;
}
