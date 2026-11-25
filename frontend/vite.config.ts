import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 5174, taskflow 5173'u kullaniyor
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
