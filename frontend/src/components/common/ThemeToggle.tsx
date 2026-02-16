/**
 * テーマ切り替えトグルコンポーネント。
 *
 * ライトモード・ダークモードを切り替えるボタンコンポーネントです。
 *
 * @module components/common/ThemeToggle
 */

import { useState, useEffect, useRef } from 'react';
import type { ThemeMode } from '@/types/theme';

/**
 * ThemeToggle コンポーネントのプロパティ。
 */
export interface ThemeToggleProps {
  /** 追加のCSSクラス */
  className?: string;
  /** ボタンのサイズ（省略時は 'md'） */
  size?: 'sm' | 'md' | 'lg';
  /** アイコンのみ表示するかどうか */
  iconOnly?: boolean;
  /** 変更時のコールバック関数 */
  onThemeChange?: (theme: ThemeMode) => void;
}

/**
 * テーマ切り替えトグルコンポーネント。
 *
 * クリック時にライトモード・ダークモードを切り替えます。
 * localStorage に設定を保存し、次回訪問時に反映します。
 *
 * @param props - コンポーネントプロパティ
 * @returns テーマトグルボタン要素
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * // 出力: 🌙 / ☀️ アイコンボタン
 *
 * <ThemeToggle iconOnly={false} size="lg" />
 * // 出力: ラベル付きの大きなボタン
 * ```
 */
export function ThemeToggle({
  className = '',
  size = 'md',
  iconOnly: _iconOnly = true,
  onThemeChange,
}: ThemeToggleProps) {
  // 初期レンダリング検出用フラグ
  const isInitialRender = useRef(true);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    // SSR 対応: ブラウザ環境のみ localStorage にアクセス
    if (typeof window === 'undefined') {
      return 'light';
    }

    // localStorage から設定を読み込む
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    if (stored) return stored;

    // システム設定を検出
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // テーマ変更時に DOM と localStorage を更新
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // SSR 対応
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }

    // 初期レンダリング時はコールバックを呼ばない
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    onThemeChange?.(theme);
  }, [theme, onThemeChange]);

  // テーマ切り替えハンドラ
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };

  const iconSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        inline-flex items-center justify-center
        rounded-lg transition-all duration-300 ease-in-out
        bg-gray-100 dark:bg-slate-700
        hover:bg-gray-200 dark:hover:bg-slate-600
        text-gray-700 dark:text-gray-200
        focus:outline-none focus:ring-2 focus:ring-primary-500
        ${sizeClasses[size]}
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Current: ${theme} mode. Click to switch.`}
    >
      {theme === 'light' ? (
        // 月アイコン（ダークモード切り替え）
        <svg
          className={`w-5 h-5 ${iconSize[size]} transition-transform duration-300 hover:rotate-12`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // 太陽アイコン（ライトモード切り替え）
        <svg
          className={`w-5 h-5 ${iconSize[size]} transition-transform duration-300 hover:rotate-90`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  );
}

/**
 * デフォルトエクスポート。
 */
export default ThemeToggle;
