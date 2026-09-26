import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@/` → src/ (khớp với "paths" trong tsconfig.app.json).
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Tránh CORS khi gọi API từ trình duyệt (dev + preview).
  // TaoMarketCap bắt buộc Origin = taomarketcap.com (không có → 403).
  server: {
    proxy: {
      '/api/investing88': {
        target: 'https://api.investing88.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/investing88/, ''),
      },
      '/api/taomarketcap': {
        target: 'https://api.taomarketcap.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/taomarketcap/, ''),
        headers: {
          Origin: 'https://taomarketcap.com',
          Referer: 'https://taomarketcap.com/',
        },
      },
    },
  },
  preview: {
    proxy: {
      '/api/investing88': {
        target: 'https://api.investing88.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/investing88/, ''),
      },
      '/api/taomarketcap': {
        target: 'https://api.taomarketcap.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/taomarketcap/, ''),
        headers: {
          Origin: 'https://taomarketcap.com',
          Referer: 'https://taomarketcap.com/',
        },
      },
    },
  },
});
