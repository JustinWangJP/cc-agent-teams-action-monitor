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
  label: string;
}

/**
 * デフォルトのポーリング間隔選択肢。
 */
export const INTERVAL_OPTIONS: PollingIntervalOption[] = [
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 20000, label: '20秒' },
  { value: 30000, label: '30秒' },
  { value: 60000, label: '60秒' },
  { value: 120000, label: '2分' },
  { value: 300000, label: '5分' },
];
