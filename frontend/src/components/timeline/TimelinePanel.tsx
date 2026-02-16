/**
 * タイムラインパネルコンポーネント。
 *
 * メッセージタイムライン、フィルター、検索、時間範囲スライダーを統合したメインパネルです。
 *
 * @module components/timeline/TimelinePanel
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import MessageTimeline from './MessageTimeline';
import TimelineFilters from './TimelineFilters';
import TimeRangeSlider from './TimeRangeSlider';
import MessageSearch from './MessageSearch';
import MessageDetailModal from './MessageDetailModal';
import type { TimelineData as TimelineDataType } from '@/types/timeline';
import type { ParsedMessage } from '@/types/message';
import { useDashboardStore } from '@/stores/dashboardStore';
import { clsx } from 'clsx';
import './timeline.css';

/**
 * タイムラインパネルのプロパティ。
 */
interface TimelinePanelProps {
  /** チーム名 */
  teamName: string;
  /** API ベース URL */
  apiBaseUrl?: string;
}

/**
 * API エラーの型。
 */
interface ApiError {
  message: string;
  status?: number;
}

/**
 * タイムラインパネルコンポーネント。
 *
 * メッセージタイムラインとその操作コントロールを統合して表示します。
 *
 * @example
 * ```tsx
 * <TimelinePanel
 *   teamName="dashboard-dev"
 *   apiBaseUrl="/api"
 * />
 * ```
 */
export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  teamName,
  apiBaseUrl = '/api',
}) => {
  const [data, setData] = useState<TimelineDataType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [filteredData, setFilteredData] = useState<TimelineDataType | null>(null);

  // 初回ロードかどうかを追跡（時間範囲フィルタをスキップするため）
  const isInitialLoadRef = useRef(true);

  // 個別セレクターを使用して無限ループを防止
  const timeRange = useDashboardStore((state) => state.timeRange);
  const setTimeRange = useDashboardStore((state) => state.setTimeRange);
  const messageFilter = useDashboardStore((state) => state.messageFilter);
  const searchQuery = useDashboardStore((state) => state.searchQuery);

  /**
   * タイムラインデータを取得。
   */
  const fetchTimelineData = useCallback(async (skipTimeRange = false) => {
    if (!teamName) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // 時間範囲パラメータ（初回ロード時はスキップして全データを取得）
      if (!skipTimeRange) {
        if (timeRange.start) {
          params.append('start_time', timeRange.start.toISOString());
        }
        if (timeRange.end) {
          params.append('end_time', timeRange.end.toISOString());
        }
      }

      // 送信者フィルター
      if (messageFilter.senders.length > 0) {
        params.append('senders', messageFilter.senders.join(','));
      }

      // タイプフィルター
      if (messageFilter.types.length > 0) {
        params.append('types', messageFilter.types.join(','));
      }

      // 未読のみ
      if (messageFilter.unreadOnly) {
        params.append('unread_only', 'true');
      }

      // 検索クエリ
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`${apiBaseUrl}/teams/${teamName}/messages/timeline?${params}`);

      if (!response.ok) {
        throw new Error(`API エラー: ${response.status} ${response.statusText}`);
      }

      const result: TimelineDataType = await response.json();

      // 日付変換
      result.items = result.items.map((item) => ({
        ...item,
        start: new Date(item.start),
        data: item.data
          ? {
              ...item.data,
              timestamp: item.data.timestamp,
            }
          : undefined,
      }));

      setData(result);
      setFilteredData(result);

      // 初回ロード時、データの時間範囲をストアに反映
      if (skipTimeRange && result.timeRange) {
        setTimeRange({
          start: new Date(result.timeRange.min),
          end: new Date(result.timeRange.max),
        });
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : '不明なエラー',
      };
      setError(apiError);
      setData(null);
      setFilteredData(null);
    } finally {
      setIsLoading(false);
    }
  }, [teamName, timeRange, messageFilter, searchQuery, apiBaseUrl, setTimeRange]);

  /**
   * 初期ロードとチーム変更時にデータ取得。
   * 初回は時間範囲フィルタなしで全データを取得し、データの時間範囲をストアに反映する。
   */
  useEffect(() => {
    if (teamName) {
      isInitialLoadRef.current = true;
      fetchTimelineData(true);
    }
  }, [teamName]);

  /**
   * フィルター/検索変更時にデータ再取得。
   * 初回ロード後のみ実行（時間範囲フィルタあり）。
   */
  useEffect(() => {
    // 初回ロード時はスキップ
    if (isInitialLoadRef.current) return;

    if (teamName && !isLoading) {
      const timer = setTimeout(() => {
        fetchTimelineData(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [timeRange, messageFilter, searchQuery, teamName, isLoading]);

  /**
   * アイテムクリックハンドラー。
   */
  const handleItemClick = useCallback((_message: ParsedMessage) => {
    // 選択状態はストアで管理
  }, []);

  /**
   * リフレッシュハンドラー。
   */
  const handleRefresh = useCallback(() => {
    fetchTimelineData(false);
  }, [fetchTimelineData]);

  /**
   * フィルター変更ハンドラー。
   */
  const handleFilterChange = useCallback(() => {
    // データ再取得は useEffect で行う
  }, []);

  /**
   * 検索ハンドラー。
   */
  const handleSearch = useCallback(() => {
    // データ再取得は useEffect で行う
  }, []);

  /**
   * 検索クリアハンドラー。
   */
  const handleSearchClear = useCallback(() => {
    // データ再取得は useEffect で行う
  }, []);

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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          💬 メッセージタイムライン
        </h2>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'text-slate-700 dark:text-slate-300',
            'bg-white dark:bg-slate-800',
            'border border-slate-300 dark:border-slate-700',
            'hover:bg-slate-50 dark:hover:bg-slate-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          更新
        </button>
      </div>

      {/* 検索 */}
      <MessageSearch
        resultCount={filteredData?.items.length ?? 0}
        onSearch={handleSearch}
        onClear={handleSearchClear}
      />

      {/* 時間範囲スライダー */}
      {data && data.timeRange && (
        <TimeRangeSlider
          minTime={new Date(data.timeRange.min)}
          maxTime={new Date(data.timeRange.max)}
          onChange={handleFilterChange}
        />
      )}

      {/* フィルター */}
      {data && (
        <TimelineFilters
          availableSenders={data.groups.map((g) => g.id)}
          onFilterChange={handleFilterChange}
        />
      )}

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

      {/* タイムライン */}
      <div className="flex-1 min-h-0">
        <MessageTimeline
          teamName={teamName}
          data={filteredData ?? undefined}
          isLoading={isLoading}
          error={error?.message ?? null}
          onItemClick={handleItemClick}
        />
      </div>

      {/* 詳細モーダル */}
      <MessageDetailModal />
    </div>
  );
};

export default TimelinePanel;
