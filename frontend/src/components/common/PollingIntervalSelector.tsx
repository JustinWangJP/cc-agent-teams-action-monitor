import { cn } from '@/lib/utils';

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
];

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
}

/**
 * ポーリング間隔を選択するセレクターコンポーネント。
 *
 * @example
 * ```tsx
 * <PollingIntervalSelector
 *   value={teamsInterval}
 *   onChange={setTeamsInterval}
 *   label="更新間隔"
 * />
 * ```
 */
export function PollingIntervalSelector({
  value,
  onChange,
  label = '更新間隔',
  className,
  disabled = false,
}: PollingIntervalSelectorProps) {
  const selectedOption = INTERVAL_OPTIONS.find((opt) => opt.value === value);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}:
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={cn(
          'px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
        )}
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedOption && (
        <span className="text-xs text-gray-500 dark:text-gray-500">
          ポーリング中
        </span>
      )}
    </div>
  );
}

export default PollingIntervalSelector;
