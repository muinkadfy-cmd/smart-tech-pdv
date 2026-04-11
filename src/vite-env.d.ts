/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly MODE: string;
  readonly VITE_CLOUD_API_URL?: string;
  readonly VITE_SYNC_TENANT_ID?: string;
  readonly VITE_SYNC_INSTALLATION_ID?: string;
  readonly VITE_SYNC_API_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
