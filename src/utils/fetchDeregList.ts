import type { SubnetRow } from '@/types';
import { INVESTING88_ASSETS_URL } from '@/constants/api';
import { parseDeregInput } from './subnetData';

const DEREG_LINE_RE = /dereg\s*list\s*:\s*(\[[^\]]*\])/i;
const CASH_ETFS_LINE_RE = /cash\s*ETFs\s*:\s*(\[[^\]]*\])/i;

/** Tải nguyên văn trang https://api.investing88.ai/assets (HTML `<pre>`). */
async function fetchAssetsPage(signal?: AbortSignal): Promise<string> {
  const res = await fetch(INVESTING88_ASSETS_URL, {
    method: 'GET',
    signal,
    // Không cần cookies; tránh CORS credential mode.
    credentials: 'omit',
  });
  if (!res.ok) {
    throw new Error(`Không tải được assets (${res.status})`);
  }
  return res.text();
}

/**
 * Lấy mảng netuid dereg từ https://api.investing88.ai/assets
 * (phản hồi HTML/text có dòng `dereg list: [84]`).
 */
export async function fetchAssetsDeregList(
  signal?: AbortSignal
): Promise<number[]> {
  const text = await fetchAssetsPage(signal);
  const plain = text.replace(/<[^>]+>/g, ' ');
  const match = plain.match(DEREG_LINE_RE);
  if (!match) {
    throw new Error('Không tìm thấy dòng "dereg list" trong phản hồi assets');
  }
  return parseDeregInput(match[1]);
}

// ============================================================================
// Bảng cổ phiếu Mỹ
//
// Cùng trang assets có dòng `cash ETFs: ['SGOV', ...]` và một bảng pandas
// `to_string()` (fixed-width, cột căn phải):
//   netuid      name      sector   price   volume   pv   mc
//     <a href="…/NVDA/">NVDA</a>   NVIDIA Corporation   Semiconductors   225.07 …
// Cột đầu (ticker) được bọc thẻ <a> nên độ rộng thô lệch theo URL; phần SAU
// `</a>` thì thẳng hàng với phần header sau tên cột đầu → cắt theo vị trí đó.
// Dòng cuối (`----` / tổng số mã) không có <a> nên tự bị bỏ qua.
// ============================================================================

/** Kết quả đọc phần cổ phiếu Mỹ của trang assets. */
export interface UsStockAssets {
  /** Mỗi dòng: `netuid` = ticker, kèm name, sector, price, volume, pv, mc. */
  stocks: SubnetRow[];
  /** Cash ETFs — mạng tính như tiền mặt, bị loại khỏi bảng như dereg. */
  cashEtfs: string[];
}

/** 'NaN' / rỗng → undefined; chuỗi số → number; còn lại giữ chuỗi. */
function cellValue(raw: string): string | number | undefined {
  const s = raw.trim();
  if (!s || s === 'NaN' || s === 'None') return undefined;
  const n = Number(s);
  return Number.isFinite(n) && /^-?[\d.]/.test(s) ? n : s;
}

/** Mảng kiểu Python `['SGOV', 'BIL']` → ['SGOV', 'BIL']. */
export function parseTickerList(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.replace(/'/g, '"'));
  } catch {
    throw new Error("Danh sách ticker cần dạng mảng, ví dụ ['SGOV', 'BIL']");
  }
  if (!Array.isArray(parsed)) throw new Error("Danh sách ticker cần dạng mảng, ví dụ ['SGOV', 'BIL']");
  return parsed.map((t) => String(t).trim()).filter(Boolean);
}

/** Đọc bảng cổ phiếu + cash ETFs từ nội dung trang assets. */
export function parseUsStockAssets(text: string): UsStockAssets {
  const lines = text.split('\n');
  const plain = text.replace(/<[^>]+>/g, ' ');
  const cashMatch = plain.match(CASH_ETFS_LINE_RE);
  const cashEtfs = cashMatch ? parseTickerList(cashMatch[1]) : [];

  const headerIdx = lines.findIndex((l) => /^\s*netuid\s+name\s+/.test(l));
  if (headerIdx < 0) throw new Error('Không tìm thấy bảng cổ phiếu trong phản hồi assets');
  const header = lines[headerIdx];

  // Vị trí kết thúc (căn phải) của từng tên cột, tính từ sau tên cột đầu.
  const tokens = [...header.matchAll(/\S+/g)];
  const firstEnd = tokens[0].index! + tokens[0][0].length;
  const columns = tokens.slice(1).map((t) => ({ name: t[0], end: t.index! + t[0].length - firstEnd }));

  const stocks: SubnetRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    const close = line.indexOf('</a>');
    if (close < 0) continue;
    const ticker = line.slice(0, close).replace(/<[^>]+>/g, '').trim();
    if (!ticker) continue;
    const rest = line.slice(close + 4);
    const row: SubnetRow = { netuid: ticker };
    let start = 0;
    for (const col of columns) {
      const v = cellValue(rest.slice(start, col.end));
      if (v !== undefined) row[col.name] = v;
      start = col.end;
    }
    stocks.push(row);
  }
  if (!stocks.length) throw new Error('Bảng cổ phiếu trong phản hồi assets rỗng');
  return { stocks, cashEtfs };
}

/** Tải bảng cổ phiếu Mỹ + cash ETFs từ https://api.investing88.ai/assets. */
export async function fetchUsStockAssets(signal?: AbortSignal): Promise<UsStockAssets> {
  return parseUsStockAssets(await fetchAssetsPage(signal));
}

/** Bỏ các mã nằm trong danh sách loại trừ (vd cash ETFs). */
export function filterExcludedTickers(rows: SubnetRow[], excluded: Iterable<string>): SubnetRow[] {
  const set = new Set([...excluded].map((t) => String(t).trim()));
  return rows.filter((r) => !set.has(String(r.netuid)));
}
