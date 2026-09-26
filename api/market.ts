import { loadMarketData } from './_lib/market';

/**
 * Server-only: gọi upstream, parse HTML, trả JSON
 * `{ deregIds, stocks, cashEtfs }` — client không thấy host/format nguồn.
 */
export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  try {
    const body = await loadMarketData();
    return Response.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Không tải được dữ liệu' }, { status: 502 });
  }
}
