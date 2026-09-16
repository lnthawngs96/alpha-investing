import type { HistorySnapshot, SavedPortfolioRecord } from '@/types';
import { HISTORY_KEY, HISTORY_LIMIT, STORAGE_KEY } from '@/constants/storage';

// ============================================================================
// LƯU TRỮ 3 BÊN (localStorage + sessionStorage + context trong RAM)
//
// localStorage là bản chính (sống qua các phiên). sessionStorage là bản sao
// trong tab hiện tại: nếu localStorage bị xoá nhầm, dữ liệu vẫn còn ở đây và
// được gộp lại ở lần đọc kế tiếp. HISTORY_KEY giữ vài bản chụp gần nhất để
// truy vết / hoàn tác khi xoá nhầm ngay trong app.
// Bên thứ ba (state của SavedPortfoliosProvider) nằm ở store/savedPortfolios.
// ============================================================================

/**
 * Chấp nhận nhiều hình dạng thay vì vứt im lặng: đây là đường khôi phục dữ
 * liệu, gán tay hơi lệch định dạng vẫn phải đọc được.
 *   [...]                    → mảng bản ghi (định dạng chuẩn)
 *   { portfolios: [...] }    → dán nguyên payload file export
 *   { portfolio: {...} }     → dán đúng MỘT bản ghi
 *   "[...]"                  → chuỗi JSON bị stringify hai lần
 */
function coerceList<T>(parsed: unknown, depth = 0): T[] | null {
  if (Array.isArray(parsed)) return parsed as T[];
  if (typeof parsed === 'string' && depth < 2) {
    try {
      return coerceList<T>(JSON.parse(parsed), depth + 1);
    } catch {
      return null;
    }
  }
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.portfolios)) return record.portfolios as T[];
    if (record.portfolio && typeof record.portfolio === 'object') return [parsed as T];
  }
  return null;
}

/**
 * Đọc bỏ qua lỗi: Safari private mode và quota đầy đều ném exception,
 * mất một tầng sao lưu không được phép làm hỏng luồng chính.
 */
function readStore<T>(store: Storage, key: string): T[] | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    return coerceList<T>(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStore(store: Storage, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Khoá định danh một bản ghi. savedAt là thời điểm lưu (đủ phân biệt vì App
 * prepend từng record một), name chỉ để chống trùng khi savedAt bị thiếu.
 */
function recordKey(r: SavedPortfolioRecord | null | undefined, i: number): string {
  return r?.savedAt || `${r?.name || 'unnamed'}#${i}`;
}

/**
 * Gộp hai nguồn: giữ nguyên thứ tự của `primary`, nối thêm bản ghi chỉ có ở
 * `backup` (trường hợp localStorage bị xoá/ghi đè thiếu). Trùng khoá → ưu tiên
 * primary vì đó là bản người dùng thao tác gần nhất.
 */
export function mergeSavedPortfolios(
  primary: SavedPortfolioRecord[] | null | undefined,
  backup: SavedPortfolioRecord[] | null | undefined
): SavedPortfolioRecord[] {
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

export interface LoadedPortfolios {
  list: SavedPortfolioRecord[];
  /** true khi sessionStorage bù được bản ghi mà localStorage không còn. */
  restored: boolean;
}

/**
 * Đọc cả hai kho rồi gộp. `restored` = true khi sessionStorage bù được bản ghi
 * mà localStorage không còn, để phía gọi ghi ngược lại localStorage và báo cho
 * người dùng biết.
 */
export function loadSavedPortfolios(): LoadedPortfolios {
  const local = readStore<SavedPortfolioRecord>(localStorage, STORAGE_KEY);
  const session = readStore<SavedPortfolioRecord>(sessionStorage, STORAGE_KEY);
  const list = mergeSavedPortfolios(local, session);
  return { list, restored: list.length > (local?.length ?? 0) };
}

/** Ghi đồng thời cả hai kho + đẩy một bản chụp vào lịch sử. */
export function savePortfoliosToStorage(list: SavedPortfolioRecord[]): void {
  writeStore(localStorage, STORAGE_KEY, list);
  writeStore(sessionStorage, STORAGE_KEY, list);
  pushHistorySnapshot(list);
}

/**
 * Lịch sử chỉ ghi khi nội dung thực sự đổi, giữ HISTORY_LIMIT bản mới nhất.
 * Mỗi bản chụp có `id` riêng: nhiều thao tác có thể rơi vào cùng một
 * millisecond nên `at` không đủ để phân biệt.
 */
export function pushHistorySnapshot(list: SavedPortfolioRecord[]): HistorySnapshot[] {
  const history = readStore<HistorySnapshot>(localStorage, HISTORY_KEY) || [];
  const serialized = JSON.stringify(list);
  if (history[0] && JSON.stringify(history[0].list) === serialized) return history;
  const at = new Date().toISOString();
  const snapshot: HistorySnapshot = { id: `${at}#${Math.random().toString(36).slice(2, 8)}`, at, list };
  const next = [snapshot, ...history].slice(0, HISTORY_LIMIT);
  writeStore(localStorage, HISTORY_KEY, next);
  writeStore(sessionStorage, HISTORY_KEY, next);
  return next;
}

/**
 * Lịch sử cũng đọc gộp 2 kho: bản chụp ở sessionStorage sống sót khi
 * localStorage bị xoá sạch. Bản cũ (trước khi có `id`) fallback về `at`.
 */
export function loadHistory(): HistorySnapshot[] {
  const local = readStore<HistorySnapshot>(localStorage, HISTORY_KEY) || [];
  const session = readStore<HistorySnapshot>(sessionStorage, HISTORY_KEY) || [];
  const seen = new Set<string>();
  return [...local, ...session]
    .filter((s) => {
      const k = s?.id || s?.at;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** Đọc một giá trị JSON bất kỳ từ localStorage (dùng cho tuỳ chọn theme). Lỗi → null. */
export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Ghi một giá trị JSON bất kỳ vào localStorage, bỏ qua lỗi. */
export function writeJson(key: string, value: unknown): void {
  writeStore(localStorage, key, value);
}
