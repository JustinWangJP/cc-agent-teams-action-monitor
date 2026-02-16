/**
 * データ読み込み中に表示するローディングスピナーコンポーネント。
 *
 * 中央揃えで回転する円形スピナーを表示します。データ取得中の待機状態を
 * ユーザーに視覚的に伝えるために使用します。
 *
 * @module components/common/LoadingSpinner
 */

/**
 * LoadingSpinner コンポーネントのプロパティ。
 */
export interface LoadingSpinnerProps {
  /** カスタムメッセージ（省略時はデフォルトメッセージ） */
  message?: string;
  /** サイズ（省略時は 'md'） */
  size?: 'sm' | 'md' | 'lg';
  /** 追加のCSSクラス */
  className?: string;
  /** スピナーのみ表示するかどうか */
  spinnerOnly?: boolean;
}

/**
 * ローディングスピナーコンポーネント。
 *
 * データ読み込み中にスピナーとメッセージを表示します。
 *
 * @param props - コンポーネントプロパティ
 * @returns ローディングスピナー要素
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * // 出力: デフォルトサイズのスピナーと「Loading...」メッセージ
 *
 * <LoadingSpinner message="データを読み込んでいます..." size="lg" />
 * // 出力: 大きなスピナーとカスタムメッセージ
 *
 * <LoadingSpinner spinnerOnly />
 * // 出力: スピナーのみ
 * ```
 */
export function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  className = '',
  spinnerOnly = false,
}: LoadingSpinnerProps) {
  // サイズに応じたクラス
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-3',
    lg: 'h-16 w-16 border-4',
  };

  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="relative">
        {/* 外側のリング */}
        <div
          className={`animate-spin rounded-full border-gray-200 dark:border-slate-700 border-t-primary-500 ${sizeClasses[size]}`}
        />
        {/* 内側の Pulse アニメーション */}
        <div className="absolute inset-0 rounded-full bg-primary-500 opacity-20 animate-ping" />
      </div>
      {!spinnerOnly && (
        <p className={`mt-4 text-gray-600 dark:text-gray-400 font-medium ${textSize[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * スケルトンローダーコンポーネント。
 *
 * コンテンツの読み込み中にスケルトン表示を提供します。
 *
 * @param props.count - スケルトンアイテム数（省略時は 3）
 * @param props.className - 追加のCSSクラス
 * @returns スケルトンローダー要素
 *
 * @example
 * ```tsx
 * <SkeletonLoader count={5} />
 * // 出力: 5つのスケルトンアイテム
 * ```
 */
export function SkeletonLoader({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 dark:bg-slate-700 rounded-lg h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * 全画面ローディングオーバーレイコンポーネント。
 *
 * 画面全体を覆うローディング表示を提供します。
 *
 * @param props.message - カスタムメッセージ
 * @param props.show - 表示するかどうか
 * @returns オーバーレイ要素
 *
 * @example
 * ```tsx
 * <LoadingOverlay message="処理中..." show={isLoading} />
 * ```
 */
export function LoadingOverlay({ message = 'Loading...', show = true }: { message?: string; show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}

/**
 * デフォルトエクスポート。
 */
export default LoadingSpinner;
