/** Hằng số chỉ dùng phía server (Edge / Vite middleware) — không gửi ra client. */

export const UPSTREAM_ALPHA_STREAM =
  'https://api.taomarketcap.com/internal/v1/subnets/table/stream/';

export const UPSTREAM_MARKET_PAGE = 'https://api.investing88.ai/assets';

export const RAO_PER_TAO = 1e9;

export const ALPHA_ORIGIN_HEADERS = {
  Origin: 'https://taomarketcap.com',
  Referer: 'https://taomarketcap.com/',
} as const;
