/**
 * Hàm định dạng hiển thị: số lớn, phần trăm, chuỗi.
 * Chỉ định dạng — không có logic nghiệp vụ.
 */

/** Giá trị "nguyên thuỷ" hiển thị được trong một ô bảng. */
export function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return (
    value === null ||
    value === undefined ||
    ['string', 'number', 'boolean'].includes(typeof value)
  );
}

/**
 * Rút gọn số lớn (M / B / T / P) cho các cột tiền tệ / khối lượng.
 * Các cột khác dùng `toLocaleString()`.
 */
export function formatBig(n: number, key?: string): string {
  const abs = Math.abs(n);
  if (key && /(_tao|market_cap|volume|liquidity|alpha|flow)/.test(key)) {
    if (abs >= 1e15) return (n / 1e15).toFixed(3) + 'P';
    if (abs >= 1e12) return (n / 1e12).toFixed(3) + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(3) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(3) + 'M';
  }
  return n.toLocaleString();
}

/**
 * Định dạng chỉ số hiển thị theo loại field: field tăng trưởng (…change…) hiện %,
 * còn lại (liquidity, price, emission, market_cap…) hiện số thực (rút gọn nếu là số lớn).
 */
export function formatMetric(n: number, key?: string): string {
  if (!key || /change/.test(key)) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  }
  return formatBig(n, key);
}

/** Phần trăm có dấu: +1.23% / -4.56% / 0.00%. */
export function formatSignedPercent(n: number, digits = 2): string {
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

/** Hiển thị % gọn: tối đa 4 chữ số thập phân, bỏ số 0 thừa (5 → "5", 2.040816 → "2.0408"). */
export function formatCompactPercent(value: number): string {
  return String(+Math.max(0, value).toFixed(4));
}

/** Escape HTML để chèn chuỗi người dùng vào markup an toàn. */
export function escHTML(s: unknown): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Tên hiển thị của danh mục đã lưu: tên đặt, hoặc thời điểm lưu theo locale vi-VN. */
export function formatSavedAt(savedAt: string): string {
  return new Date(savedAt).toLocaleString('vi-VN');
}
