import type { Portfolio } from '@/types';
import { tt } from '@/i18n';
import { portfolioEntriesDesc } from './portfolioValidation';

/**
 * Định dạng JSON "thoáng" của danh mục để hiển thị / copy / sửa tay.
 */

/**
 * Build chuỗi JSON thủ công để giữ thứ tự value cao → thấp.
 * (JSON.stringify luôn duyệt key số nguyên theo thứ tự tăng dần nên không dùng được ở đây.)
 * Giữ key '_' (asset class) ở đầu; key netuid không có ngoặc kép (vd `1: 0.05`),
 * key ticker cổ phiếu Mỹ có ngoặc kép (vd `"NVDA": 0.05`).
 */
export function formatPortfolioJson(portfolio: Portfolio): string {
  const sorted = portfolioEntriesDesc(portfolio);
  const fmtKey = (k: string) => (/^\d+$/.test(k) ? k : JSON.stringify(k));
  const lines = [`  "_": ${portfolio._ ?? 0}`, ...sorted.map(([k, v]) => `  ${fmtKey(k)}: ${v}`)];
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
    // Định dạng kiểu Python của Subnet 88: {'_':1, 'AAPL':0.15} → nháy đơn thành nháy kép.
    try {
      parsed = JSON.parse(text.replace(/'/g, '"').replace(/(\d+)\s*:/g, '"$1":'));
    } catch {
      return { ok: false, error: tt('file.badSyntax') };
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: tt('file.mustBeObject') };
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
