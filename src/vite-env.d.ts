/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_SUPABASE_URL: string;
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string;
  readonly VITE_EMAIL_API_URL?: string;
  readonly VITE_EMAIL_ENABLED?: string;
}

