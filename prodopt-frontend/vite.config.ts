import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Адрес вашего бэкенда
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Если бэкенд не имеет префикса /api, раскомментируйте. 
        // Но в main.ts бэкенда Swagger на /api, значит глобальный префикс, скорее всего, не стоит,
        // но контроллеры могут ожидать прямые пути.
        // В вашем main.ts нет setGlobalPrefix('api'). 
        // ЗНАЧИТ НУЖНО УБИРАТЬ /api ПРИ ПРОКСИРОВАНИИ:
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});