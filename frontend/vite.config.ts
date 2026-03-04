import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // テストで .tsx ファイルを拡張子なしでインポート可能にする
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**/*', '**/*.d.ts', '**/node_modules/**'],
    },
  },
})
