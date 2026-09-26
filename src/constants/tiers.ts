import type { TierConfig } from '@/types';

/**
 * Phân loại một subnet trong danh mục đã lưu theo data table hiện tại:
 * có nằm trong top emission / top thanh khoản hay không.
 * (Cổ phiếu Mỹ dùng cùng khoá: 'emission' ↔ top vốn hoá, 'liquidity' ↔ top giá trị giao dịch.)
 */
export type TierKey = 'both' | 'emission' | 'liquidity' | 'none';

export type { TierConfig };

/**
 * Bốn nhóm phân loại một subnet, xếp theo mức độ nên giữ / nên cashout.
 * Nhãn / hint là fallback tiếng Anh; UI dùng localizedTier* từ i18n.
 */
export const TIERS: Record<TierKey, TierConfig> = {
  both: {
    label: 'Both',
    chip: '⚡💧',
    hint: 'Top emission and top liquidity — hold / add',
    text: 'text-positive',
    box: 'border-positive/60 bg-positive/10 text-positive',
  },
  emission: {
    label: 'Emission only',
    chip: '⚡',
    hint: 'Top emission but low liquidity — entries/exits face slippage',
    text: 'text-warning',
    box: 'border-warning/60 bg-warning/10 text-warning',
  },
  liquidity: {
    label: 'Liquidity only',
    chip: '💧',
    hint: 'High liquidity (easy to cash out) but emission outside top',
    text: 'text-info',
    box: 'border-info/60 bg-info/10 text-info',
  },
  none: {
    label: 'Outside top',
    chip: '✕',
    hint: 'Neither top emission nor top liquidity — prioritize cashout',
    text: 'text-negative',
    box: 'border-negative/60 bg-negative/10 text-negative',
  },
};

/** Bốn nhóm phân loại một mã cổ phiếu Mỹ: top vốn hoá (mc) / top giá trị giao dịch (pv). */
export const STOCK_TIERS: Record<TierKey, TierConfig> = {
  both: {
    ...TIERS.both,
    label: 'Both',
    hint: 'Top market cap and top trading value — hold / add',
  },
  emission: {
    ...TIERS.emission,
    label: 'Market cap only',
    hint: 'Top market cap but low trading value — entries/exits face slippage',
  },
  liquidity: {
    ...TIERS.liquidity,
    label: 'Liquidity only',
    hint: 'High trading value (easy to cash out) but market cap outside top',
  },
  none: {
    ...TIERS.none,
    label: 'Outside top',
    hint: 'Neither top market cap nor top trading value — prioritize cashout',
  },
};

/** Thứ tự hiển thị các nhóm (từ nên giữ nhất → nên cashout). */
export const TIER_ORDER: readonly TierKey[] = ['both', 'emission', 'liquidity', 'none'];
