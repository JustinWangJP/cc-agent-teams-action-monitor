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
import type { ParsedMessage, MessageType, InboxMessage } from '@/types/message';

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

  // receiverフィールドを受信者として使用
  // 優先順位: テキスト内のto > receiver > 未設定
  if (!to && message.receiver) {
    to = message.receiver;
  }

  // 送信者と受信者が同じ場合はtoをundefinedに（矢印なし表示）
  if (to === message.from) {
    to = undefined;
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
  // ローカル状態（コンポーネント固有のUI状態のみ）
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<MessageType[]>([]);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);

  // 検索結果ナビゲーション状態
  const [searchResultIndex, setSearchResultIndex] = useState(-1);
  const searchResultIdsRef = useRef<string[]>([]);

  // ストアから状態を取得（二重管理を解消）
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);
  const setInboxInterval = useDashboardStore((state) => state.setInboxInterval);
  const messageFilter = useDashboardStore((state) => state.messageFilter);
  const searchQuery = useDashboardStore((state) => state.searchQuery);
  const selectedMessage = useDashboardStore((state) => state.selectedMessage);
  const isDetailOpen = useDashboardStore((state) => state.isDetailModalOpen);
  const setSelectedMessage = useDashboardStore((state) => state.setSelectedMessage);
  const setDetailModalOpen = useDashboardStore((state) => state.setDetailModalOpen);
  const setSearchQuery = useDashboardStore((state) => state.setSearchQuery);

  // 検索クエリはストアを直接使用
  const effectiveSearchQuery = searchQuery;

  /**
   * メッセージタイプフィルター変更ハンドラー。
   */
  const handleTypeFilterChange = useCallback((types: MessageType[]) => {
    setSelectedTypes(types);
    // ストアのフィルターも更新
    // messageFilter.types = types;
  }, []);

  /**
   * 送信者フィルター変更ハンドラー。
   */
  const handleSenderFilterChange = useCallback((senders: string[]) => {
    setSelectedSenders(senders);
  }, []);

  /**
   * タイムラインデータを取得（React Query版）。
   */
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
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
        // APIレスポンスのitemを直接parseMessageに渡す
        // receiverフィールドを含めて処理するため、InboxMessage型ではなくanyを使用
        return parseMessage({
          from: item.group || item.data?.from || 'unknown',
          text: item.data?.text || item.content || '',
          timestamp: item.start || item.data?.timestamp || new Date().toISOString(),
          color: item.data?.color,
          read: item.data?.read ?? true,
          summary: item.data?.summary,
          // receiverまたはinbox_ownerを受信者として渡す
          receiver: item.receiver || item.data?.inbox_owner,
        });
      });

        return messages;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName,
    staleTime: 0,
  });

  // Page Visibility API: タブ非アクティブ時にポーリング間隔を延長
  // refetchをrefで保持して無限ループを回避
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(() => {
    const ACTIVE_INTERVAL = 30000; // 30秒（アクティブ時）
    const BACKGROUND_INTERVAL = 60000; // 60秒（非アクティブ時）

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setInboxInterval(BACKGROUND_INTERVAL);
      } else {
        setInboxInterval(ACTIVE_INTERVAL);
        // アクティブに戻ったときに即時更新（ref経由で呼び出し）
        refetchRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setInboxInterval]);


  /**
   * 検索・フィルタリング結果（キャッシュ済み）。
   *
   * 検索ロジックの重複実行を回避するため、フィルタリングと検索結果ID生成を統一。
   */
  const searchResults = useMemo(() => {
    if (!data) {
      return { filtered: [], searchIds: [], hasQuery: false };
    }

    // ローカルフィルターとストアフィルターをマージ
    const combinedFilter = {
      ...messageFilter,
      types: selectedTypes.length > 0 ? selectedTypes : messageFilter.types,
      senders: selectedSenders.length > 0 ? selectedSenders : messageFilter.senders,
    };

    const hasQuery = !!effectiveSearchQuery;

    // フィルタリング実行（検索クエリ以外の条件）
    let filtered = [...data];
    if (combinedFilter.senders.length > 0) {
      filtered = filtered.filter((m) => combinedFilter.senders.includes(m.from));
    }
    if (combinedFilter.types.length > 0) {
      filtered = filtered.filter((m) => combinedFilter.types.includes(m.parsedType));
    }

    // 検索クエリがある場合のみ追加フィルタリング
    let searchIds: string[] = [];
    if (hasQuery) {
      const query = effectiveSearchQuery.toLowerCase();
      const searchFiltered = filtered.filter((m) =>
        m.from.toLowerCase().includes(query) ||
        m.text.toLowerCase().includes(query) ||
        (m.summary && m.summary.toLowerCase().includes(query))
      );
      searchIds = searchFiltered.map((m) => `${m.timestamp}-${m.from}`);
      filtered = searchFiltered;
    }

    return { filtered, searchIds, hasQuery };
  }, [data, effectiveSearchQuery, messageFilter, selectedTypes, selectedSenders]);

  /**
   * 時刻昇順にソート済みメッセージ。
   */
  const sortedMessages = useMemo(() => {
    return [...searchResults.filtered].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });
  }, [searchResults.filtered]);

  /**
   * 検索に一致するメッセージのIDリスト。
   */
  const searchResultIds = searchResults.searchIds;

  /**
   * 送信者オプション（メッセージデータから生成）。
   */
  const senderOptions = useMemo(() => {
    if (!data) return [];
    // 送信者ごとにメッセージ数を集計
    const senderMap = new Map<string, number>();
    for (const message of data) {
      const count = senderMap.get(message.from) ?? 0;
      senderMap.set(message.from, count + 1);
    }
    // オプション配列に変換
    return Array.from(senderMap.entries()).map(([sender, count]) => ({
      value: sender,
      label: sender,
      count,
    }));
  }, [data]);

  // 検索結果が変わったらインデックスをリセット
  useEffect(() => {
    searchResultIdsRef.current = searchResults.searchIds;
    setSearchResultIndex(-1);
  }, [searchResults.searchIds]);

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
    if (searchResults.searchIds.length === 0) return;
    const nextIndex = (searchResultIndex + 1) % searchResults.searchIds.length;
    setSearchResultIndex(nextIndex);

    // 該当メッセージをスクロール位置へ
    const messageId = searchResults.searchIds[nextIndex];
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResultIndex, searchResults.searchIds]);

  /**
   * 前の検索結果へ移動。
   */
  const handlePrevResult = useCallback(() => {
    if (searchResults.searchIds.length === 0) return;
    const prevIndex = searchResultIndex <= 0 ? searchResults.searchIds.length - 1 : searchResultIndex - 1;
    setSearchResultIndex(prevIndex);

    // 該当メッセージをスクロール位置へ
    const messageId = searchResults.searchIds[prevIndex];
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchResultIndex, searchResults.searchIds]);

  /**
   * メッセージクリックハンドラー。
   */
  const handleMessageClick = useCallback((message: ParsedMessage) => {
    setSelectedMessage(message);
    setDetailModalOpen(true);
  }, [setSelectedMessage, setDetailModalOpen]);

  /**
   * 詳細パネルを閉じるハンドラー。
   */
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedMessage(null);
  }, [setDetailModalOpen, setSelectedMessage]);

  /**
   * リフレッシュハンドラー。
   */
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  /**
   * 検索クエリ変更ハンドラー（ストアに直接保存）。
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

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
        lastUpdateTimestamp={dataUpdatedAt}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        messageTypeFilter={{
          selectedTypes,
          onChange: handleTypeFilterChange,
        }}
        senderFilter={{
          selectedSenders,
          onChange: handleSenderFilterChange,
          options: senderOptions,
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
