/**
 * タイムラインフィルターコンポーネント。
 *
 * メッセージのフィルタリング機能（送信者、タイプ、未読のみ）を提供します。
 *
 * @module components/timeline/TimelineFilters
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import type { MessageFilter, MessageType } from '@/types/message';
import { MESSAGE_TYPES } from '@/types/timeline';
import { useDashboardStore } from '@/stores/dashboardStore';
import { clsx } from 'clsx';

/**
 * タイムラインフィルターのプロパティ。
 */
interface TimelineFiltersProps {
  /** 利用可能な送信者リスト */
  availableSenders: string[];
  /** 利用可能なタイプリスト */
  availableTypes?: MessageType[];
  /** フィルター変更時のコールバック */
  onFilterChange?: (filter: MessageFilter) => void;
}

/**
 * セレクトボックスアイテム。
 */
interface SelectItem {
  value: string;
  label: string;
  icon?: string;
}

/**
 * カスタムセレクトボックスコンポーネント。
 */
interface CustomSelectProps {
  label: string;
  items: SelectItem[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  items,
  selectedValues,
  onChange,
  placeholder = 'すべて',
  maxDisplay = 2,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedItems = items.filter((item) => selectedValues.includes(item.value));
  const displayText =
    selectedItems.length === 0
      ? placeholder
      : selectedItems.length <= maxDisplay
        ? selectedItems.map((i) => i.label).join(', ')
        : `${selectedItems[0].label} 他 ${selectedItems.length - 1}件`;

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange(newValues);
  };

  const handleClear = () => {
    onChange([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border transition-colors',
          'min-w-[160px] max-w-[240px]',
          'bg-white dark:bg-slate-900',
          'border-slate-300 dark:border-slate-700',
          'hover:border-slate-400 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{displayText}</span>
        </div>
        <div className="flex items-center gap-1">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-slate-400 transition-transform',
              isOpen && 'transform rotate-180',
            )}
          />
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-64 overflow-auto">
            <div className="p-1">
              {items.map((item) => {
                const isSelected = selectedValues.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleToggle(item.value)}
                    className={clsx(
                      'flex items-center gap-2 w-full px-3 py-2 text-sm rounded transition-colors',
                      'text-left',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                    )}
                  >
                    <div
                      className={clsx(
                        'w-4 h-4 border rounded flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-300 dark:border-slate-600',
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {item.icon && <span>{item.icon}</span>}
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * タイムラインフィルターコンポーネント。
 *
 * 送信者、メッセージタイプ、未読のみでフィルタリングできます。
 *
 * @example
 * ```tsx
 * <TimelineFilters
 *   availableSenders={['team-lead', 'architect', 'frontend-lead']}
 *   availableTypes={['message', 'idle_notification', 'shutdown_request']}
 * />
 * ```
 */
export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  availableSenders,
  availableTypes = MESSAGE_TYPES.map((t) => t.value as MessageType),
  onFilterChange,
}) => {
  // 個別セレクターを使用して無限ループを防止
  const messageFilter = useDashboardStore((state) => state.messageFilter);
  const updateMessageFilter = useDashboardStore((state) => state.updateMessageFilter);

  const handleSendersChange = useCallback(
    (values: string[]) => {
      const newFilter = { ...messageFilter, senders: values };
      updateMessageFilter(newFilter);
      onFilterChange?.(newFilter);
    },
    [messageFilter, updateMessageFilter, onFilterChange],
  );

  const handleTypesChange = useCallback(
    (values: string[]) => {
      const newFilter = { ...messageFilter, types: values as MessageType[] };
      updateMessageFilter(newFilter);
      onFilterChange?.(newFilter);
    },
    [messageFilter, updateMessageFilter, onFilterChange],
  );

  const handleReset = useCallback(() => {
    const newFilter: MessageFilter = {
      senders: [],
      receivers: [],
      types: [],
    };
    updateMessageFilter(newFilter);
    onFilterChange?.(newFilter);
  }, [updateMessageFilter, onFilterChange]);

  const hasActiveFilters = useMemo(
    () =>
      messageFilter.senders.length > 0 ||
      messageFilter.types.length > 0,
    [messageFilter],
  );

  // 送信者アイテム
  const senderItems: SelectItem[] = useMemo(
    () =>
      availableSenders.map((sender) => ({
        value: sender,
        label: sender,
      })),
    [availableSenders],
  );

  // タイプアイテム
  const typeItems: SelectItem[] = useMemo(
    () =>
      availableTypes
        .filter((t) => MESSAGE_TYPES.some((mt) => mt.value === t))
        .map((type) => {
          const mt = MESSAGE_TYPES.find((m) => m.value === type);
          return {
            value: type,
            label: mt?.label || type,
            icon: mt?.icon,
          };
        }),
    [availableTypes],
  );

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
      {/* 送信者フィルター */}
      <CustomSelect
        label="送信者"
        items={senderItems}
        selectedValues={messageFilter.senders}
        onChange={handleSendersChange}
        placeholder="すべての送信者"
      />

      {/* タイプフィルター */}
      <CustomSelect
        label="タイプ"
        items={typeItems}
        selectedValues={messageFilter.types}
        onChange={handleTypesChange}
        placeholder="すべてのタイプ"
      />

      {/* リセットボタン */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
          リセット
        </button>
      )}

      {/* アクティブフィルター数 */}
      {hasActiveFilters && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {[
            messageFilter.senders.length > 0 && `${messageFilter.senders.length}送信者`,
            messageFilter.types.length > 0 && `${messageFilter.types.length}タイプ`,
          ]
            .filter(Boolean)
            .join(', ')}
          でフィルタ中
        </span>
      )}
    </div>
  );
};

export default TimelineFilters;
