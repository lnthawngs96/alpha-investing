import type { SubnetRow } from '@/types';
import { RAO_PER_TAO, TAOMARKETCAP_SUBNETS_STREAM_URL } from '@/constants/api';

/** Một dòng raw từ SSE `subnets/table/stream` của TaoMarketCap. */
interface TmcSubnetRow {
  subnet: number;
  name?: string;
  price?: number;
  emission?: number;
  tao_liquidity?: number;
  price_difference_hour?: number;
  price_difference_day?: number;
  price_difference_week?: number;
  price_difference_month?: number;
  [key: string]: unknown;
}

interface TmcStreamEvent {
  type: string;
  data: TmcSubnetRow[];
}

/** Đọc đến hết event SSE đầu tiên (chunk kết thúc bằng `\n\n`). */
async function readFirstSseEvent(res: Response, signal?: AbortSignal): Promise<string> {
  if (!res.body) throw new Error('Phản hồi stream không có body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const sep = buf.indexOf('\n\n');
      if (sep >= 0) {
        await reader.cancel().catch(() => undefined);
        return buf.slice(0, sep);
      }
      // Tránh giữ buffer vô hạn nếu server không gửi delimiter.
      if (buf.length > 8_000_000) throw new Error('Sự kiện SSE subnet quá lớn');
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* đã cancel */
    }
  }
  return buf;
}

function parseSseDataLine(eventText: string): TmcStreamEvent {
  const line = eventText
    .split('\n')
    .map((l) => l.trimEnd())
    .find((l) => l.startsWith('data:'));
  if (!line) throw new Error('Không tìm thấy dòng data trong SSE subnet');
  const json = line.replace(/^data:\s*/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('SSE subnet không phải JSON hợp lệ');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Sự kiện SSE subnet rỗng');
  const ev = parsed as TmcStreamEvent;
  if (!Array.isArray(ev.data)) throw new Error('Sự kiện SSE subnet thiếu mảng data');
  return ev;
}

/** Map một dòng TaoMarketCap → SubnetRow dùng trong app. */
export function mapTmcSubnetRow(row: TmcSubnetRow): SubnetRow {
  const liqRao = Number(row.tao_liquidity);
  return {
    netuid: Number(row.subnet),
    name: row.name ?? undefined,
    price: row.price,
    // emission trên stream đã là % (tổng ≈ 100).
    emission: row.emission,
    liquidity: Number.isFinite(liqRao) ? liqRao / RAO_PER_TAO : undefined,
    price_change_1_hour: row.price_difference_hour,
    price_change_1_day: row.price_difference_day,
    price_change_1_week: row.price_difference_week,
    price_change_1_month: row.price_difference_month,
  };
}

/**
 * Tải bảng subnet Alpha từ TaoMarketCap SSE
 * (`/internal/v1/subnets/table/stream/`, event `type: "full"`).
 * Không cần API key; qua Vite proxy để gắn Origin bắt buộc.
 */
export async function fetchSubnetTable(signal?: AbortSignal): Promise<SubnetRow[]> {
  const res = await fetch(TAOMARKETCAP_SUBNETS_STREAM_URL, {
    method: 'GET',
    signal,
    credentials: 'omit',
    headers: { Accept: 'text/event-stream' },
  });
  if (!res.ok) {
    throw new Error(`Không tải được bảng subnet (${res.status})`);
  }
  const eventText = await readFirstSseEvent(res, signal);
  const ev = parseSseDataLine(eventText);
  if (!ev.data.length) throw new Error('Bảng subnet từ TaoMarketCap rỗng');
  return ev.data.map(mapTmcSubnetRow);
}
