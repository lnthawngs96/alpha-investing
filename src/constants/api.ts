/** Endpoint assets (asset ratio, dereg list, …) của Investing88. */
export const INVESTING88_ASSETS_URL =
  import.meta.env.VITE_ASSETS_API_URL ?? '/api/investing88/assets';

/**
 * SSE bảng subnet của TaoMarketCap (event `type: "full"`).
 * Dev: Vite proxy `/api/taomarketcap`. Production (Vercel): Edge function
 * cùng path (gắn Origin bắt buộc).
 */
export const TAOMARKETCAP_SUBNETS_STREAM_URL =
  import.meta.env.VITE_TAOMARKETCAP_STREAM_URL ??
  '/api/taomarketcap/internal/v1/subnets/table/stream/';

/** Rao → TAO (liquidity trên stream là đơn vị chain). */
export const RAO_PER_TAO = 1e9;