/**
 * 統合タイムライン用カスタムフック。
 *
 * inbox メッセージと session ログを統合したタイムラインデータを取得・管理します。
 * React Query を使用してポーリングによるデータ更新を実現します。
 *
 * @module hooks/useUnifiedTimeline
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { UnifiedTimelineEntry } from '@/types/message';

/**
 * キャッシュエントリ。
 *
 * タイムラインデータをキャッシュするための構造。
 */
interface CachedTimelineData {
  entries: UnifiedTimelineEntry[];
  lastTimestamp: string;
  timestamp: number; // キャッシュ時刻（Unix タイムスタンプ）
}

/**
 * インメモリキャッシュ。
 *
 * チーム別にタイムラインデータをキャッシュします。
 */
const timelineCache = new Map<string, CachedTimelineData>();

/**
 * キャッシュの有効期限（ミリ秒）。
 * デフォルト: 5分
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * キャッシュをクリアする関数。
 *
 * 指定されたチームのキャッシュをクリアします。
 * チーム名を指定しない場合は全てのキャッシュをクリアします。
 *
 * @param teamName - キャッシュをクリアするチーム名（省略時は全て）
 */
export function clearTimelineCache(teamName?: string): void {
  if (teamName) {
    timelineCache.delete(teamName);
  } else {
    timelineCache.clear();
  }
}

/**
 * キャッシュからデータを取得する関数。
 *
 * 有効期限内のキャッシュが存在する場合、そのデータを返します。
 *
 * @param teamName - チーム名
 * @returns キャッシュされたデータ、または null
 */
function getFromCache(teamName: string): CachedTimelineData | null {
  const cached = timelineCache.get(teamName);
  if (!cached) return null;

  // キャッシュの有効期限をチェック
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    timelineCache.delete(teamName);
    return null;
  }

  return cached;
}

/**
 * キャッシュにデータを保存する関数。
 *
 * @param teamName - チーム名
 * @param data - 保存するデータ（timestampは内部で設定）
 */
