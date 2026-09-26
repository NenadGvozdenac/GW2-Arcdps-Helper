// Values injected by electron-vite from .env.development / .env.production at build time.
interface ImportMetaEnv {
  readonly MODE: string;
  readonly MAIN_VITE_API_URL: string;
  readonly MAIN_VITE_WEB_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
