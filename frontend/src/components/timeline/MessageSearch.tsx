/**
 * メッセージ検索コンポーネント。
 *
 * メッセージ本文、送信者、サマリーに対するキーワード検索を提供します。
 *
 * @module components/timeline/MessageSearch
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { clsx } from 'clsx';

/**
 * 検索オプション。
 */
interface SearchOptions {
  /** 大文字小文字を区別するか */
  caseSensitive: boolean;
  /** 正規表現を使用するか */
  useRegex: boolean;
}

/**
 * メッセージ検索のプロパティ。
 */
interface MessageSearchProps {
  /** 検索結果数 */
  resultCount?: number;
  /** 検索実行時のコールバック */
  onSearch?: (query: string) => void;
  /** クリア時のコールバック */
  onClear?: () => void;
}

/**
 * メッセージ検索コンポーネント。
 *
 * キーワード入力でメッセージをリアルタイム検索します。
 * 検索オプション（大文字小文字区別、正規表現）も設定可能です。
 *
 * @example
 * ```tsx
 * <MessageSearch
 *   resultCount={filteredMessages.length}
 *   onSearch={(query) => setSearchQuery(query)}
 * />
 * ```
 */
export const MessageSearch: React.FC<MessageSearchProps> = ({
  resultCount = 0,
  onSearch,
  onClear,
}) => {
  // 個別セレクターを使用して無限ループを防止
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery);
  const [inputValue, setInputValue] = useState(searchQuery);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    useRegex: false,
  });
  // useRefを使用してタイマーを管理（再レンダリングを防ぐ）
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 検索クエリ変更ハンドラー（デバウンス付き）。
   */
  const handleQueryChange = useCallback(
    (value: string) => {
      setInputValue(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setSearchQuery(value);
        onSearch?.(value);
      }, 300);
    },
    [setSearchQuery, onSearch],
  );

  /**
   * クリアハンドラー。
   */
  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchQuery('');
    onClear?.();
  }, [setSearchQuery, onClear]);

  /**
   * Enter キーで即時検索。
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        setSearchQuery(inputValue);
        onSearch?.(inputValue);
      }
    },
    [inputValue, setSearchQuery, onSearch],
  );

  // ストアの検索クエリと入力値を同期
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  // コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const hasQuery = inputValue.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* 検索入力エリア */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを検索..."
          className={clsx(
            'w-full pl-10 pr-10 py-2 text-sm rounded-lg border transition-colors',
            'bg-white dark:bg-slate-900',
            'border-slate-300 dark:border-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'text-slate-900 dark:text-slate-100',
          )}
          aria-label="メッセージ検索"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="検索をクリア"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 検索オプションと結果 */}
      <div className="flex items-center justify-between">
        {/* オプショントグル */}
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <span>オプション</span>
          {showOptions ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {/* 検索結果数 */}
        {hasQuery && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {resultCount} 件の結果
          </span>
        )}
      </div>

      {/* オプションパネル */}
      {showOptions && (
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions({ ...options, caseSensitive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
              />
              <span>大文字・小文字を区別</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.useRegex}
                onChange={(e) => setOptions({ ...options, useRegex: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
              />
              <span>正規表現を使用</span>
            </label>
          </div>
          {/* TODO: オプションの実装をバックエンド/フィルターロジックに統合 */}
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            ※ 検索オプションは今後のバージョンで実装予定です
          </p>
        </div>
      )}

      {/* 検索ヒント */}
      {hasQuery && resultCount === 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            該当するメッセージが見つかりませんでした。
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            検索キーワードを変更するか、フィルター条件を調整してください。
          </p>
        </div>
      )}
    </div>
  );
};

export default MessageSearch;
