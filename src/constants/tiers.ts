/**
 * Phân loại một subnet trong danh mục đã lưu theo data table hiện tại:
 * có nằm trong top emission / top thanh khoản hay không.
 */
export type TierKey = 'both' | 'emission' | 'liquidity' | 'none';

export interface TierConfig {
  label: string;
  /** Ký hiệu ngắn hiển thị trên badge. */
  chip: string;
  hint: string;
  /** Lớp Tailwind cho chữ. */
  text: string;
  /** Lớp Tailwind cho khung badge (viền + nền + chữ). */
  box: string;
}

/** Bốn nhóm phân loại một subnet, xếp theo mức độ nên giữ / nên cashout. */
export const TIERS: Record<TierKey, TierConfig> = {
  both: {
    label: 'Cả hai',
    chip: '⚡💧',
    hint: 'Vừa top emission vừa top thanh khoản — nên giữ / gia tăng',
    text: 'text-positive',
    box: 'border-positive/60 bg-positive/10 text-positive',
  },
  emission: {
    label: 'Chỉ emission',
    chip: '⚡',
    hint: 'Top emission nhưng thanh khoản thấp — vào/ra dễ bị slippage',
    text: 'text-warning',
    box: 'border-warning/60 bg-warning/10 text-warning',
  },
  liquidity: {
    label: 'Chỉ thanh khoản',
    chip: '💧',
    hint: 'Thanh khoản cao (dễ cashout) nhưng emission ngoài top',
    text: 'text-info',
    box: 'border-info/60 bg-info/10 text-info',
  },
  none: {
    label: 'Ngoài top',
    chip: '✕',
    hint: 'Không thuộc top emission lẫn top thanh khoản — ưu tiên cashout',
    text: 'text-negative',
    box: 'border-negative/60 bg-negative/10 text-negative',
  },
};

/** Thứ tự hiển thị các nhóm (từ nên giữ nhất → nên cashout). */
export const TIER_ORDER: readonly TierKey[] = ['both', 'emission', 'liquidity', 'none'];
