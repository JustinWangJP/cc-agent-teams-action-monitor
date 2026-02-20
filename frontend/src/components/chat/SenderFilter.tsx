/**
 * 送信者フィルターコンポーネント。
 *
 * メッセージ送信者（エージェント）による絞り込みを担当します。
 *
 * @module components/chat/SenderFilter
 */

'use client';

import { memo, useCallback } from 'react';
import { X, User } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * 送信者オプション定義。
 */
export interface SenderOption {
  /** 送信者名（エージェント名） */
  value: string;
  /** 表示ラベル */
  label: string;
  /** メッセージ数 */
  count?: number;
}

/**
 * 送信者フィルターのプロパティ。
 */
export interface SenderFilterProps {
  /** 選択中の送信者 */
  selectedSenders: string[];
  /** 送信者選択変更ハンドラー */
  onChange: (senders: string[]) => void;
  /** 利用可能な送信者オプション */
  options: SenderOption[];
}

/**
 * 送信者チップコンポーネント。
 */
interface SenderChipProps {
  option: SenderOption;
  isSelected: boolean;
  onToggle: () => void;
}

const SenderChip = memo<SenderChipProps>(({ option, isSelected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={clsx(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
      isSelected
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
      'border'
    )}
    aria-pressed={isSelected}
  >
    <User className="w-3.5 h-3.5" />
    <span>{option.label}</span>
    {option.count !== undefined && (
      <span className="text-xs opacity-70">({option.count})</span>
    )}
  </button>
));

SenderChip.displayName = 'SenderChip';

/**
 * 送信者フィルターコンポーネント。
 *
 * @example
 * ```tsx
 * <SenderFilter
 *   selectedSenders={['frontend-dev-a', 'backend-dev']}
 *   onChange={setSelectedSenders}
 *   options={[
 *     { value: 'frontend-dev-a', label: 'Frontend Dev A', count: 15 },
 *     { value: 'backend-dev', label: 'Backend Dev', count: 8 },
 *   ]}
 * />
 * ```
 */
export const SenderFilter = memo<SenderFilterProps>(
  ({ selectedSenders, onChange, options }) => {
    /**
     * 送信者のトグルハンドラー。
     */
    const handleToggle = useCallback(
      (sender: string) => {
        if (selectedSenders.includes(sender)) {
          onChange(selectedSenders.filter((s) => s !== sender));
        } else {
          onChange([...selectedSenders, sender]);
        }
      },
      [selectedSenders, onChange]
    );

    /**
     * 全クリアハンドラー。
     */
    const handleClear = useCallback(() => {
      onChange([]);
    }, [onChange]);

    const hasSelection = selectedSenders.length > 0;

    // オプションをメッセージ数の降順でソート
    const sortedOptions = [...options].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              送信者
            </span>
            {hasSelection && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({selectedSenders.length}選択中)
              </span>
            )}
          </div>
          {hasSelection && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              クリア
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedOptions.length > 0 ? (
            sortedOptions.map((option) => (
              <SenderChip
                key={option.value}
                option={option}
                isSelected={selectedSenders.includes(option.value)}
                onToggle={() => handleToggle(option.value)}
              />
            ))
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">
              送信者情報がありません
            </span>
          )}
        </div>
      </div>
    );
  }
);

SenderFilter.displayName = 'SenderFilter';

export default SenderFilter;
