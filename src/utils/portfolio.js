export const STORAGE_KEY = 'subnet_saved_portfolios';

export const PRICE_FIELD = 'price';
export const EMISSION_FIELD = 'emission';
export const LIQUIDITY_FIELD = 'liquidity';
export const TOP_N_MAX = 100;
export const TOP_N_DEFAULT = 100;

export const CHANGE_OPTIONS = [
  { value: 'price_change_1_day',   label: 'Tăng trưởng 1 ngày' },
  { value: 'price_change_1_week',  label: 'Tăng trưởng 1 tuần' },
  { value: 'price_change_1_month', label: 'Tăng trưởng 1 tháng' },
  { value: PRICE_FIELD,            label: 'Giá (cao → thấp)' },
  { value: EMISSION_FIELD,         label: 'Emission (cao → thấp)' },
  { value: LIQUIDITY_FIELD,        label: 'Thanh khoản (cao → thấp)' },
];
export const CHANGE_DEFAULT = 'price_change_1_day';

// Giữ lại để hiển thị label cho các saved portfolio cũ (có filterKey)
export const FILTER_OPTIONS = [
  { value: 'price_change_1_day', label: '1 Day Change' },
  { value: 'price_change_1_week', label: '1 Week Change' },
];

// Rule phân bổ Tao/Alpha — Bittensor Subnet 88 (Investing)
// Tham chiếu: Investing/core/simst.py (initfund/fadaily) + strat/README.md
export const TAO_ALPHA_ASSET_CLASS = 0; // key '_' = 0
export const MAX_TOTAL_ALLOC = 1; // tổng |phân bổ| phải ≤ 1
export const ALLOC_EPSILON = 0.0011; // dung sai làm tròn

// Kiểm tra một danh mục có hợp lệ để nộp cho Tao/Alpha hay không.
// Trả về { valid, errors[], total, cash }.
export function validateTaoAlphaPortfolio(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') {
    return { valid: false, errors: ['Danh mục không hợp lệ'], total: 0, cash: 0 };
  }

  const errors = [];

  // Asset class: key '_' phải bằng 0 (mặc định 0 nếu thiếu)
  const assetClass = portfolio._ ?? TAO_ALPHA_ASSET_CLASS;
  if (assetClass !== TAO_ALPHA_ASSET_CLASS) {
    errors.push("Asset class '_' phải bằng 0 cho Tao/Alpha");
  }

  const entries = Object.entries(portfolio).filter(([k]) => k !== '_');
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
export const DD_TRIGGER = 0.01; // ngưỡng khoảng cách coi là trùng (const.py: DD_TRIGGER)
export const DAYS_FINAL = 30;   // số ngày để bản copy hồi phục điểm (const.py: DAYS_FINAL)
// Biên an toàn: giữ khoảng cách vượt ngưỡng một chút để không sát mép do làm tròn / biến động.
export const DEDUPE_SAFE_MARGIN = 0.003;

// Vector phân bổ đã chuẩn hoá L1 (chỉ subnet, bỏ '_' và cash) — giống fn() trong dist().
export function allocVector(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return {};
  const entries = Object.entries(portfolio).filter(([k]) => k !== '_');
  const s = entries.reduce((a, [, v]) => a + Math.abs(Number(v) || 0), 0);
  if (s <= 1e-6) return {};
  const out = {};
  for (const [k, v] of entries) out[k] = (Number(v) || 0) / s;
  return out;
}

