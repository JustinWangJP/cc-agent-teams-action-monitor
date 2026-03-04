// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // グローバル除外設定
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/test/setup.ts', // テストセットアップ（モック多用のため除外）
      '*.config.js', // 設定ファイル
      'vite.config.ts',
      'e2e/**', // E2Eテスト（Puppeteer/Playwright）
      'e2e_*.js',
      'e2e_*.mjs',
      '*-test-*.mjs', // E2Eテストスクリプト
    ],
  },

  // 基本設定
  eslint.configs.recommended,

  // TypeScript設定
  ...tseslint.configs.recommended,

  // React設定
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      // React推奨ルール
      'react/react-in-jsx-scope': 'off', // React 17+ で不要
      'react/prop-types': 'off', // TypeScriptで型チェック済み
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript調整
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  }
);
