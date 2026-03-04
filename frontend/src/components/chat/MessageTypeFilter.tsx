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
import type { ExtendedParsedType } from '@/types/message';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

/**
 * メッセージタイプのオプション定義。
 */
export interface MessageTypeOption {
  value: ExtendedParsedType;
  /** 翻訳キー */
  labelKey: string;
  icon: string;
}

/**
 * デフォルトのメッセージタイプオプション。
 */
export const DEFAULT_TYPE_OPTIONS: MessageTypeOption[] = [
  // inbox 由来
  { value: 'message', labelKey: 'event_types.message', icon: '💬' },
  { value: 'idle_notification', labelKey: 'event_types.idle_notification', icon: '💤' },
  { value: 'shutdown_request', labelKey: 'event_types.shutdown_request', icon: '🛑' },
  { value: 'shutdown_response', labelKey: 'event_types.shutdown_response', icon: '✅' },
  { value: 'plan_approval_request', labelKey: 'event_types.plan_approval_request', icon: '📋' },
  { value: 'plan_approval_response', labelKey: 'event_types.plan_approval_response', icon: '✅' },
  { value: 'task_assignment', labelKey: 'event_types.task_assignment', icon: '📝' },
  { value: 'task_completed', labelKey: 'event_types.task_completed', icon: '✅' },
  // session 由来
  { value: 'user_message', labelKey: 'event_types.user_message', icon: '👤' },
  { value: 'assistant_message', labelKey: 'event_types.assistant_message', icon: '🤖' },
  { value: 'thinking', labelKey: 'event_types.thinking', icon: '💭' },
];

/**
 * メッセージタイプフィルターのプロパティ。
 */
export interface MessageTypeFilterProps {
  /** 選択中のタイプ */
  selectedTypes: ExtendedParsedType[];
  /** タイプ選択変更ハンドラー */
  onChange: (types: ExtendedParsedType[]) => void;
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
  t: (key: string) => string;
}

const TypeChip = memo<TypeChipProps>(({ option, isSelected, onToggle, t }) => (
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
    <span>{t(option.labelKey)}</span>
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
    const { t } = useTranslation('timeline');

    /**
     * タイプのトグルハンドラー。
     */
    const handleToggle = useCallback(
      (type: ExtendedParsedType) => {
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
              {t('type_filter.title')}
            </span>
            {hasSelection && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('type_filter.selected_count', { count: selectedTypes.length })}
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
              {t('type_filter.clear')}
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
              t={t}
            />
          ))}
        </div>
      </div>
    );
  }
);

MessageTypeFilter.displayName = 'MessageTypeFilter';

export default MessageTypeFilter;
