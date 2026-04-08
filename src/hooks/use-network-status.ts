import { useEffect, useState } from "react";
import { useSyncStore } from "@/stores/sync-store";

export function useNetworkStatus() {
  const setOnline = useSyncStore((s) => s.setOnline);

  const [online, set] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => {
      set(true);
      setOnline(true);
    };
    const off = () => {
      set(false);
      setOnline(false);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline]);

  return online;
}
