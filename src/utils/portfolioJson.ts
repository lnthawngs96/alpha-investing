import type { Portfolio } from '@/types';
import { portfolioEntriesDesc } from './portfolioValidation';

/**
 * Định dạng JSON "thoáng" của danh mục để hiển thị / copy / sửa tay.
 */

/**
 * Build chuỗi JSON thủ công để giữ thứ tự value cao → thấp.
 * (JSON.stringify luôn duyệt key số nguyên theo thứ tự tăng dần nên không dùng được ở đây.)
 * Giữ key '_' (asset class Tao/Alpha) ở đầu; key netuid không có ngoặc kép (vd `1: 0.05`).
 */
export function formatPortfolioJson(portfolio: Portfolio): string {
  const sorted = portfolioEntriesDesc(portfolio);
  const lines = [`  "_": ${portfolio._ ?? 0}`, ...sorted.map(([k, v]) => `  ${k}: ${v}`)];
  return `{\n${lines.join(',\n')}\n}`;
}

export type ParsedPortfolioJson =
  | { ok: true; portfolio: Portfolio }
  | { ok: false; error: string };

/**
 * Parse JSON thoáng (key số không có ngoặc kép) ngược lại thành portfolio.
 * Đảm bảo có '_' và mọi value là number (chưa kiểm tra hợp lệ Tao/Alpha).
 */
export function parseRelaxedPortfolioJson(text: string): ParsedPortfolioJson {
  let parsed: unknown;
  try {
    // Thêm lại ngoặc kép cho key số nguyên (định dạng thoáng) trước khi JSON.parse.
    parsed = JSON.parse(text.replace(/(\d+)\s*:/g, '"$1":'));
  } catch {
    return { ok: false, error: 'JSON sai cú pháp' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'JSON phải là một object' };
  }

  const record = parsed as Record<string, unknown>;
  const portfolio: Portfolio = { _: (record._ as number) ?? 0 };
  for (const [k, v] of Object.entries(record)) {
    if (k === '_') continue;
    const num = typeof v === 'number' ? v : parseFloat(v as string);
    portfolio[k] = num;
  }
  return { ok: true, portfolio };
}
