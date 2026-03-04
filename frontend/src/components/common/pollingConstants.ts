/**
 * ポーリング間隔関連の定数。
 *
 * @module components/common/pollingConstants
 */

/**
 * ポーリング間隔選択肢。
 */
export interface PollingIntervalOption {
  value: number;
  /** 翻訳キー（例: 'intervals.seconds'） */
  labelKey: string;
  /** 翻訳パラメータ（例: { count: 5 }） */
  labelParams?: Record<string, number>;
}

/**
 * デフォルトのポーリング間隔選択肢。
 */
export const INTERVAL_OPTIONS: PollingIntervalOption[] = [
  { value: 5000, labelKey: 'intervals.seconds', labelParams: { count: 5 } },
  { value: 10000, labelKey: 'intervals.seconds', labelParams: { count: 10 } },
  { value: 20000, labelKey: 'intervals.seconds', labelParams: { count: 20 } },
  { value: 30000, labelKey: 'intervals.seconds', labelParams: { count: 30 } },
  { value: 60000, labelKey: 'intervals.seconds', labelParams: { count: 60 } },
  { value: 120000, labelKey: 'intervals.minutes', labelParams: { count: 2 } },
  { value: 300000, labelKey: 'intervals.minutes', labelParams: { count: 5 } },
];
