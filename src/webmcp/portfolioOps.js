import {
  TAO_ALPHA_ASSET_CLASS,
  validateTaoAlphaPortfolio,
  checkDedupe,
  dedupeDistance,
  DD_TRIGGER,
  DEDUPE_SAFE_MARGIN,
} from '../utils/portfolio';

// Danh mục lưu dưới dạng { _: 0, '<netuid>': <tỷ trọng>, ... } với tổng tỷ trọng
// (không tính '_') ≤ 1. Các hàm trong utils/helpers.js nhận map netuid→trọng số
// THUẦN, nên phải bóc '_' ra trước và gắn lại sau — quên bước này thì '_' bị
// coi như một subnet và ăn mất một phần tỷ trọng.

export function stripAssetClass(portfolio) {
  const out = {};
  for (const [k, v] of Object.entries(portfolio || {})) {
    if (k !== '_') out[k] = Number(v) || 0;
  }
  return out;
}

export function withAssetClass(weights, assetClass = TAO_ALPHA_ASSET_CLASS) {
  const out = { _: assetClass };
  for (const [k, v] of Object.entries(weights || {})) {
    out[k] = +Number(v).toFixed(6);
  }
  return out;
}

// Chuẩn hoá về tổng đúng 1.0, dồn sai số làm tròn vào phần tử lớn nhất để không
// tạo ra trọng số âm ở phần tử nhỏ.
export function normalizeToOne(weights) {
  const entries = Object.entries(weights).filter(([, v]) => Number(v) > 0);
  const sum = entries.reduce((a, [, v]) => a + Number(v), 0);
  if (!entries.length || sum <= 0) return {};
  const scaled = entries.map(([k, v]) => [k, +(Number(v) / sum).toFixed(6)]);
  const total = scaled.reduce((a, [, v]) => a + v, 0);
  const diff = +(1 - total).toFixed(6);
  if (diff !== 0) {
    let maxIdx = 0;
    scaled.forEach(([, v], i) => {
      if (v > scaled[maxIdx][1]) maxIdx = i;
    });
    scaled[maxIdx][1] = +(scaled[maxIdx][1] + diff).toFixed(6);
  }
  return Object.fromEntries(scaled);
}

export const SAFE_DEDUPE_DISTANCE = DD_TRIGGER + DEDUPE_SAFE_MARGIN;

// Báo cáo đầy đủ về một danh mục, dùng làm giá trị trả về chung cho mọi tool
// sửa danh mục. Agent nhờ đó luôn thấy ngay hậu quả của thao tác vừa rồi
// (hợp lệ chưa, có bị dedupe không) mà không phải gọi thêm tool kiểm tra.
export function describePortfolio(portfolio, savedPortfolios = [], names = {}) {
  if (!portfolio) return { portfolio: null, message: 'Chưa có danh mục nào được tạo.' };

  const validation = validateTaoAlphaPortfolio(portfolio);
  const dedupe = checkDedupe(portfolio, savedPortfolios);
  const entries = Object.entries(portfolio)
    .filter(([k]) => k !== '_')
    .sort((a, b) => b[1] - a[1]);

  return {
    subnet_count: entries.length,
    total_allocation: validation.total,
    cash: validation.cash,
    valid: validation.valid,
    errors: validation.errors,
    dedupe: {
      safe: dedupe.ok && (dedupe.minDist === null || dedupe.minDist >= SAFE_DEDUPE_DISTANCE),
      min_distance: dedupe.minDist,
      trigger_threshold: DD_TRIGGER,
      recommended_min_distance: +SAFE_DEDUPE_DISTANCE.toFixed(6),
      conflicts: dedupe.conflicts,
    },
    allocations: entries.map(([netuid, weight]) => ({
      netuid: Number(netuid),
      name: names[netuid] || undefined,
      weight: +Number(weight).toFixed(6),
      percent: +(Number(weight) * 100).toFixed(3),
    })),
  };
}

export { dedupeDistance, DD_TRIGGER };
