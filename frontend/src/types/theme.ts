/**
 * テーマ関連の型定義。
 *
 * ライトモード・ダークモードのテーマ設定を型安全に管理します。
 *
 * @module types/theme
 */

/**
 * 利用可能なテーマ種別。
 */
export type ThemeMode = 'light' | 'dark';

/**
 * システムテーマ設定。
 */
export type SystemThemePreference = 'light' | 'dark' | 'system';

/**
 * テーマ設定を表すインターフェース。
 */
export interface ThemeConfig {
  /** 現在のテーマモード */
  mode: ThemeMode;
  /** システム設定に従うかどうか */
  followSystem: boolean;
}

/**
 * テーマ色定義（ライトモード）。
 */
export const lightTheme = {
  name: 'light' as const,
  colors: {
    background: '#FFFFFF',
    backgroundCard: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    accent: '#3B82F6',
    accentHover: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
};

/**
 * テーマ色定義（ダークモード）。
 */
export const darkTheme = {
  name: 'dark' as const,
  colors: {
    background: '#0F172A',
    backgroundCard: '#1E293B',
    backgroundSecondary: '#334155',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
    accent: '#60A5FA',
    accentHover: '#3B82F6',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
};

/**
 * テーマ設定マップ。
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

/**
 * テーマモードを取得するユーティリティ関数。
 *
 * @param mode - テーマモード
 * @returns テーマ設定
 */
export function getThemeConfig(mode: ThemeMode) {
  return themes[mode];
}
