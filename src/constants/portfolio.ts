import type { MetricKey, MetricOption } from '@/types';

// ============================================================================
// Trường dữ liệu & tiêu chí xếp hạng
// ============================================================================

export const PRICE_FIELD: MetricKey = 'price';
export const EMISSION_FIELD: MetricKey = 'emission';
export const LIQUIDITY_FIELD: MetricKey = 'liquidity';

/** Cột Fear & Greed trên dòng subnet (số 0–100 hoặc nhãn). */
export const FEAR_AND_GREED_FIELD = 'fear_and_greed_index';
/** Fear (gồm Extreme Fear): 0–44 theo thang phổ biến Alternative.me. */
export const FEAR_GREED_FEAR_MAX = 44;
/** Neutral: 45–54. */
export const FEAR_GREED_NEUTRAL_MIN = 45;
export const FEAR_GREED_NEUTRAL_MAX = 54;

/** Số subnet tối đa cho một nhóm generate. */
export const TOP_N_MAX = 100;
export const TOP_N_DEFAULT = 100;

/** Các tiêu chí có thể chọn trong dropdown nhóm generate (fallback EN; UI dùng localizedMetricLabel). */
export const CHANGE_OPTIONS: readonly MetricOption[] = [
  { value: 'price_change_1_hour', label: '1h price change' },
  { value: 'price_change_1_day', label: '1d price change' },
  { value: 'price_change_1_week', label: '1w price change' },
  { value: 'price_change_1_month', label: '1m price change' },
  { value: PRICE_FIELD, label: 'Price (high → low)' },
  { value: EMISSION_FIELD, label: 'Emission (high → low)' },
  { value: LIQUIDITY_FIELD, label: 'Liquidity (high → low)' },
  { value: 'fear_and_greed_fear', label: 'Fear (Fear & Greed)' },
  { value: 'fear_and_greed_neutral', label: 'Neutral (Fear & Greed)' },
];
export const CHANGE_DEFAULT: MetricKey = 'price_change_1_day';

/** Danh sách giá trị chỉ số — dùng cho enum trong schema tool WebMCP. */
export const METRIC_KEYS: readonly MetricKey[] = CHANGE_OPTIONS.map((o) => o.value);

/** Giữ lại để hiển thị label cho các saved portfolio cũ (có filterKey). */
export const FILTER_OPTIONS: readonly MetricOption[] = [
  { value: 'price_change_1_day', label: '1 Day Change' },
  { value: 'price_change_1_week', label: '1 Week Change' },
];

/** Nhãn cho nhóm subnet không thuộc nhóm generate nào. */
export const OTHER_GROUP_KEY = 'other';
export const OTHER_GROUP_LABEL = 'Other / ungrouped';

// ============================================================================
// Rule phân bổ Tao/Alpha — Bittensor Subnet 88 (Investing)
// Tham chiếu: Investing/core/simst.py (initfund/fadaily) + strat/README.md
// ============================================================================

/** key '_' = 0 */
export const TAO_ALPHA_ASSET_CLASS = 0;
/** Tổng |phân bổ| phải ≤ 1. */
export const MAX_TOTAL_ALLOC = 1;
/** Dung sai làm tròn khi kiểm tra tổng. */
export const ALLOC_EPSILON = 0.0011;

// ============================================================================
// DEDUPE (Bittensor Subnet 88 — chống sao chép danh mục)
// Tham chiếu: Investing/core/etc.py → dist() / dedupe(), Investing/core/const.py
//
// Cơ chế mạng: với mỗi cặp strategy CÙNG asset class, tính khoảng cách Euclid giữa
// 2 vector phân bổ đã CHUẨN HOÁ L1 (chia cho tổng |trọng số|, cash bị loại khỏi vector).
// Nếu khoảng cách < DD_TRIGGER (0.01) → danh mục nộp SAU (block lớn hơn) bị phạt:
//   score *= min(số_ngày_kể_từ_bản_gốc / DAYS_FINAL, 1)   (fresh copy ≈ 0 điểm).
// Lưu ý quan trọng: vì chuẩn hoá L1 nên 2 danh mục CÙNG tỷ trọng tương đối nhưng
// KHÁC mức cash có khoảng cách = 0 → vẫn bị coi là trùng lặp.
// ============================================================================

/** Ngưỡng khoảng cách coi là trùng (const.py: DD_TRIGGER). */
export const DD_TRIGGER = 0.01;
/** Số ngày để bản copy hồi phục điểm (const.py: DAYS_FINAL). */
export const DAYS_FINAL = 30;
/** Biên an toàn: giữ khoảng cách vượt ngưỡng một chút để không sát mép do làm tròn / biến động. */
export const DEDUPE_SAFE_MARGIN = 0.003;
/** Khoảng cách tối thiểu nên đạt để chắc chắn không bị dedupe. */
export const SAFE_DEDUPE_DISTANCE = DD_TRIGGER + DEDUPE_SAFE_MARGIN;

/** Trần tỷ trọng mỗi subnet khi generate theo thanh khoản. */
export const LIQUIDITY_MAX_WEIGHT = 0.05;
