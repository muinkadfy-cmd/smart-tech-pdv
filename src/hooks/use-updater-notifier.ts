import { useEffect } from "react";
import { isTauriRuntime } from "@/lib/tauri";
import { useUpdaterStore } from "@/stores/updater-store";

const STARTUP_CHECK_INTERVAL_MS = 1000 * 60 * 30;
const FOCUS_CHECK_INTERVAL_MS = 1000 * 60 * 20;
const POLL_CHECK_INTERVAL_MS = 1000 * 60 * 60 * 3;

function isCheckStale(checkedAt: string | undefined, maxAgeMs: number) {
  if (!checkedAt) {
    return true;
  }

  const checkedTime = Date.parse(checkedAt);
  if (Number.isNaN(checkedTime)) {
    return true;
  }

  return Date.now() - checkedTime >= maxAgeMs;
}

export function useUpdaterNotifier() {
  const autoChecked = useUpdaterStore((state) => state.autoChecked);
  const checkedAt = useUpdaterStore((state) => state.state.checkedAt);
  const status = useUpdaterStore((state) => state.state.status);
  const forcedUpdateVersion = useUpdaterStore((state) => state.forcedUpdateVersion);
  const installBusy = useUpdaterStore((state) => state.installBusy);
  const checkNow = useUpdaterStore((state) => state.checkNow);
  const installNow = useUpdaterStore((state) => state.installNow);

  useEffect(() => {
    if (!isTauriRuntime() || installBusy) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    if (autoChecked && !isCheckStale(checkedAt, STARTUP_CHECK_INTERVAL_MS)) {
      return;
    }

    const timer = window.setTimeout(() => {
      void checkNow("startup");
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoChecked, checkedAt, checkNow, installBusy]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const handleFocus = () => {
      if (installBusy || status === "checking") {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      if (isCheckStale(checkedAt, FOCUS_CHECK_INTERVAL_MS)) {
        void checkNow("startup");
      }
    };

    const handleOnline = () => {
      if (installBusy || status === "checking") {
        return;
      }

      void checkNow("startup");
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkedAt, checkNow, installBusy, status]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    const timer = window.setInterval(() => {
      if (installBusy || status === "checking") {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      void checkNow("startup");
    }, POLL_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [checkNow, installBusy, status]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    if (status !== "available" || !forcedUpdateVersion || installBusy) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    const timer = window.setTimeout(() => {
      void installNow();
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [forcedUpdateVersion, installBusy, installNow, status]);
}
