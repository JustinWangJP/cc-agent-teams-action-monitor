/**
 * 日付セパレーターコンポーネント。
 *
 * メッセージタイムラインで日付が変わったことを示すセパレーターを表示します。
 *
 * @module components/chat/DateSeparator
 */

'use client';

import { memo } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日付セパレーターのプロパティ。
 */
export interface DateSeparatorProps {
  /** 日付 */
  date: Date;
}

/**
 * 日付セパレーターコンポーネント。
 *
 * @example
 * ```tsx
 * <DateSeparator date={new Date()} />
 * ```
 */
export const DateSeparator = memo<DateSeparatorProps>(({ date }) => {
  // 日本語形式で日付をフォーマット: "2026年2月19日 (水)"
  const formattedDate = format(date, 'yyyy年M月d日 (E)', { locale: ja });

  return (
    <div
      className={clsx(
        'flex items-center justify-center my-4',
        'sticky top-0 z-10'
      )}
      role="separator"
      aria-label={`${formattedDate}のメッセージ`}
    >
      <div
        className={clsx(
          'inline-flex items-center gap-2 px-4 py-1.5',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-600 dark:text-slate-400',
          'text-sm font-medium',
          'rounded-full border border-slate-200 dark:border-slate-700',
          'shadow-sm'
        )}
      >
        <span className="text-base" aria-hidden="true">
          📅
        </span>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
});

DateSeparator.displayName = 'DateSeparator';

/**
 * 指定した日付文字列から日付のみを取得する。
 * 同じ日かどうかを判定するために使用。
 *
 * @param timestamp - ISO 8601 形式のタイムスタンプ
 * @returns 日付部分のみの文字列 (YYYY-MM-DD)
 */
export function getDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  return format(date, 'yyyy-MM-dd');
}

/**
 * 2つの日付が同じ日かどうかを判定する。
 *
 * @param timestamp1 - 比較する日付1
 * @param timestamp2 - 比較する日付2
 * @returns 同じ日の場合は true
 */
export function isSameDate(timestamp1: string, timestamp2: string): boolean {
  return getDateKey(timestamp1) === getDateKey(timestamp2);
}

export default DateSeparator;
