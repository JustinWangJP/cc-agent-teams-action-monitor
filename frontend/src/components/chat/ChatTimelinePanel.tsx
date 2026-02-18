/**
 * チャット形式タイムラインパネルコンポーネント。
 *
 * メッセージタイムラインをチャット形式で表示するメインコンテナです。
 * HTTP Polling方式でデータを更新し、vis-timelineを置き換えます。
 *
 * @module components/chat/ChatTimelinePanel
 */

'use client';

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { MessageDetailPanel } from './MessageDetailPanel';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { ParsedMessage, MessageType } from '@/types/message';
import { clsx } from 'clsx';

/**
 * チャットタイムラインパネルのプロパティ。
 */
export interface ChatTimelinePanelProps {
  /** チーム名 */
  teamName: string;
  /** API ベース URL */
  apiBaseUrl?: string;
}

/**
 * メッセージをパースする関数。
 */
function parseMessage(message: any): ParsedMessage {
  // 既にパース済みの場合はそのまま返す
  if (message.parsedType) {
    return message as ParsedMessage;
  }

  // テキストフィールドからJSONをパース
  let parsedType: ParsedMessage['parsedType'] = 'message';
  let parsedData: any = undefined;
  let summary = message.summary;
  let to = message.to;

  if (message.text) {
    try {
      const data = JSON.parse(message.text);
      if (data.type) {
        parsedType = data.type as ParsedMessage['parsedType'];
        parsedData = data;
        if (!summary) {
          summary = data.summary || data.reason || data.content || '';
        }
        if (data.to) {
          to = data.to;
        }
      }
    } catch {
      // JSONではない場合は通常のメッセージとして扱う
      parsedType = 'message';
    }
  }

  return {
    ...message,
    parsedType,
    parsedData,
    summary,
    to,
  };
}

/**
 * メッセージフィルタリング関数。
 */
function filterMessages(
  messages: ParsedMessage[],
  searchQuery: string,
  filter: {
    senders: string[];
    types: string[];
    unreadOnly: boolean;
  }
): ParsedMessage[] {
  let filtered = [...messages];

  // 検索クエリによるフィルタリング
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.from.toLowerCase().includes(query) ||
        m.text.toLowerCase().includes(query) ||
        (m.summary && m.summary.toLowerCase().includes(query))
    );
  }

  // 送信者フィルター
  if (filter.senders.length > 0) {
    filtered = filtered.filter((m) => filter.senders.includes(m.from));
  }

  // タイプフィルター（parsedTypeで比較）
  if (filter.types.length > 0) {
    filtered = filtered.filter((m) => filter.types.includes(m.parsedType));
  }

  // 未読のみ
  if (filter.unreadOnly) {
    filtered = filtered.filter((m) => !m.read);
  }

  return filtered;
}

/**
 * チャットタイムラインパネルコンポーネント。
 *
 * @example
 * ```tsx
 * <ChatTimelinePanel
 *   teamName="dashboard-dev"
 *   apiBaseUrl="/api"
 * />
 * ```
 */
