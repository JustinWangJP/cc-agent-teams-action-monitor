/**
 * 統合タイムライン用カスタムフック。
 *
 * inbox メッセージと session ログを統合したタイムラインデータを取得・管理します。
 * React Query を使用してポーリングによるデータ更新を実現します。
 *
 * @module hooks/useUnifiedTimeline
 */

import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { UnifiedTimelineEntry } from '@/types/message';

/**
 * フックのオプション。
 */
export interface UseUnifiedTimelineOptions {
  /** チーム名 */
  teamName: string | null;
  /** 有効フラグ */
  enabled?: boolean;
  /** API ベース URL */
  apiBaseUrl?: string;
  /** 1回の取得最大件数 */
  limit?: number;
}

/**
 * API レスポンス型。
 */
interface UnifiedTimelineResponse {
  items: UnifiedTimelineEntry[];
  last_timestamp: string;
}

/**
 * 統合タイムラインデータを取得・管理するカスタムフック。
 *
 * React Query を使用して /api/timeline/{teamName}/history エンドポイントから
 * 統合タイムラインデータを取得し、設定された間隔でポーリングします。
 * ポーリング間隔は dashboardStore の inboxInterval を使用します。
 *
 * @param options - フックのオプション
 * @returns entries - タイムラインエントリ配列
 * @returns lastTimestamp - 最終タイムスタンプ
 * @returns isLoading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 * @returns dataUpdatedAt - 最終更新時刻（Unix タイムスタンプ）
 *
 * @example
 * ```tsx
 * const { entries, isLoading, error, refetch } = useUnifiedTimeline({
 *   teamName: 'dashboard-dev',
 *   enabled: true,
 * });
 * ```
 */
export function useUnifiedTimeline({
  teamName,
  enabled = true,
  apiBaseUrl = '/api',
  limit = 100,
}: UseUnifiedTimelineOptions) {
  // dashboardStore からポーリング間隔を取得
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);

  const {
    data,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['unified-timeline', teamName, limit],
    queryFn: async (): Promise<UnifiedTimelineResponse> => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const url = `${apiBaseUrl}/timeline/${encodeURIComponent(teamName)}/history?limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API エラー: ${response.status} ${errorText}`);
      }

      const result: UnifiedTimelineResponse = await response.json();
      return result;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    entries: (data?.items ?? []) as UnifiedTimelineEntry[],
    lastTimestamp: data?.last_timestamp,
    isLoading,
    error: error as Error | null,
    refetch,
    dataUpdatedAt,
  };
}

/**
 * 統合タイムラインの差分更新を取得するカスタムフック。
 *
 * 指定したタイムスタンプ以降の新規エントリのみを取得します。
 * ポーリングによる差分更新に使用します。
 *
 * @param teamName - チーム名
 * @param since - 差分更新の基準タイムスタンプ
 * @param options - 追加オプション
 * @returns entries - 新規タイムラインエントリ配列
 * @returns lastTimestamp - 最終タイムスタンプ
 * @returns isLoading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 *
 * @example
 * ```tsx
 * const { entries, refetch } = useUnifiedTimelineUpdates(
 *   'dashboard-dev',
 *   lastTimestamp
 * );
 * ```
 */
export function useUnifiedTimelineUpdates(
  teamName: string | null,
  since: string | null,
  options?: Partial<UseUnifiedTimelineOptions>
) {
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);
  const apiBaseUrl = options?.apiBaseUrl ?? '/api';
  const limit = options?.limit ?? 50;
  const enabled = options?.enabled ?? true;

  const {
    data,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['unified-timeline-updates', teamName, since, limit],
    queryFn: async (): Promise<UnifiedTimelineResponse> => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const params = new URLSearchParams({
        limit: String(limit),
      });

      if (since) {
        params.append('since', since);
      }

      const url = `${apiBaseUrl}/timeline/${encodeURIComponent(teamName)}/updates?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API エラー: ${response.status} ${errorText}`);
      }

      const result: UnifiedTimelineResponse = await response.json();
      return result;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    entries: (data?.items ?? []) as UnifiedTimelineEntry[],
    lastTimestamp: data?.last_timestamp,
    isLoading,
    error: error as Error | null,
    refetch,
    dataUpdatedAt,
  };
}
