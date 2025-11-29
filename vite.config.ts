import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pagesなどのサブディレクトリデプロイに対応するために相対パスを使用
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});