/**
 * チャットヘッダーコンポーネント。
 *
 * 検索、フィルター、更新間隔設定などを含むヘッダーを表示します。
 *
 * @module components/chat/ChatHeader
 */

'use client';

import { memo } from 'react';
import { Search, RefreshCw, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { PollingIntervalSelector } from '@/components/common/PollingIntervalSelector';
import { MessageTypeFilter, type MessageTypeFilterProps } from './MessageTypeFilter';
import type { MessageType } from '@/types/message';
import { clsx } from 'clsx';

/**
 * チャットヘッダーのプロパティ。
 */
export interface ChatHeaderProps {
  /** タイトル */
  title?: string;
  /** メッセージ数 */
  messageCount?: number;
  /** 検索クエリ */
  searchQuery?: string;
  /** 検索クエリ変更ハンドラー */
  onSearchChange?: (query: string) => void;
  /** 検索結果件数 */
  searchResultCount?: number;
  /** 検索結果インデックス */
  searchResultIndex?: number;
  /** 前の結果へハンドラー */
  onPrevResult?: () => void;
  /** 次の結果へハンドラー */
  onNextResult?: () => void;
  /** ポーリング間隔 */
  pollingInterval?: number;
  /** ポーリング間隔変更ハンドラー */
  onPollingIntervalChange?: (interval: number) => void;
  /** リフレッシュハンドラー */
  onRefresh?: () => void;
  /** ローディング状態 */
  isLoading?: boolean;
  /** メッセージタイプフィルター */
  messageTypeFilter?: MessageTypeFilterProps;
  /** フィルターを展開するかどうか */
  showFilter?: boolean;
  /** フィルター展開切り替え */
  onToggleFilter?: () => void;
}

/**
 * チャットヘッダーコンポーネント。
 *
 * @example
 * ```tsx
 * <ChatHeader
 *   title="💬 メッセージタイムライン"
 *   messageCount={30}
 *   searchQuery={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   pollingInterval={30000}
 *   onPollingIntervalChange={setInterval}
 *   onRefresh={handleRefresh}
 *   isLoading={isLoading}
 * />
 * ```
 */
export const ChatHeader = memo<ChatHeaderProps>(
  ({
    title = '💬 メッセージタイムライン',
    messageCount = 0,
    searchQuery = '',
    onSearchChange,
    searchResultCount = 0,
    searchResultIndex = -1,
    onPrevResult,
    onNextResult,
    pollingInterval = 30000,
    onPollingIntervalChange,
    onRefresh,
    isLoading = false,
    messageTypeFilter,
    showFilter = false,
    onToggleFilter,
  }) => {
    return (
      <div className="flex flex-col gap-3">
        {/* メインタイトルバー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {messageCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {messageCount}件のメッセージ
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* フィルタートグルボタン */}
            {messageTypeFilter && onToggleFilter && (
              <button
                type="button"
                onClick={onToggleFilter}
                className={clsx(
                  'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  'text-slate-700 dark:text-slate-300',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-300 dark:border-slate-700',
                  'hover:bg-slate-50 dark:hover:bg-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  showFilter && 'bg-slate-100 dark:bg-slate-700'
                )}
                aria-label="フィルターを切り替え"
                aria-pressed={showFilter}
              >
                <Filter className="w-4 h-4" />
                フィルター
                {messageTypeFilter.selectedTypes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {messageTypeFilter.selectedTypes.length}
                  </span>
                )}
              </button>
            )}

            {/* ポーリング間隔セレクター */}
            {onPollingIntervalChange && (
              <PollingIntervalSelector
                value={pollingInterval}
                onChange={onPollingIntervalChange}
                label="更新間隔"
              />
            )}

            {/* リフレッシュボタン */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className={clsx(
                  'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  'text-slate-700 dark:text-slate-300',
                  'bg-white dark:bg-slate-800',
                  'border border-slate-300 dark:border-slate-700',
                  'hover:bg-slate-50 dark:hover:bg-slate-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="更新"
              >
                <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
                更新
              </button>
            )}
          </div>
        </div>

        {/* 検索バー */}
        {onSearchChange && (
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="メッセージを検索..."
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
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                  aria-label="検索をクリア"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 検索結果ナビゲーション */}
            {searchQuery && searchResultCount > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
                  {searchResultIndex >= 0 ? searchResultIndex + 1 : 0} / {searchResultCount}
                </span>
                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={onPrevResult}
                    disabled={!onPrevResult || searchResultCount === 0}
                    className={clsx(
                      'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                      (!onPrevResult || searchResultCount === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label="前の結果"
                  >
                    <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={onNextResult}
                    disabled={!onNextResult || searchResultCount === 0}
                    className={clsx(
                      'p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                      (!onNextResult || searchResultCount === 0) && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label="次の結果"
                  >
                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {/* 検索結果なし */}
            {searchQuery && searchResultCount === 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                該当なし
              </span>
            )}
          </div>
        )}

        {/* メッセージタイプフィルター（展開時のみ表示） */}
        {showFilter && messageTypeFilter && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <MessageTypeFilter
              selectedTypes={messageTypeFilter.selectedTypes}
              onChange={messageTypeFilter.onChange}
              options={messageTypeFilter.options}
            />
          </div>
        )}
      </div>
    );
  }
);

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
