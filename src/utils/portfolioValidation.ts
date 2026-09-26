import type { DedupeCheck, DedupeConflict, Portfolio, PortfolioValidation, SavedPortfolioRecord, WeightMap } from '@/types';
import { ALLOC_EPSILON, DD_TRIGGER, MAX_TOTAL_ALLOC, TAO_ALPHA_ASSET_CLASS } from '@/constants/portfolio';
import { US_STOCK_ASSET_CLASS } from '@/constants/assets';

/**
 * Kiểm tra hợp lệ theo luật Tao/Alpha và cơ chế dedupe của Subnet 88.
 * Xem constants/portfolio.ts để biết tham chiếu tới mã nguồn mạng.
 */

/** Một saved record hoặc một portfolio thô — nhiều hàm chấp nhận cả hai. */
export type PortfolioLike = Portfolio | SavedPortfolioRecord | null | undefined;

/** Bóc portfolio thô ra khỏi record đã lưu (hoặc trả nguyên nếu đã là portfolio). */
export function unwrapPortfolio(value: PortfolioLike): Portfolio | null {
  if (!value || typeof value !== 'object') return null;
  if ('portfolio' in value && value.portfolio && typeof value.portfolio === 'object') {
    return value.portfolio;
  }
  return value as Portfolio;
}

/** Các cặp [netuid, tỷ trọng] của danh mục, bỏ key '_'. */
export function portfolioEntries(portfolio: Portfolio | WeightMap | null | undefined): Array<[string, number]> {
  return Object.entries(portfolio || {}).filter(([k]) => k !== '_');
}

/** Các cặp [netuid, tỷ trọng] sắp xếp theo tỷ trọng giảm dần. */
export function portfolioEntriesDesc(portfolio: Portfolio | WeightMap | null | undefined): Array<[string, number]> {
  return portfolioEntries(portfolio).sort((a, b) => b[1] - a[1]);
}

/**
 * Kiểm tra một danh mục có hợp lệ để nộp cho Tao/Alpha hay không.
 * Trả về { valid, errors[], total, cash }.
 */
export function validateTaoAlphaPortfolio(portfolio: unknown): PortfolioValidation {
  if (!portfolio || typeof portfolio !== 'object') {
    return { valid: false, errors: ['Danh mục không hợp lệ'], total: 0, cash: 0 };
  }

  const errors: string[] = [];
  const record = portfolio as Record<string, unknown>;

  // Asset class: key '_' phải bằng 0 (mặc định 0 nếu thiếu)
  const assetClass = record._ ?? TAO_ALPHA_ASSET_CLASS;
  if (assetClass !== TAO_ALPHA_ASSET_CLASS) {
    errors.push("Asset class '_' phải bằng 0 cho Tao/Alpha");
  }

  const entries = Object.entries(record).filter(([k]) => k !== '_');
  let total = 0;

  for (const [k, v] of entries) {
    // Key phải là số nguyên (netuid)
    if (!/^\d+$/.test(k)) {
      errors.push(`Subnet "${k}" phải là số nguyên (netuid)`);
    }
    if (typeof v !== 'number' || Number.isNaN(v)) {
      errors.push(`Phân bổ subnet ${k} không hợp lệ`);
    } else if (v < 0) {
      // Tao/Alpha không hỗ trợ shorting → value âm bị loại
      errors.push(`Subnet ${k}: Tao/Alpha không hỗ trợ shorting (không được âm)`);
    } else {
      total += Math.abs(v);
    }
  }

  // Tổng |phân bổ| ≤ 1
  if (total > MAX_TOTAL_ALLOC + ALLOC_EPSILON) {
    errors.push(`Tổng phân bổ ${total.toFixed(6)} vượt quá 1.0`);
  }

  const cash = Math.max(0, +(MAX_TOTAL_ALLOC - total).toFixed(6));
  return { valid: errors.length === 0, errors, total: +total.toFixed(6), cash };
}

/**
 * Kiểm tra một danh mục cổ phiếu Mỹ (`'_': 1`):
 *   - key là ticker (chuỗi bất kỳ; ticker không hỗ trợ / key rỗng mạng tính là cash);
 *   - cho phép short (giá trị âm);
 *   - tổng |phân bổ| ≤ 1.
 */
