import { isTauriRuntime } from "@/lib/tauri";

export async function getSqliteDatabase() {
  if (!isTauriRuntime()) {
    return null;
  }
  const sqlModule = await import("@tauri-apps/plugin-sql");
  return sqlModule.default.load("sqlite:smart-tech-pdv.db");
}
