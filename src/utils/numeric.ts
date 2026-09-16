/**
 * Tiện ích xử lý chuỗi số cho ô input chỉ nhận số.
 */

export interface SanitizeNumericOptions {
  /** Chỉ cho phép số nguyên (bỏ phần thập phân). */
  integer?: boolean;
}

/**
 * Chỉ giữ chữ số (và một dấu chấm nếu cho phép thập phân). Chuỗi rỗng được giữ nguyên.
 */
export function sanitizeNumericText(raw: unknown, { integer = false }: SanitizeNumericOptions = {}): string {
  if (raw == null) return '';
  const s = String(raw).replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (integer) return dot === -1 ? s : s.slice(0, dot);
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
}

/** Ô trống / chỉ dấu chấm → fallback; còn lại parseFloat, NaN → fallback. */
export function parseNumericText(s: string | null | undefined, fallback = 0): number {
  if (s == null || s === '' || s === '.') return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

/**
 * Đọc số từ giá trị bất kỳ (số hoặc chuỗi số). NaN nếu không phải số.
 * Dùng thay `parseFloat(row[field])` để tránh ép kiểu `unknown` rải rác.
 */
export function toNumber(value: unknown): number {
  return parseFloat(value as string);
}

/** Số hữu hạn hoặc -Infinity — dùng khi sắp xếp giảm dần để đẩy giá trị thiếu xuống cuối. */
export function numberOrNegInfinity(value: unknown): number {
  const n = toNumber(value);
  return isNaN(n) ? -Infinity : n;
}
