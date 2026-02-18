/**
 * メッセージタイプフィルターコンポーネント。
 *
 * メッセージタイプによる絞り込みを担当します。
 *
 * @module components/chat/MessageTypeFilter
 */

'use client';

import { memo, useCallback } from 'react';
import { Filter, X } from 'lucide-react';
import type { MessageType } from '@/types/message';
import { clsx } from 'clsx';

/**
 * メッセージタイプのオプション定義。
 */
export interface MessageTypeOption {
  value: MessageType;
  label: string;
  icon: string;
}

/**
 * デフォルトのメッセージタイプオプション。
 */
export const DEFAULT_TYPE_OPTIONS: MessageTypeOption[] = [
  { value: 'message', label: 'メッセージ', icon: '💬' },
  { value: 'idle_notification', label: 'アイドル通知', icon: '💤' },
  { value: 'shutdown_request', label: 'シャットダウン要求', icon: '🛑' },
  { value: 'shutdown_response', label: 'シャットダウン応答', icon: '✅' },
  { value: 'shutdown_approved', label: 'シャットダウン承認', icon: '✅' },
  { value: 'plan_approval_request', label: 'プラン承認要求', icon: '📋' },
  { value: 'plan_approval_response', label: 'プラン承認応答', icon: '✅' },
  { value: 'task_assignment', label: 'タスク割り当て', icon: '📝' },
  { value: 'unknown', label: '不明', icon: '❓' },
];

/**
 * メッセージタイプフィルターのプロパティ。
 */
export interface MessageTypeFilterProps {
  /** 選択中のタイプ */
  selectedTypes: MessageType[];
  /** タイプ選択変更ハンドラー */
  onChange: (types: MessageType[]) => void;
  /** 利用可能なタイプオプション */
  options?: MessageTypeOption[];
}

/**
 * タイプチップコンポーネント。
 */
interface TypeChipProps {
  option: MessageTypeOption;
  isSelected: boolean;
  onToggle: () => void;
}

const TypeChip = memo<TypeChipProps>(({ option, isSelected, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={clsx(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
      isSelected
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
      'border'
    )}
  >
    <span>{option.icon}</span>
    <span>{option.label}</span>
  </button>
));

TypeChip.displayName = 'TypeChip';

/**
 * メッセージタイプフィルターコンポーネント。
 *
 * @example
 * ```tsx
 * <MessageTypeFilter
 *   selectedTypes={['message', 'task_assignment']}
 *   onChange={setSelectedTypes}
 * />
 * ```
 */
export const MessageTypeFilter = memo<MessageTypeFilterProps>(
  ({ selectedTypes, onChange, options = DEFAULT_TYPE_OPTIONS }) => {
    /**
     * タイプのトグルハンドラー。
     */
    const handleToggle = useCallback(
      (type: MessageType) => {
        if (selectedTypes.includes(type)) {
          onChange(selectedTypes.filter((t) => t !== type));
        } else {
          onChange([...selectedTypes, type]);
        }
      },
      [selectedTypes, onChange]
    );

    /**
     * 全クリアハンドラー。
     */
    const handleClear = useCallback(() => {
      onChange([]);
    }, [onChange]);

    const hasSelection = selectedTypes.length > 0;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              メッセージタイプ
            </span>
            {hasSelection && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({selectedTypes.length}選択中)
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
          {options.map((option) => (
            <TypeChip
              key={option.value}
              option={option}
              isSelected={selectedTypes.includes(option.value)}
              onToggle={() => handleToggle(option.value)}
            />
          ))}
        </div>
      </div>
    );
  }
);

MessageTypeFilter.displayName = 'MessageTypeFilter';

export default MessageTypeFilter;