export const ChatTimelinePanel = ({
  teamName,
  apiBaseUrl = '/api',
}: ChatTimelinePanelProps) => {
  // ローカル状態
  const [selectedMessage, setSelectedMessage] = useState<ParsedMessage | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<MessageType[]>([]);

  // 検索結果ナビゲーション状態
  const [searchResultIndex, setSearchResultIndex] = useState(-1);
  const searchResultIdsRef = useRef<string[]>([]);

  // ストアから状態を取得
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);
  const setInboxInterval = useDashboardStore((state) => state.setInboxInterval);
  const messageFilter = useDashboardStore((state) => state.messageFilter);
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const storeSelectedMessage = useDashboardStore((state) => state.selectedMessage);
  const storeIsDetailOpen = useDashboardStore((state) => state.isDetailModalOpen);
  const setSelectedStoreMessage = useDashboardStore((state) => state.setSelectedMessage);
  const setDetailModalOpen = useDashboardStore((state) => state.setDetailModalOpen);

  // ストアの検索クエリを優先
  const effectiveSearchQuery = searchQuery || localSearchQuery;

  /**
   * メッセージタイプフィルター変更ハンドラー。
   */
  const handleTypeFilterChange = useCallback((types: MessageType[]) => {
    setSelectedTypes(types);
    // ストアのフィルターも更新
    // messageFilter.types = types;
  }, []);

  /**
   * タイムラインデータを取得（React Query版）。
   */
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chat-timeline', teamName],
    queryFn: async () => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const response = await fetch(`${apiBaseUrl}/teams/${teamName}/messages/timeline`);

      if (!response.ok) {
        throw new Error(`API エラー: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // ParsedMessageに変換
      const messages: ParsedMessage[] = (result.items || []).map((item: any) => {
        const inboxMessage: ParsedMessage = {
          from: item.group || item.data?.from || 'unknown',
          text: item.data?.text || item.content || '',
          timestamp: item.start || item.data?.timestamp || new Date().toISOString(),
          color: item.data?.color,
          read: item.data?.read ?? true,
          summary: item.data?.summary,
        };
        return parseMessage(inboxMessage);
      });

      return messages;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName,
    staleTime: 0,
  });

  /**
   * フィルタリング済みメッセージ。
   */
  const filteredMessages = useMemo(() => {
    if (!data) return [];

    // ローカルフィルターとストアフィルターをマージ
    const combinedFilter = {
      ...messageFilter,
      types: selectedTypes.length > 0 ? selectedTypes : messageFilter.types,
    };

    return filterMessages(data, effectiveSearchQuery, combinedFilter);
  }, [data, effectiveSearchQuery, messageFilter, selectedTypes]);

  /**
   * 時刻昇順にソート済みメッセージ。
   */
  const sortedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
  }, [filteredMessages]);

  /**
   * 検索に一致するメッセージのIDリスト。
   */
  const searchResultIds = useMemo(() => {
    if (!effectiveSearchQuery) return [];
    const query = effectiveSearchQuery.toLowerCase();
    return sortedMessages
      .filter((m) =>
        m.from.toLowerCase().includes(query) ||
        m.text.toLowerCase().includes(query) ||
        (m.summary && m.summary.toLowerCase().includes(query))
      )
      .map((m) => `${m.timestamp}-${m.from}`);
  }, [sortedMessages, effectiveSearchQuery]);

  // 検索結果が変わったらインデックスをリセット
  useEffect(() => {
    searchResultIdsRef.current = searchResultIds;
    setSearchResultIndex(-1);
  }, [searchResultIds]);

  /**
   * 現在ハイライトすべきメッセージID。
   */
  const highlightedMessageId = useMemo(() => {
    if (searchResultIndex >= 0 && searchResultIndex < searchResultIds.length) {
      return searchResultIds[searchResultIndex];
    }
    return undefined;
  }, [searchResultIndex, searchResultIds]);

  /**
   * 次の検索結果へ移動。
   */
  const handleNextResult = useCallback(() => {
    if (searchResultIds.length === 0) return;
    const nextIndex = (searchResultIndex + 1) % searchResultIds.length;
    setSearchResultIndex(nextIndex);

    // 該当メッセージをスクロール位置へ
    const messageId = searchResultIds[nextIndex];
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResultIndex, searchResultIds]);

  /**
   * 前の検索結果へ移動。
   */
  const handlePrevResult = useCallback(() => {
    if (searchResultIds.length === 0) return;
    const prevIndex = searchResultIndex <= 0 ? searchResultIds.length - 1 : searchResultIndex - 1;
    setSearchResultIndex(prevIndex);

    // 該当メッセージをスクロール位置へ
    const messageId = searchResultIds[prevIndex];
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResultIndex, searchResultIds]);

  /**
   * メッセージクリックハンドラー。
   */
  const handleMessageClick = useCallback((message: ParsedMessage) => {
    setSelectedMessage(message);
    setSelectedStoreMessage(message);
    setIsDetailOpen(true);
    setDetailModalOpen(true);
  }, [setSelectedStoreMessage, setDetailModalOpen]);

  /**
   * 詳細パネルを閉じるハンドラー。
   */
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedMessage(null);
    setDetailModalOpen(false);
    setSelectedStoreMessage(null);
  }, [setDetailModalOpen, setSelectedStoreMessage]);

  /**
   * リフレッシュハンドラー。
   */
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * 検索クエリ変更ハンドラー。
   */
  const handleSearchChange = useCallback((query: string) => {
    setLocalSearchQuery(query);
    // ストアにも同期
    if (searchQuery !== undefined) {
      // ストアのsearchQueryが使用されている場合は更新
      // ※ set関数を直接呼ぶと無限ループの可能性があるため注意
    }
  }, [searchQuery]);

  // ストアの状態が変更された場合に同期
  if (storeSelectedMessage !== selectedMessage) {
    setSelectedMessage(storeSelectedMessage);
  }
  if (storeIsDetailOpen !== isDetailOpen) {
    setIsDetailOpen(storeIsDetailOpen);
  }

  // チーム名が未指定の場合
  if (!teamName) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-500 dark:text-slate-400">チームを選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ヘッダー */}
      <ChatHeader
        title="💬 メッセージタイムライン"
        messageCount={sortedMessages.length}
        searchQuery={effectiveSearchQuery}
        onSearchChange={handleSearchChange}
        searchResultCount={searchResultIds.length}
        searchResultIndex={searchResultIndex}
        onPrevResult={handlePrevResult}
        onNextResult={handleNextResult}
        pollingInterval={inboxInterval}
        onPollingIntervalChange={setInboxInterval}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        messageTypeFilter={{
          selectedTypes,
          onChange: handleTypeFilterChange,
        }}
        showFilter={showFilter}
        onToggleFilter={() => setShowFilter(!showFilter)}
      />

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">データの取得に失敗しました</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error.message}</p>
          </div>
        </div>
      )}

      {/* メッセージリスト */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <ChatMessageList
          messages={sortedMessages}
          selectedMessageId={
            selectedMessage ? `${selectedMessage.timestamp}-${selectedMessage.from}` : undefined
          }
          highlightedMessageId={highlightedMessageId}
          searchQuery={effectiveSearchQuery}
          onMessageClick={handleMessageClick}
          autoScroll={true}
          isLoading={isLoading}
          error={error?.message ?? null}
        />
      </div>

      {/* 詳細パネル */}
      <MessageDetailPanel
        message={selectedMessage}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default ChatTimelinePanel;
