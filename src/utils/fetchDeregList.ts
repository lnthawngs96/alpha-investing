import type { SubnetRow } from '@/types';
import { MARKET_DATA_URL } from '@/constants/api';
import { tt } from '@/i18n';

/** Kết quả market data đã parse trên server. */
export interface UsStockAssets {
  stocks: SubnetRow[];
  cashEtfs: string[];
}

export interface MarketApiResponse {
  deregIds?: number[];
  stocks?: SubnetRow[];
  cashEtfs?: string[];
  error?: string;
}

/** Tải toàn bộ market JSON từ `/api/market` (server-side). */
export async function fetchMarketData(signal?: AbortSignal): Promise<{
  deregIds: number[];
  stocks: SubnetRow[];
  cashEtfs: string[];
}> {
  const res = await fetch(MARKET_DATA_URL, {
    method: 'GET',
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(tt('fetch.failed'));
  const body = (await res.json()) as MarketApiResponse;
  if (!Array.isArray(body.stocks) || !body.stocks.length) {
    throw new Error(tt('fetch.failed'));
  }
  return {
    deregIds: Array.isArray(body.deregIds) ? body.deregIds : [],
    stocks: body.stocks,
    cashEtfs: Array.isArray(body.cashEtfs) ? body.cashEtfs : [],
  };
}

/** Lấy mảng netuid dereg từ market API. */
export async function fetchAssetsDeregList(signal?: AbortSignal): Promise<number[]> {
  const { deregIds } = await fetchMarketData(signal);
  return deregIds;
}

/** Tải bảng cổ phiếu Mỹ + cash ETFs từ market API. */
export async function fetchUsStockAssets(signal?: AbortSignal): Promise<UsStockAssets> {
  const { stocks, cashEtfs } = await fetchMarketData(signal);
  return { stocks, cashEtfs };
}

/** Bỏ các mã nằm trong danh sách loại trừ (vd cash ETFs). */
export function filterExcludedTickers(rows: SubnetRow[], excluded: Iterable<string>): SubnetRow[] {
  const set = new Set([...excluded].map((t) => String(t).trim()));
  return rows.filter((r) => !set.has(String(r.netuid)));
}

/** Mảng kiểu JSON `["SGOV", "BIL"]` — giữ cho chỗ khác nếu cần. */
export function parseTickerList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.replace(/'/g, '"'));
  } catch {
    throw new Error(tt('fetch.badTickers'));
  }
  if (!Array.isArray(parsed)) throw new Error(tt('fetch.badTickers'));
  return parsed.map((t) => String(t).trim()).filter(Boolean);
}
