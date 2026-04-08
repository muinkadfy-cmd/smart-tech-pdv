import { useEffect, useRef } from "react";
import { type SyncCycleResult, runSyncCycle } from "@/sync/sync-engine";

const BASE_OK_MS = 45_000;
const OFFLINE_POLL_MS = 5_000;
const MIN_ERR_MS = 15_000;
const MAX_ERR_MS = 300_000;

/**
 * Sincronização periódica em segundo plano (não bloqueia UI).
 * Sucesso: intervalo base ~45s. Erro: backoff exponencial até 5 min.
 * Offline: polling curto até voltar a rede.
 */
export function useBackgroundSyncWorker() {
  const failCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    const schedule = (delayMs: number) => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(run, delayMs);
    };

    const run = async () => {
      if (cancelled) {
        return;
      }

      if (!navigator.onLine) {
        failCountRef.current = 0;
        schedule(OFFLINE_POLL_MS);
        return;
      }

      const result: SyncCycleResult = await runSyncCycle();

      if (cancelled) {
        return;
      }

      if (result === "error") {
        failCountRef.current += 1;
        const backoff = Math.min(MAX_ERR_MS, MIN_ERR_MS * 2 ** (failCountRef.current - 1));
        schedule(backoff);
        return;
      }

      if (result === "skipped") {
        schedule(OFFLINE_POLL_MS);
        return;
      }

      failCountRef.current = 0;
      schedule(BASE_OK_MS);
    };

    schedule(9_000);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);
}
