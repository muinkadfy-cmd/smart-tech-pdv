import { useEffect, useState } from "react";
import { APP_VERSION } from "@/config/app";
import { getRuntimeAppVersion } from "@/lib/tauri";

export function useCurrentVersion() {
  const [version, setVersion] = useState(APP_VERSION);

  useEffect(() => {
    getRuntimeAppVersion().then(setVersion).catch(() => setVersion(APP_VERSION));
  }, []);

  return version;
}
