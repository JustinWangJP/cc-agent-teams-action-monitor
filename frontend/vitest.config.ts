import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest 設定ファイル。
 *
 * フロントエンドのユニットテスト環境を定義します。
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // グローバルセットアップファイル
    setupFiles: ['./src/test/setup.tsx'],

    // テスト環境（jsdom でブラウザ環境をシミュレート）
    environment: 'jsdom',

    // グローバル変数を有効化
    globals: true,

    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'src/main.tsx',
      ],
      // カバレッジ目標（UT計画書に基づく）
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },

    // テストファイルのマッチパターン
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // 除外パターン
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // ウォッチモードの設定
    watchExclude: ['**/node_modules/**', '**/dist/**'],
  },

  // パスエイリアス（vite.config.ts と共通）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
