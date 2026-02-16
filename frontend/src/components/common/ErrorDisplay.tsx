/**
 * エラー状態表示コンポーネント。
 *
 * エラーメッセージと再接続/リトライボタンを表示します。
 *
 * @module components/common/ErrorDisplay
 */

import type { ReactNode } from 'react';

/**
 * ErrorDisplay コンポーネントのプロパティ。
 */
export interface ErrorDisplayProps {
  /** エラーメッセージ */
  message?: string;
  /** 再試行ハンドラ */
  onRetry?: () => void;
  /** 再試行ボタンのテキスト（省略時は「再接続」） */
  retryText?: string;
  /** 追加のCSSクラス */
  className?: string;
  /** 追加のアクションボタン（オプション） */
  extraActions?: ReactNode;
  /** エラーの種類 */
  errorType?: 'network' | 'server' | 'data' | 'general';
}

/**
 * エラー種類に応じたアイコンとデフォルトメッセージを取得します。 */
function getErrorConfig(errorType: ErrorDisplayProps['errorType']) {
  switch (errorType) {
    case 'network':
      return {
        icon: (
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        defaultTitle: '接続エラー',
        defaultMessage: 'サーバーに接続できません。インターネット接続を確認してください。',
      };
    case 'server':
      return {
        icon: (
          <svg className="w-16 h-16 text-orange-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        defaultTitle: 'サーバーエラー',
        defaultMessage: 'サーバーで問題が発生しています。しばらく待ってから再試行してください。',
      };
    case 'data':
      return {
        icon: (
          <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        defaultTitle: 'データエラー',
        defaultMessage: 'データの読み込みに失敗しました。',
      };
    default:
      return {
        icon: (
          <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        defaultTitle: 'エラー',
        defaultMessage: '問題が発生しました。',
      };
  }
}

/**
 * エラー状態表示コンポーネント。
 *
 * エラーメッセージと再試行ボタンを表示し、ユーザーが回復アクションを実行できるようにします。
 *
 * @param props - コンポーネントプロパティ
 * @returns エラー表示要素
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   message="Failed to load data"
 *   errorType="network"
 *   onRetry={() => refetch()}
 * />
 *
 * <ErrorDisplay
 *   message="Custom error"
 *   retryText="再読み込み"
 *   onRetry={handleRetry}
 *   extraActions={<button>キャンセル</button>}
 * />
 * ```
 */
export function ErrorDisplay({
  message,
  onRetry,
  retryText = '再接続',
  className = '',
  extraActions,
  errorType = 'general',
}: ErrorDisplayProps) {
  const config = getErrorConfig(errorType);
  const displayMessage = message || config.defaultMessage;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {/* アイコン */}
      <div className="animate-bounce">{config.icon}</div>

      {/* タイトルとメッセージ */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {config.defaultTitle}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {displayMessage}
      </p>

      {/* アクションボタン */}
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {retryText}
          </button>
        )}
        {extraActions}
      </div>
    </div>
  );
}

/**
 * インラインエラーメッセージコンポーネント。
 *
 * コンパクトなエラー表示を提供します。
 *
 * @param props.message - エラーメッセージ
 * @param props.onRetry - 再試行ハンドラ（オプション）
 * @param props.className - 追加のCSSクラス
 * @returns インラインエラー要素
 *
 * @example
 * ```tsx
 * <InlineError message="Failed to save" onRetry={handleSave} />
 * ```
 */
export function InlineError({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}
    >
      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-red-700 dark:text-red-300 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline"
        >
          リトライ
        </button>
      )}
    </div>
  );
}

/**
 * デフォルトエクスポート。
 */
export default ErrorDisplay;