function saveToCache(teamName: string, data: Omit<CachedTimelineData, 'timestamp'>): void {
  timelineCache.set(teamName, {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * エラーの種類。
 */
export enum TimelineErrorType {
  /** ネットワークエラー */
  Network = 'network',
  /** API エラー */
  Api = 'api',
  /** パースエラー */
  Parse = 'parse',
  /** 不明なエラー */
  Unknown = 'unknown',
}

/**
 * タイムラインエラー。
 */
export interface TimelineError {
  type: TimelineErrorType;
  message: string;
  statusCode?: number;
  timestamp: number;
}

/**
 * エラーを分類する関数。
 *
 * @param error - エラーオブジェクト
 * @param response - レスポンスオブジェクト（省略可能）
 * @returns TimelineError
 */
function classifyError(error: unknown, response?: Response): TimelineError {
  const now = Date.now();

  // ネットワークエラーの判定
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: TimelineErrorType.Network,
      message: 'ネットワークエラーが発生しました。接続を確認してください。',
      timestamp: now,
    };
  }

  // レスポンスステータスコードによる判定
  if (response) {
    if (response.status === 404) {
      return {
        type: TimelineErrorType.Api,
        message: 'チームが見つかりません。',
        statusCode: response.status,
        timestamp: now,
      };
    }
    if (response.status >= 500) {
      return {
        type: TimelineErrorType.Api,
        message: 'サーバーエラーが発生しました。',
        statusCode: response.status,
        timestamp: now,
      };
    }
  }

  // パースエラーの判定
  if (error instanceof SyntaxError) {
    return {
      type: TimelineErrorType.Parse,
      message: 'データの解析に失敗しました。',
      timestamp: now,
    };
  }

  // デフォルト
  return {
    type: TimelineErrorType.Unknown,
    message: error instanceof Error ? error.message : '不明なエラーが発生しました。',
    timestamp: now,
  };
}

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
 * フックの戻り値型。
 */
export interface UseUnifiedTimelineResult {
  /** タイムラインエントリ配列 */
  entries: UnifiedTimelineEntry[];
  /** 最終タイムスタンプ */
  lastTimestamp: string | undefined;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー情報 */
  error: TimelineError | null;
  /** 手動再取得関数 */
  refetch: () => void;
  /** 最終更新時刻（Unix タイムスタンプ） */
  dataUpdatedAt: number;
  /** キャッシュから取得したかどうか */
  isFromCache: boolean;
  /** キャッシュをクリアする関数 */
  clearCache: () => void;
}

/**
 * 統合タイムラインデータを取得・管理するカスタムフック。
 *
 * React Query を使用して /api/timeline/{teamName}/history エンドポイントから
 * 統合タイムラインデータを取得し、設定された間隔でポーリングします。
 * ポーリング間隔は dashboardStore の inboxInterval を使用します。
 * キャッシュ機能により、前回のデータを保持・再利用します。
 *
 * @param options - フックのオプション
 * @returns entries - タイムラインエントリ配列
 * @returns lastTimestamp - 最終タイムスタンプ
 * @returns isLoading - ローディング状態
 * @returns error - エラー情報（TimelineError | null）
 * @returns refetch - 手動再取得関数
 * @returns dataUpdatedAt - 最終更新時刻（Unix タイムスタンプ）
 * @returns isFromCache - キャッシュから取得したかどうか
 * @returns clearCache - キャッシュをクリアする関数
 *
 * @example
 * ```tsx
 * const { entries, isLoading, error, refetch, isFromCache } = useUnifiedTimeline({
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
}: UseUnifiedTimelineOptions): UseUnifiedTimelineResult {
  const queryClient = useQueryClient();
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);

  // キャッシュをクリアする関数
  const clearCache = useCallback(() => {
    if (teamName) {
      clearTimelineCache(teamName);
      queryClient.invalidateQueries({ queryKey: ['unified-timeline', teamName] });
    }
  }, [teamName, queryClient]);

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

      // キャッシュを確認
      const cached = getFromCache(teamName);
      if (cached) {
        return {
          items: cached.entries,
          last_timestamp: cached.lastTimestamp,
        };
      }

      const url = `${apiBaseUrl}/timeline/${encodeURIComponent(teamName)}/history?limit=${limit}`;
      let response: Response | null = null;

      try {
        response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          const classifiedError = classifyError(
            new Error(`API エラー: ${response.status} ${errorText}`),
            response
          );
          throw classifiedError;
        }

        const result: UnifiedTimelineResponse = await response.json();

        // キャッシュに保存
        saveToCache(teamName, {
          entries: result.items,
          lastTimestamp: result.last_timestamp,
        });

        return result;
      } catch (err) {
        // エラーを分類してスロー
        const classifiedError = classifyError(err, response ?? undefined);
        throw classifiedError;
      }
    },
    refetchInterval: messagesInterval,
    enabled: !!teamName && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // キャッシュから取得したかどうかを判定
  const isFromCache = useMemo(() => {
    if (!teamName || !data) return false;
    const cached = getFromCache(teamName);
    return cached !== null && cached.entries.length === data.items.length;
  }, [teamName, data]);

  return {
    entries: (data?.items ?? []) as UnifiedTimelineEntry[],
    lastTimestamp: data?.last_timestamp,
    isLoading,
    error: (error as TimelineError | null),
    refetch,
    dataUpdatedAt,
    isFromCache,
    clearCache,
  };
}

/**
 * 差分更新用フックの戻り値型。
 */
export interface UseUnifiedTimelineUpdatesResult {
  /** 新規タイムラインエントリ配列 */
  entries: UnifiedTimelineEntry[];
  /** 最終タイムスタンプ */
  lastTimestamp: string | undefined;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラー情報 */
  error: TimelineError | null;
  /** 手動再取得関数 */
  refetch: () => void;
  /** 最終更新時刻（Unix タイムスタンプ） */
  dataUpdatedAt: number;
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
 * @returns error - エラー情報（TimelineError | null）
 * @returns refetch - 手動再取得関数
 * @returns dataUpdatedAt - 最終更新時刻（Unix タイムスタンプ）
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
): UseUnifiedTimelineUpdatesResult {
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);
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
      let response: Response | null = null;

      try {
        response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          const classifiedError = classifyError(
            new Error(`API エラー: ${response.status} ${errorText}`),
            response
          );
          throw classifiedError;
        }

        const result: UnifiedTimelineResponse = await response.json();
        return result;
      } catch (err) {
        const classifiedError = classifyError(err, response ?? undefined);
        throw classifiedError;
      }
    },
    refetchInterval: messagesInterval,
    enabled: !!teamName && !!since && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    entries: (data?.items ?? []) as UnifiedTimelineEntry[],
    lastTimestamp: data?.last_timestamp,
    isLoading,
    error: (error as TimelineError | null),
    refetch,
    dataUpdatedAt,
  };
}

