import { isTauriRuntime } from "@/lib/tauri";
import type Database from "@tauri-apps/plugin-sql";

let sqliteDatabasePromise: Promise<Database> | null = null;

export async function getSqliteDatabase(): Promise<Database | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  if (!sqliteDatabasePromise) {
    sqliteDatabasePromise = (async () => {
      const sqlModule = await import("@tauri-apps/plugin-sql");
      const db = await sqlModule.default.load("sqlite:smart-tech-pdv.db");

      await db.execute("PRAGMA foreign_keys = ON");
      await db.execute("PRAGMA journal_mode = WAL");
      await db.execute("PRAGMA synchronous = NORMAL");
      await db.execute("PRAGMA busy_timeout = 12000");

      return db;
    })().catch((error) => {
      sqliteDatabasePromise = null;
      throw error;
    });
  }

  return sqliteDatabasePromise;
}