// Khoảng cách dedupe (Euclid) giữa 2 danh mục trong không gian đã chuẩn hoá L1.
// Subnet chỉ có ở một bên coi như 0 ở bên kia (giống mạng gộp toàn bộ netuid).
export function dedupeDistance(a, b) {
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

// Kiểm tra 1 danh mục có bị mạng coi là trùng lặp so với danh sách khác không.
// `others` là mảng saved record ({ portfolio, name, ... }) hoặc portfolio thô.
// Chỉ so sánh CÙNG asset class (key '_'). Trả về { ok, minDist, conflicts[] }.
export function checkDedupe(portfolio, others, threshold = DD_TRIGGER) {
  const assetClass = portfolio?._ ?? TAO_ALPHA_ASSET_CLASS;
  let minDist = Infinity;
  const conflicts = [];
  (others || []).forEach((o, i) => {
    const oc = o && o.portfolio ? o.portfolio : o;
    if (!oc || typeof oc !== 'object') return;
    if ((oc._ ?? TAO_ALPHA_ASSET_CLASS) !== assetClass) return;
    const dist = dedupeDistance(portfolio, oc);
    if (dist < minDist) minDist = dist;
    if (dist < threshold) conflicts.push({ index: i, name: o?.name, dist: +dist.toFixed(6) });
  });
  return {
    ok: conflicts.length === 0,
    minDist: Number.isFinite(minDist) ? +minDist.toFixed(6) : null,
    conflicts,
  };
}

// ============================================================================
// LƯU TRỮ 3 BÊN (localStorage + sessionStorage + context trong RAM)
//
// localStorage là bản chính (sống qua các phiên). sessionStorage là bản sao
// trong tab hiện tại: nếu localStorage bị xoá nhầm, dữ liệu vẫn còn ở đây và
// được gộp lại ở lần đọc kế tiếp. HISTORY_KEY giữ vài bản chụp gần nhất để
// truy vết / hoàn tác khi xoá nhầm ngay trong app.
// Bên thứ ba (state của SavedPortfoliosProvider) nằm ở context/SavedPortfoliosContext.
// ============================================================================
export const HISTORY_KEY = 'subnet_saved_portfolios_history';
export const HISTORY_LIMIT = 20;

// Đọc/ghi bỏ qua lỗi: Safari private mode và quota đầy đều ném exception,
// mất một tầng sao lưu không được phép làm hỏng luồng chính.
// Chấp nhận nhiều hình dạng thay vì vứt im lặng: đây là đường khôi phục dữ
// liệu, gán tay hơi lệch định dạng vẫn phải đọc được.
//   [...]                    → mảng bản ghi (định dạng chuẩn)
//   { portfolios: [...] }    → dán nguyên payload file export
//   { portfolio: {...} }     → dán đúng MỘT bản ghi
//   "[...]"                  → chuỗi JSON bị stringify hai lần
function coerceList(parsed, depth = 0) {
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'string' && depth < 2) {
    try {
      return coerceList(JSON.parse(parsed), depth + 1);
    } catch {
      return null;
    }
  }
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.portfolios)) return parsed.portfolios;
    if (parsed.portfolio && typeof parsed.portfolio === 'object') return [parsed];
  }
  return null;
}

function readStore(store, key) {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return coerceList(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStore(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Khoá định danh một bản ghi. savedAt là thời điểm lưu (đủ phân biệt vì App
// prepend từng record một), name chỉ để chống trùng khi savedAt bị thiếu.
function recordKey(r, i) {
  return r?.savedAt || `${r?.name || 'unnamed'}#${i}`;
}

// Gộp hai nguồn: giữ nguyên thứ tự của `primary`, nối thêm bản ghi chỉ có ở
// `backup` (trường hợp localStorage bị xoá/ghi đè thiếu). Trùng khoá → ưu tiên
// primary vì đó là bản người dùng thao tác gần nhất.
export function mergeSavedPortfolios(primary, backup) {
  const out = [...(primary || [])];
  const seen = new Set(out.map(recordKey));
  (backup || []).forEach((r, i) => {
    const k = recordKey(r, i);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(r);
    }
  });
  return out;
}

// Đọc cả hai kho rồi gộp. Trả về { list, restored } — restored = true khi
// sessionStorage bù được bản ghi mà localStorage không còn, để phía gọi ghi
// ngược lại localStorage và báo cho người dùng biết.
export function loadSavedPortfolios() {
  const local = readStore(localStorage, STORAGE_KEY);
  const session = readStore(sessionStorage, STORAGE_KEY);
  const list = mergeSavedPortfolios(local, session);
  return { list, restored: list.length > (local?.length ?? 0) };
}

// Ghi đồng thời cả hai kho + đẩy một bản chụp vào lịch sử.
export function savePortfoliosToStorage(list) {
  writeStore(localStorage, STORAGE_KEY, list);
  writeStore(sessionStorage, STORAGE_KEY, list);
  pushHistorySnapshot(list);
}

// Lịch sử chỉ ghi khi nội dung thực sự đổi, giữ HISTORY_LIMIT bản mới nhất.
// Mỗi bản chụp có `id` riêng: nhiều thao tác có thể rơi vào cùng một
// millisecond nên `at` không đủ để phân biệt.
export function pushHistorySnapshot(list) {
  const history = readStore(localStorage, HISTORY_KEY) || [];
  const serialized = JSON.stringify(list);
  if (history[0] && JSON.stringify(history[0].list) === serialized) return history;
  const at = new Date().toISOString();
  const snapshot = { id: `${at}#${Math.random().toString(36).slice(2, 8)}`, at, list };
  const next = [snapshot, ...history].slice(0, HISTORY_LIMIT);
  writeStore(localStorage, HISTORY_KEY, next);
  writeStore(sessionStorage, HISTORY_KEY, next);
  return next;
}

// Lịch sử cũng đọc gộp 2 kho: bản chụp ở sessionStorage sống sót khi
// localStorage bị xoá sạch. Bản cũ (trước khi có `id`) fallback về `at`.
export function loadHistory() {
  const local = readStore(localStorage, HISTORY_KEY) || [];
  const session = readStore(sessionStorage, HISTORY_KEY) || [];
  const seen = new Set();
  return [...local, ...session]
    .filter((s) => {
      const k = s?.id || s?.at;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
