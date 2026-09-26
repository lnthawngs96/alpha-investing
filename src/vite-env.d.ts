/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL đầy đủ tới /assets nếu không dùng Vite proxy (vd production). */
  readonly VITE_ASSETS_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
