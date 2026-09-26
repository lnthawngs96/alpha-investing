/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL JSON bảng Alpha nếu không dùng `/api/alpha`. */
  readonly VITE_ALPHA_SUBNETS_URL?: string;
  /** URL JSON market data nếu không dùng `/api/market`. */
  readonly VITE_MARKET_DATA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
