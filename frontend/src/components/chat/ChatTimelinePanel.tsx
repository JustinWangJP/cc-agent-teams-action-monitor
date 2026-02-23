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
import type { TimelineMessage } from './ChatMessageBubble';
import type { ParsedMessage, ExtendedParsedType, UnifiedTimelineEntry } from '@/types/message';

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
  const [selectedTypes, setSelectedTypes] = useState<ExtendedParsedType[]>([]);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [displayLimit, setDisplayLimit] = useState<'500' | 'all'>('500');

  // 検索結果ナビゲーション状態
  const [searchResultIndex, setSearchResultIndex] = useState(-1);
  const searchResultIdsRef = useRef<string[]>([]);

  // ストアから状態を取得（二重管理を解消）
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);
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
  const handleTypeFilterChange = useCallback((types: ExtendedParsedType[]) => {
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
   * タイムラインデータを取得（統合タイムラインAPI版）。
   */
  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-timeline', teamName, displayLimit],
    queryFn: async (): Promise<TimelineMessage[]> => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      // 統合タイムラインAPIを使用
      // displayLimit が 'all' の場合は10000件、それ以外は500件
      const limit = displayLimit === 'all' ? 10000 : 500;
      const response = await fetch(`${apiBaseUrl}/timeline/${encodeURIComponent(teamName)}/history?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`API エラー: ${response.status} ${response.statusText}`);
      }

      const result = {
        items: [],
        last_timestamp: '',
      };

      try {
        const json = await response.json();
        result.items = json.items || [];
        result.last_timestamp = json.last_timestamp || '';
      } catch (e) {
        // JSONパースエラーの場合は空の配列を返す
        console.warn('Failed to parse timeline response:', e);
      }

      // UnifiedTimelineEntry[] を TimelineMessage[] に変換
      const messages: TimelineMessage[] = result.items.map((item: UnifiedTimelineEntry) => {
        // inbox 由来のエントリは ParsedMessage に変換
        if (item.source === 'inbox') {
          const parsed = parseMessage({
            from: item.from_,
            text: item.content,
            timestamp: item.timestamp,
            color: item.color,
            read: item.read ?? true,
            summary: item.summary,
            to: item.to ?? undefined,
          });
          // source フィールドを明示的に設定（重要：左右レイアウト判定に使用）
          return {
            ...parsed,
            source: 'inbox' as const,
          };
        }
        // session 由来のエントリは UnifiedTimelineEntry をそのまま返す
        // from_ -> from, content -> text にマッピング
        // source フィールドを明示的に保持（重要：左右レイアウト判定に使用）
        return {
          ...item,
          from: item.from_,
          text: item.content,
          source: 'session' as const,
        };
      });

      return messages;
    },
    refetchInterval: messagesInterval,
    enabled: !!teamName,
    staleTime: 0,
  });


  /**
   * 検索・フィルタリング結果（キャッシュ済み）。
   *
   * 検索ロジックの重複実行を回避するため、フィルタリングと検索結果ID生成を統一。
   */
  const searchResults = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return { filtered: [], searchIds: [], hasQuery: false };
    }

    // ローカルフィルターとストアフィルターをマージ
    // ストアの types は MessageType[] だが、ExtendedParsedType[] として扱う
    const combinedFilter = {
      ...messageFilter,
      types: selectedTypes.length > 0 ? selectedTypes : (messageFilter.types as ExtendedParsedType[]),
      senders: selectedSenders.length > 0 ? selectedSenders : messageFilter.senders,
    };

    const hasQuery = !!effectiveSearchQuery;

    // フィルタリング実行（検索クエリ以外の条件）
    let filtered = [...data];
    if (combinedFilter.senders.length > 0) {
      filtered = filtered.filter((m) => m?.from && combinedFilter.senders.includes(m.from));
    }
    if (combinedFilter.types.length > 0) {
      filtered = filtered.filter((m) => m?.parsedType && combinedFilter.types.includes(m.parsedType as ExtendedParsedType));
    }

    // 検索クエリがある場合のみ追加フィルタリング
    let searchIds: string[] = [];
    if (hasQuery) {
      const query = effectiveSearchQuery.toLowerCase();
      const searchFiltered = filtered.filter((m) => {
        if (!m) return false;
        const fromMatch = m.from?.toLowerCase().includes(query) ?? false;
        const textMatch = m.text?.toLowerCase().includes(query) ?? false;
        const summaryMatch = m.summary?.toLowerCase().includes(query) ?? false;
        return fromMatch || textMatch || summaryMatch;
      });
      searchIds = searchFiltered.map((m) => `${m.timestamp}-${m.from}`);
      filtered = searchFiltered;
    }

    return { filtered, searchIds, hasQuery };
  }, [data, effectiveSearchQuery, messageFilter, selectedTypes, selectedSenders]);

  /**
   * 時刻昇順にソート済みメッセージ。
   *
   * 重複排除ロジックを含む：タイムスタンプ（秒単位）+ 正規化された内容で判定
   */
  const sortedMessages = useMemo(() => {
    if (!searchResults.filtered || !Array.isArray(searchResults.filtered)) {
      return [];
    }

    // 重複判定キー生成関数：タイムスタンプ（秒単位まで）+ 正規化された内容
    const getDuplicateKey = (msg: TimelineMessage): string => {
      const timestamp = new Date(msg.timestamp);
      // 秒単位に切り捨て
      timestamp.setMilliseconds(0);
      // 内容を正規化（空白の正規化など）
      const content = ((msg as ParsedMessage).text || (msg as UnifiedTimelineEntry).content || '').trim().replace(/\s+/g, ' ');
      return `${timestamp.toISOString()}_${content}`;
    };

    // まずソート
    const sorted = [...searchResults.filtered].sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateA - dateB;
    });

    // 重複排除（後勝ち - より詳細な情報を持つ方を優先）
    const uniqueMessages = Array.from(
      new Map(sorted.map(m => [getDuplicateKey(m), m])).values()
    );

    return uniqueMessages;
  }, [searchResults.filtered]);

  /**
   * 検索に一致するメッセージのIDリスト。
   */
  const searchResultIds = searchResults.searchIds;

  /**
   * 送信者オプション（メッセージデータから生成）。
   */
  const senderOptions = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    // 送信者ごとにメッセージ数を集計
    const senderMap = new Map<string, number>();
    for (const message of data) {
      if (!message?.from) continue;
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
  const handleMessageClick = useCallback((message: TimelineMessage) => {
    setSelectedMessage(message as ParsedMessage);
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
    <div className="flex flex-col h-full gap-3">
      {/* ヘッダー */}
      <ChatHeader
        title="メッセージタイムライン"
        messageCount={sortedMessages.length}
        searchQuery={effectiveSearchQuery}
        onSearchChange={handleSearchChange}
        searchResultCount={searchResultIds.length}
        searchResultIndex={searchResultIndex}
        onPrevResult={handlePrevResult}
        onNextResult={handleNextResult}
        displayLimit={displayLimit}
        onDisplayLimitChange={setDisplayLimit}
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
