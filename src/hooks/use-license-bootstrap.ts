import { useEffect } from "react";
import { licenseService } from "@/services/license/license.service";

export function useLicenseBootstrap() {
  useEffect(() => {
    void (async () => {
      await licenseService.hydrateStoreFromDatabase();
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await licenseService.refreshFromCloud();
      }
    })();
  }, []);
}
