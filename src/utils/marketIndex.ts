import type { SubnetRow } from '@/types';
import { getSubnetPool } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';

/** Các khung thời gian chỉ số thị trường Alpha. */
export const MARKET_CHANGE_FIELDS = [
  'price_change_1_hour',
  'price_change_1_day',
  'price_change_1_week',
  'price_change_1_month',
] as const;

export type MarketChangeField = (typeof MARKET_CHANGE_FIELDS)[number];

export type MarketIndexSnapshot = {
  /** Số subnet trong mẫu (đã bỏ uid 0). */
  count: number;
  /** Trung bình đều % theo từng khung; null nếu không có giá trị hợp lệ. */
  changes: Record<MarketChangeField, number | null>;
};

/** Trung bình đều % thay đổi trên các subnet có giá trị hợp lệ. */
export function averageChange(rows: SubnetRow[], field: string): number | null {
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    const v = toNumber(row[field]);
    if (!Number.isFinite(v)) continue;
    sum += v;
    n += 1;
  }
  return n > 0 ? sum / n : null;
}

/**
 * Chỉ số thị trường Alpha: trung bình đều % 1H/1D/1W/1M trên pool subnet
 * (đã loại uid 0; dereg / excluded phải lọc trước khi truyền vào — thường là `alpha.rows`).
 */
export function computeAlphaMarketIndex(rows: SubnetRow[]): MarketIndexSnapshot {
  const pool = getSubnetPool(rows);
  const changes = {} as Record<MarketChangeField, number | null>;
  for (const field of MARKET_CHANGE_FIELDS) {
    changes[field] = averageChange(pool, field);
  }
  return { count: pool.length, changes };
}
