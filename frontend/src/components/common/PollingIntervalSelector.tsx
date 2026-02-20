/**
 * ポーリング間隔セレクターコンポーネント。
 *
 * 更新間隔の選択と、次回更新までのカウントダウン表示を行います。
 * Page Visibility API と連携して、タブ非アクティブ時は表示を更新します。
 *
 * @module components/common/PollingIntervalSelector
 */

'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { INTERVAL_OPTIONS } from './pollingConstants';

/**
 * PollingIntervalSelector コンポーネントのプロパティ。
 */
export interface PollingIntervalSelectorProps {
  /** 現在の間隔（ミリ秒） */
  value: number;
  /** 間隔変更時のコールバック */
  onChange: (ms: number) => void;
  /** ラベル */
  label?: string;
  /** 追加のクラス名 */
  className?: string;
  /** 無効状態 */
  disabled?: boolean;
  /** 最後の更新タイムスタンプ（カウントダウン計算用） */
  lastUpdateTimestamp?: number;
  /** カウントダウンを表示するかどうか */
  showCountdown?: boolean;
}

/**
 * ミリ秒を「X秒」「X分」形式の文字列に変換。
 *
 * @param ms - ミリ秒
 * @returns フォーマットされた文字列
 */
function formatCountdown(ms: number): string {
  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds}秒後`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}分後`;
  }

  return `${minutes}分${remainingSeconds}秒後`;
}

/**
 * ポーリング間隔を選択するセレクターコンポーネント。
 *
 * 次回更新までのカウントダウンを表示し、Page Visibility API と連携して
 * タブ非アクティブ時のパフォーマンスを最適化します。
 *
 * @example
 * ```tsx
 * <PollingIntervalSelector
 *   value={teamsInterval}
 *   onChange={setTeamsInterval}
 *   label="更新間隔"
 *   showCountdown={true}
 * />
 * ```
 */
export const PollingIntervalSelector = memo<PollingIntervalSelectorProps>(
  ({
    value,
    onChange,
    label = '更新間隔',
    className,
    disabled = false,
    lastUpdateTimestamp = Date.now(),
    showCountdown = true,
  }) => {
    // 次回更新までの残り時間（ミリ秒）
    const [timeUntilNextUpdate, setTimeUntilNextUpdate] = useState(0);

    // インターバル変更時のリセット用リファレンス
    const intervalRef = useRef(value);
    const lastUpdateRef = useRef(lastUpdateTimestamp);

    /**
     * 次回更新までの時間を計算。
     */
    const calculateTimeUntilNext = useCallback(() => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      const remaining = intervalRef.current - elapsed;
      return Math.max(0, remaining);
    }, []);

    /**
     * カウントダウン更新タイマー。
     */
    useEffect(() => {
      if (!showCountdown) return;

      // 初期計算
      setTimeUntilNextUpdate(calculateTimeUntilNext());

      // 1秒ごとに更新
      const timer = setInterval(() => {
        setTimeUntilNextUpdate(calculateTimeUntilNext());
      }, 1000);

      return () => clearInterval(timer);
    }, [showCountdown, calculateTimeUntilNext]);

    /**
     * インターバルまたは最終更新時刻が変更された場合のリセット。
     */
    useEffect(() => {
      intervalRef.current = value;
      lastUpdateRef.current = lastUpdateTimestamp;
      setTimeUntilNextUpdate(calculateTimeUntilNext());
    }, [value, lastUpdateTimestamp]);

    /**
     * ページが非アクティブからアクティブに戻ったときに時刻を同期。
     */
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // アクティブに戻ったときにカウントダウンを再計算
          setTimeUntilNextUpdate(calculateTimeUntilNext());
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [calculateTimeUntilNext]);

    /**
     * 間隔変更ハンドラー。
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = Number(e.target.value);
        onChange(newValue);
      },
      [onChange]
    );

    // カウントダウン表示用のスタイル
    const countdownPercent = intervalRef.current > 0
      ? Math.max(0, Math.min(100, (timeUntilNextUpdate / intervalRef.current) * 100))
      : 0;

    return (
      <div className={clsx('flex items-center gap-2', className)}>
        {label && (
          <span className="text-sm text-slate-600 dark:text-slate-400 shrink-0">
            {label}:
          </span>
        )}

        {/* 間隔セレクター */}
        <div className="relative">
          <select
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className={clsx(
              'appearance-none',
              'pl-8 pr-8 py-1.5 text-sm font-medium',
              'bg-white dark:bg-slate-800',
              'border border-slate-300 dark:border-slate-600',
              'text-slate-700 dark:text-slate-300',
              'rounded-lg',
              'hover:bg-slate-50 dark:hover:bg-slate-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all',
              'cursor-pointer'
            )}
            aria-label={`${label}を選択`}
          >
            {INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* 左側のアイコン */}
          <Clock
            className={clsx(
              'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
              disabled ? 'text-slate-400' : 'text-slate-500'
            )}
            aria-hidden="true"
          />

          {/* 右側の矢印 */}
          <svg
            className={clsx(
              'absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none',
              'text-slate-500'
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* カウントダウン表示 */}
        {showCountdown && (
          <div className="flex items-center gap-2">
            {/* プログレスバー付きのカウントダウン */}
            <div
              className={clsx(
                'relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                'bg-slate-100 dark:bg-slate-800',
                'text-slate-600 dark:text-slate-400',
                'border border-slate-200 dark:border-slate-700',
                'transition-all overflow-hidden'
              )}
              title={`次回更新: ${formatCountdown(timeUntilNextUpdate)}`}
            >
              <RefreshCw
                className={clsx(
                  'w-3.5 h-3.5',
                  timeUntilNextUpdate > 0 ? 'animate-spin-slow' : 'text-green-600 dark:text-green-400'
                )}
                style={{
                  animationDuration: `${Math.max(2000, intervalRef.current)}ms`,
                }}
                aria-hidden="true"
              />
              <span className="tabular-nums">{formatCountdown(timeUntilNextUpdate)}</span>

              {/* プログレスバー（下部） */}
              <div
                className={clsx(
                  'absolute bottom-0 left-0 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-1000 ease-linear',
                  countdownPercent < 20 && 'bg-red-500 dark:bg-red-400'
                )}
                style={{
                  width: `${countdownPercent}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

PollingIntervalSelector.displayName = 'PollingIntervalSelector';

export default PollingIntervalSelector;
