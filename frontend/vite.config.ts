import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Randevu frontend'i 5174'te çalışır (TaskFlow 5173'ü kullandığı için).
// /api istekleri backend'e (4001) proxy'lenir; böylece CORS gerekmez.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
      },
    },
  },
});
