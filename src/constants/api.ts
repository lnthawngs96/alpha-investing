/**
 * Endpoint JSON phía app (server đã gọi upstream + parse).
 * Dev: Vite middleware. Prod: Vercel Edge.
 */
export const ALPHA_SUBNETS_URL =
  import.meta.env.VITE_ALPHA_SUBNETS_URL ?? '/api/alpha';

export const MARKET_DATA_URL =
  import.meta.env.VITE_MARKET_DATA_URL ?? '/api/market';
