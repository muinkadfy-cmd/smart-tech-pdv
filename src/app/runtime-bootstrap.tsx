import { useBackgroundSyncWorker } from "@/hooks/use-background-sync-worker";
import { useLicenseBootstrap } from "@/hooks/use-license-bootstrap";

export function RuntimeBootstrap() {
  useLicenseBootstrap();
  useBackgroundSyncWorker();
  return null;
}
