import { ALPHA_ORIGIN_HEADERS, RAO_PER_TAO, UPSTREAM_ALPHA_STREAM } from './upstream';

/** Dòng subnet đã chuẩn hoá — khớp SubnetRow phía client. */
export interface AlphaSubnetJson {
  netuid: number;
  name?: string;
  price?: number;
  emission?: number;
  liquidity?: number;
  price_change_1_hour?: number;
  price_change_1_day?: number;
  price_change_1_week?: number;
  price_change_1_month?: number;
}

export interface AlphaApiResponse {
  subnets: AlphaSubnetJson[];
}

interface StreamRow {
  subnet: number;
  name?: string;
  price?: number;
  emission?: number;
  tao_liquidity?: number;
  price_difference_hour?: number;
  price_difference_day?: number;
  price_difference_week?: number;
  price_difference_month?: number;
}

async function readFirstSseEvent(res: Response): Promise<string> {
  if (!res.body) throw new Error('empty');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const sep = buf.indexOf('\n\n');
      if (sep >= 0) {
        await reader.cancel().catch(() => undefined);
        return buf.slice(0, sep);
      }
      if (buf.length > 8_000_000) throw new Error('too large');
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  return buf;
}

function mapRow(row: StreamRow): AlphaSubnetJson {
  const liqRao = Number(row.tao_liquidity);
  return {
    netuid: Number(row.subnet),
    name: row.name,
    price: row.price,
    emission: row.emission,
    liquidity: Number.isFinite(liqRao) ? liqRao / RAO_PER_TAO : undefined,
    price_change_1_hour: row.price_difference_hour,
    price_change_1_day: row.price_difference_day,
    price_change_1_week: row.price_difference_week,
    price_change_1_month: row.price_difference_month,
  };
}

/** Gọi upstream trên server, trả JSON sạch cho client. */
export async function loadAlphaSubnets(): Promise<AlphaApiResponse> {
  const upstream = await fetch(UPSTREAM_ALPHA_STREAM, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'User-Agent': 'Mozilla/5.0',
      ...ALPHA_ORIGIN_HEADERS,
    },
  });
  if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

  const eventText = await readFirstSseEvent(upstream);
  const line = eventText
    .split('\n')
    .map((l) => l.trimEnd())
    .find((l) => l.startsWith('data:'));
  if (!line) throw new Error('bad format');

  const parsed = JSON.parse(line.replace(/^data:\s*/, '')) as { data?: StreamRow[] };
  if (!Array.isArray(parsed.data) || !parsed.data.length) throw new Error('empty');

  return { subnets: parsed.data.map(mapRow) };
}