/**
 * 差分エントリを既存のエントリにマージする関数。
 *
 * 同一IDのエントリは上書きし、新しいエントリは追加します。
 * タイムスタンプ順にソートします。
 *
 * @param existing - 既存のエントリ配列
 * @param updates - 追加するエントリ配列
 * @param maxEntries - 最大エントリ数（デフォルト: 500）
 * @returns マージされたエントリ配列
 *
 * @example
 * ```tsx
 * const merged = mergeTimelineEntries(existingEntries, newEntries);
 * ```
 */
export function mergeTimelineEntries(
  existing: UnifiedTimelineEntry[],
  updates: UnifiedTimelineEntry[],
  maxEntries: number = 500
): UnifiedTimelineEntry[] {
  // エントリをマップに変換（ID をキー）
  const entryMap = new Map<string, UnifiedTimelineEntry>();

  // 既存エントリを追加
  for (const entry of existing) {
    entryMap.set(entry.id, entry);
  }

  // 新規エントリを追加（既存IDは上書き）
  for (const entry of updates) {
    entryMap.set(entry.id, entry);
  }

  // 配列に変換してタイムスタンプ順にソート（降順）
  const merged = Array.from(entryMap.values()).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // 新しい順
  });

  // 最大件数を制限
  return merged.slice(0, maxEntries);
}

/**
 * マージ済みタイムラインを管理するフック。
 *
 * 既存のタイムラインに差分更新をマージし、
 * 最大件数を維持しながらデータを管理します。
 *
 * @param teamName - チーム名
 * @param options - フックのオプション
 * @returns entries - マージされたタイムラインエントリ配列
 * @returns lastTimestamp - 最終タイムスタンプ
 * @returns isLoading - ローディング状態
 * @returns error - エラー情報
 * @returns refetch - 手動再取得関数
 * @returns mergeUpdates - 差分更新をマージする関数
 *
 * @example
 * ```tsx
 * const { entries, mergeUpdates } = useMergedTimeline({
 *   teamName: 'dashboard-dev',
 * });
 *
 * // 差分更新をマージ
 * const { entries: updates } = useUnifiedTimelineUpdates(teamName, lastTimestamp);
 * mergeUpdates(updates);
 * ```
 */
export function useMergedTimeline({
  teamName,
  enabled = true,
  maxEntries = 500,
}: Omit<UseUnifiedTimelineOptions, 'apiBaseUrl' | 'limit'> & { maxEntries?: number }) {
  const queryClient = useQueryClient();
  const { entries, lastTimestamp, isLoading, error, refetch, clearCache } = useUnifiedTimeline({
    teamName,
    enabled,
    limit: maxEntries,
  });

  /**
   * 差分更新をマージする関数。
   *
   * @param updates - マージする差分エントリ配列
   */
  const mergeUpdates = useCallback((updates: UnifiedTimelineEntry[]) => {
    if (updates.length === 0) return;

    // React Query キャッシュを更新
    queryClient.setQueryData<UnifiedTimelineResponse>(
      ['unified-timeline', teamName, maxEntries],
      (old) => {
        if (!old) return old;

        const merged = mergeTimelineEntries(old.items, updates, maxEntries);
        const latestTimestamp = updates[updates.length - 1]?.timestamp ?? old.last_timestamp;

        return {
          items: merged,
          last_timestamp: latestTimestamp,
        };
      }
    );
  }, [teamName, maxEntries, queryClient]);

  return {
    entries,
    lastTimestamp,
    isLoading,
    error,
    refetch,
    clearCache,
    mergeUpdates,
  };
}
