import { fileURLToPath, URL } from 'node:url';
import type { Connect, Plugin, PreviewServer, ViteDevServer } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadAlphaSubnets } from './api/_lib/alpha';
import { loadMarketData } from './api/_lib/market';

/**
 * Dev/preview: phục vụ `/api/alpha` và `/api/market` giống Edge trên Vercel —
 * gọi upstream trên Node, trả JSON sạch (không lộ URL nguồn qua network tab).
 */
function localApiPlugin(): Plugin {
  function attach(middlewares: Connect.Server) {
    middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path !== '/api/alpha' && path !== '/api/market') {
        next();
        return;
      }
      try {
        const body = path === '/api/alpha' ? await loadAlphaSubnets() : await loadMarketData();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(body));
      } catch {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Không tải được dữ liệu' }));
      }
    });
  }

  return {
    name: 'local-api-json',
    configureServer(server: ViteDevServer) {
      attach(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      attach(server.middlewares);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  resolve: {
    // `@/` → src/ (khớp với "paths" trong tsconfig.app.json).
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