export function validateUsStockPortfolio(portfolio: unknown): PortfolioValidation {
  if (!portfolio || typeof portfolio !== 'object') {
    return { valid: false, errors: ['Danh mục không hợp lệ'], total: 0, cash: 0 };
  }

  const errors: string[] = [];
  const record = portfolio as Record<string, unknown>;
  if (record._ !== US_STOCK_ASSET_CLASS) {
    errors.push(`Asset class '_' phải bằng ${US_STOCK_ASSET_CLASS} cho cổ phiếu Mỹ`);
  }

  let total = 0;
  for (const [k, v] of Object.entries(record)) {
    if (k === '_') continue;
    if (typeof v !== 'number' || Number.isNaN(v)) {
      errors.push(`Phân bổ mã ${k || '(rỗng)'} không hợp lệ`);
    } else {
      total += Math.abs(v);
    }
  }

  if (total > MAX_TOTAL_ALLOC + ALLOC_EPSILON) {
    errors.push(`Tổng |phân bổ| ${total.toFixed(6)} vượt quá 1.0`);
  }

  const cash = Math.max(0, +(MAX_TOTAL_ALLOC - total).toFixed(6));
  return { valid: errors.length === 0, errors, total: +total.toFixed(6), cash };
}

/**
 * Kiểm tra hợp lệ theo đúng asset class của danh mục: `'_': 1` → luật cổ phiếu
 * Mỹ, còn lại → luật Tao/Alpha (giữ nguyên hành vi cũ).
 */
export function validatePortfolio(portfolio: unknown): PortfolioValidation {
  if (portfolio && typeof portfolio === 'object' && (portfolio as Record<string, unknown>)._ === US_STOCK_ASSET_CLASS) {
    return validateUsStockPortfolio(portfolio);
  }
  return validateTaoAlphaPortfolio(portfolio);
}

/** Vector phân bổ đã chuẩn hoá L1 (chỉ subnet, bỏ '_' và cash) — giống fn() trong dist(). */
export function allocVector(portfolio: unknown): WeightMap {
  if (!portfolio || typeof portfolio !== 'object') return {};
  const entries = Object.entries(portfolio as Record<string, unknown>).filter(([k]) => k !== '_');
  const s = entries.reduce((a, [, v]) => a + Math.abs(Number(v) || 0), 0);
  if (s <= 1e-6) return {};
  const out: WeightMap = {};
  for (const [k, v] of entries) out[k] = (Number(v) || 0) / s;
  return out;
}

/**
 * Khoảng cách dedupe (Euclid) giữa 2 danh mục trong không gian đã chuẩn hoá L1.
 * Subnet chỉ có ở một bên coi như 0 ở bên kia (giống mạng gộp toàn bộ netuid).
 */
export function dedupeDistance(a: unknown, b: unknown): number {
  const va = allocVector(a);
  const vb = allocVector(b);
  const keys = new Set([...Object.keys(va), ...Object.keys(vb)]);
  if (!keys.size) return 1; // không có phân bổ hợp lệ → coi như khác biệt tối đa
  let sum = 0;
  for (const k of keys) {
    const d = (va[k] || 0) - (vb[k] || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Kiểm tra 1 danh mục có bị mạng coi là trùng lặp so với danh sách khác không.
 * `others` là mảng saved record ({ portfolio, name, ... }) hoặc portfolio thô.
 * Chỉ so sánh CÙNG asset class (key '_'). Trả về { ok, minDist, conflicts[] }.
 */
export function checkDedupe(
  portfolio: Portfolio | null | undefined,
  others: PortfolioLike[] | null | undefined,
  threshold = DD_TRIGGER
): DedupeCheck {
  const assetClass = portfolio?._ ?? TAO_ALPHA_ASSET_CLASS;
  let minDist = Infinity;
  const conflicts: DedupeConflict[] = [];
  (others || []).forEach((o, i) => {
    const oc = unwrapPortfolio(o);
    if (!oc || typeof oc !== 'object') return;
    if ((oc._ ?? TAO_ALPHA_ASSET_CLASS) !== assetClass) return;
    const dist = dedupeDistance(portfolio, oc);
    if (dist < minDist) minDist = dist;
    if (dist < threshold) {
      // Tên chỉ có ở saved record; portfolio thô không có tên.
      const name = o && typeof o === 'object' && 'portfolio' in o ? (o as SavedPortfolioRecord).name : undefined;
      conflicts.push({ index: i, name, dist: +dist.toFixed(6) });
    }
  });
  return {
    ok: conflicts.length === 0,
    minDist: Number.isFinite(minDist) ? +minDist.toFixed(6) : null,
    conflicts,
  };
}
