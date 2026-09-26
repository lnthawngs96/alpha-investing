/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL đầy đủ tới /assets nếu không dùng Vite proxy (vd production). */
  readonly VITE_ASSETS_API_URL?: string;
  /** URL đầy đủ SSE bảng subnet TaoMarketCap nếu không dùng Vite proxy. */
  readonly VITE_TAOMARKETCAP_STREAM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
