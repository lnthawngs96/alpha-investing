/**
 * Proxy Edge tới api.taomarketcap.com. Bắt buộc gắn Origin/Referer
 * `taomarketcap.com` (không có → 403). Vite proxy chỉ có ở local.
 */
export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/taomarketcap/, '') || '/';
  const target = `https://api.taomarketcap.com${path}${url.search}`;

  const upstream = await fetch(target, {
    method: 'GET',
    headers: {
      Accept: request.headers.get('Accept') ?? 'text/event-stream',
      Origin: 'https://taomarketcap.com',
      Referer: 'https://taomarketcap.com/',
      'User-Agent': request.headers.get('User-Agent') ?? 'Mozilla/5.0',
    },
  });

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-cache');

  return new Response(upstream.body, { status: upstream.status, headers });
}
