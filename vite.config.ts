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
});
