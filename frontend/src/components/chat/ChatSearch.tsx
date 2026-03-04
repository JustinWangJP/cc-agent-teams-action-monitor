/**
 * チャット検索コンポーネント。
 *
 * メッセージの検索とハイライト表示を担当します。
 *
 * @module components/chat/ChatSearch
 */

'use client';

import { memo, useCallback, useState } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * チャット検索のプロパティ。
 */
export interface ChatSearchProps {
  /** 検索クエリ */
  value: string;
  /** 検索クエリ変更ハンドラー */
  onChange: (value: string) => void;
  /** 検索結果件数 */
  resultCount?: number;
  /** 前の結果へハンドラー */
  onPrevResult?: () => void;
  /** 次の結果へハンドラー */
  onNextResult?: () => void;
  /** 現在の結果インデックス */
  currentIndex?: number;
  /** プレースホルダーテキスト */
  placeholder?: string;
}

/**
 * チャット検索コンポーネント。
 *
 * メッセージのリアルタイム検索とハイライト表示を担当します。
 * 検索結果間のナビゲーション、キーボードショートカット（F3/Ctrl+G/Escape）をサポートします。
 *
 * @param props.value - 現在の検索クエリ
 * @param props.onChange - 検索クエリ変更時のコールバック
 * @param props.resultCount - 検索結果の総件数
 * @param props.currentIndex - 現在フォーカス中の結果インデックス
 * @param props.onPrevResult - 前の結果へ移動するコールバック
 * @param props.onNextResult - 次の結果へ移動するコールバック
 * @param props.placeholder - 入力フィールドのプレースホルダー
 * @returns 検索UIコンポーネント
 *
 * @example
 * ```tsx
 * <ChatSearch
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   resultCount={5}
 *   currentIndex={0}
 *   onPrevResult={handlePrev}
 *   onNextResult={handleNext}
 * />
 * ```
 *
 *
 */
export const ChatSearch = memo<ChatSearchProps>(
  ({
    value,
    onChange,
    resultCount = 0,
    onPrevResult,
    onNextResult,
    currentIndex = -1,
    placeholder = 'メッセージを検索...',
  }) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleClear = useCallback(() => {
      onChange('');
    }, [onChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
          handleClear();
        } else if (e.key === 'F3' || (e.ctrlKey && e.key === 'g')) {
          e.preventDefault();
          if (e.shiftKey) {
            onPrevResult?.();
          } else {
            onNextResult?.();
          }
        }
      },
      [handleClear, onPrevResult, onNextResult]
    );

    return (
      <div
        className={clsx(
          'relative flex items-center gap-2',
          'transition-all duration-200',
          isFocused && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
        )}
      >
        {/* 検索入力 */}
        <div className="relative flex-1">
          <Search
            className={clsx(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              'transition-colors',
              isFocused ? 'text-blue-500' : 'text-slate-400'
            )}
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={clsx(
              'w-full pl-10 pr-10 py-2',
              'text-sm text-slate-900 dark:text-slate-100',
              'bg-white dark:bg-slate-800',
              'border border-slate-300 dark:border-slate-700',
              'rounded-lg',
              'placeholder:text-slate-400 dark:placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'transition-colors'
            )}
            aria-label="メッセージを検索"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xs p-1"
              aria-label="検索をクリア"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 検索結果ナビゲーション */}
        {value && resultCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
              {currentIndex >= 0 ? currentIndex + 1 : 0} / {resultCount}
            </span>
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={onPrevResult}
                disabled={!onPrevResult || resultCount === 0}
                className={clsx(
                  'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                  (!onPrevResult || resultCount === 0) && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="前の結果"
              >
                <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button
                type="button"
                onClick={onNextResult}
                disabled={!onNextResult || resultCount === 0}
                className={clsx(
                  'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                  (!onNextResult || resultCount === 0) && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="次の結果"
              >
                <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {/* 検索結果なし */}
        {value && resultCount === 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            該当なし
          </span>
        )}
      </div>
    );
  }
);

ChatSearch.displayName = 'ChatSearch';

export default ChatSearch;
