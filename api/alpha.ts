import { loadAlphaSubnets } from './_lib/alpha';

/**
 * Server-only: gọi upstream, parse SSE, trả JSON `{ subnets }` —
 * client không thấy host/format nguồn.
 */
export const config = { runtime: 'edge' };

export default async function handler(): Promise<Response> {
  try {
    const body = await loadAlphaSubnets();
    return Response.json(body, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Không tải được dữ liệu' }, { status: 502 });
  }
}
