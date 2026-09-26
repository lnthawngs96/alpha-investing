/**
 * Proxy Edge tới api.investing88.ai — Vite proxy chỉ có ở local, Vercel cần
 * function này để `/api/investing88/*` không 404.
 */
export const config = { runtime: 'edge' };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/investing88/, '') || '/';
  const target = `https://api.investing88.ai${path}${url.search}`;

  const upstream = await fetch(target, {
    method: 'GET',
    headers: {
      Accept: request.headers.get('Accept') ?? '*/*',
      'User-Agent': request.headers.get('User-Agent') ?? 'Mozilla/5.0',
    },
  });

  const headers = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: upstream.status, headers });
}
