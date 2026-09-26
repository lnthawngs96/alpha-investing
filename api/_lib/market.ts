import { UPSTREAM_MARKET_PAGE } from './upstream';

/** Dòng cổ phiếu đã chuẩn hoá — netuid = ticker. */
export interface MarketStockJson {
  netuid: string;
  name?: string | number;
  sector?: string | number;
  price?: string | number;
  volume?: string | number;
  pv?: string | number;
  mc?: string | number;
  [key: string]: unknown;
}

export interface MarketApiResponse {
  deregIds: number[];
  stocks: MarketStockJson[];
  cashEtfs: string[];
}

const DEREG_LINE_RE = /dereg\s*list\s*:\s*(\[[^\]]*\])/i;
const CASH_ETFS_LINE_RE = /cash\s*ETFs\s*:\s*(\[[^\]]*\])/i;

function parseNumberArray(raw: string): number[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((id) => Number(id)).filter((n) => Number.isFinite(n));
}

function parseTickerList(raw: string): string[] {
  const parsed = JSON.parse(raw.replace(/'/g, '"')) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((t) => String(t).trim()).filter(Boolean);
}

function cellValue(raw: string): string | number | undefined {
  const s = raw.trim();
  if (!s || s === 'NaN' || s === 'None') return undefined;
  const n = Number(s);
  return Number.isFinite(n) && /^-?[\d.]/.test(s) ? n : s;
}

function parseMarketPage(text: string): MarketApiResponse {
  const plain = text.replace(/<[^>]+>/g, ' ');
  const deregMatch = plain.match(DEREG_LINE_RE);
  const cashMatch = plain.match(CASH_ETFS_LINE_RE);
  const deregIds = deregMatch ? parseNumberArray(deregMatch[1]) : [];
  const cashEtfs = cashMatch ? parseTickerList(cashMatch[1]) : [];

  const lines = text.split('\n');
  const headerIdx = lines.findIndex((l) => /^\s*netuid\s+name\s+/.test(l));
  if (headerIdx < 0) throw new Error('no table');

  const header = lines[headerIdx];
  const tokens = [...header.matchAll(/\S+/g)];
  const firstEnd = tokens[0].index! + tokens[0][0].length;
  const columns = tokens.slice(1).map((t) => ({
    name: t[0],
    end: t.index! + t[0].length - firstEnd,
  }));

  const stocks: MarketStockJson[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    const close = line.indexOf('</a>');
    if (close < 0) continue;
    const ticker = line.slice(0, close).replace(/<[^>]+>/g, '').trim();
    if (!ticker) continue;
    const rest = line.slice(close + 4);
    const row: MarketStockJson = { netuid: ticker };
    let start = 0;
    for (const col of columns) {
      const v = cellValue(rest.slice(start, col.end));
      if (v !== undefined) row[col.name] = v;
      start = col.end;
    }
    stocks.push(row);
  }
  if (!stocks.length) throw new Error('empty stocks');
  return { deregIds, stocks, cashEtfs };
}

/** Gọi upstream trên server, trả JSON sạch cho client. */
export async function loadMarketData(): Promise<MarketApiResponse> {
  const upstream = await fetch(UPSTREAM_MARKET_PAGE, {
    method: 'GET',
    headers: {
      Accept: '*/*',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
  return parseMarketPage(await upstream.text());
}
