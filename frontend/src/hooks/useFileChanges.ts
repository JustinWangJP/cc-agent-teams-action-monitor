/**
 * ファイル変更監視用カスタムフック。
 *
 * セッションログから抽出したファイル変更データを取得・管理します。
 * React Query を使用してポーリングによるデータ更新を実現します。
 *
 * @module hooks/useFileChanges
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { FileChangeEntry, FileChangeFilter } from '@/types/message';

/**
 * フックのオプション。
 */
export interface UseFileChangesOptions {
  /** チーム名 */
  teamName: string | null;
  /** 有効フラグ */
  enabled?: boolean;
  /** API ベース URL */
  apiBaseUrl?: string;
  /** 取得最大件数 */
  limit?: number;
}

/**
 * API レスポンス型。
 */
interface FileChangesResponse {
  items: FileChangeEntry[];
  last_timestamp: string;
}

/**
 * ファイル変更データを取得・管理するカスタムフック。
 *
 * @param options - フックのオプション
 * @returns entries - ファイル変更エントリ配列
 * @returns filteredEntries - フィルタ適用後のエントリ配列
 * @returns filter - フィルター条件
 * @returns setFilter - フィルター条件を更新
 * @returns availableAgents - 利用可能なエージェント一覧
 * @returns availableDirectories - 利用可能なディレクトリ一覧
 * @returns availableExtensions - 利用可能な拡張子一覧
 * @returns isLoading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 *
 * @example
 * ```tsx
 * const { entries, filteredEntries, filter, setFilter, isLoading } = useFileChanges({
 *   teamName: 'dashboard-dev',
 *   enabled: true,
 * });
 * ```
 */
export function useFileChanges({
  teamName,
  enabled = true,
  apiBaseUrl = '/api',
  limit = 200,
}: UseFileChangesOptions) {
  // dashboardStore からポーリング間隔を取得
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['file-changes', teamName, limit],
    queryFn: async (): Promise<FileChangesResponse> => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const url = `${apiBaseUrl}/timeline/file-changes/${encodeURIComponent(teamName)}?limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API エラー: ${response.status} ${errorText}`);
      }

      const result: FileChangesResponse = await response.json();
      return result;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // 利用可能なフィルター候補を生成
  const { availableAgents, availableDirectories, availableExtensions } = useMemo(() => {
    const entries = data?.items ?? [];

    const agentsSet = new Set<string>();
    const directoriesSet = new Set<string>();
    const extensionsSet = new Set<string>();

    for (const entry of entries) {
      if (entry.agent) {
        agentsSet.add(entry.agent);
      }

      // ディレクトリを抽出（最上位ディレクトリのみ）
      const pathParts = entry.file.path.split('/');
      if (pathParts.length > 1) {
        directoriesSet.add(pathParts[0]);
      }

      // 拡張子を抽出
      const extMatch = entry.file.path.match(/\.([^.]+)$/);
      if (extMatch) {
        extensionsSet.add(extMatch[1]);
      }
    }

    return {
      availableAgents: Array.from(agentsSet).sort(),
      availableDirectories: Array.from(directoriesSet).sort(),
      availableExtensions: Array.from(extensionsSet).sort(),
    };
  }, [data]);

  return {
    entries: (data?.items ?? []) as FileChangeEntry[],
    lastTimestamp: data?.last_timestamp,
    availableAgents,
    availableDirectories,
    availableExtensions,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

/**
 * ファイル変更フィルターリングフック。
 *
 * @param entries - ファイル変更エントリ配列
 * @param filter - フィルター条件
 * @returns フィルタ適用後のエントリ配列
 */
export function useFilteredFileChanges(
  entries: FileChangeEntry[],
  filter: FileChangeFilter
): FileChangeEntry[] {
  return useMemo(() => {
    let filtered = [...entries];

    // 操作種別でフィルタ
    if (filter.operations.length > 0) {
      filtered = filtered.filter((entry) =>
        filter.operations.includes(entry.file.operation)
      );
    }

    // ディレクトリでフィルタ
    if (filter.directories.length > 0) {
      filtered = filtered.filter((entry) =>
        filter.directories.some((dir) => entry.file.path.startsWith(`${dir}/`))
      );
    }

    // 拡張子でフィルタ
    if (filter.extensions.length > 0) {
      filtered = filtered.filter((entry) =>
        filter.extensions.some((ext) => entry.file.path.endsWith(`.${ext}`))
      );
    }

    // エージェントでフィルタ
    if (filter.agents.length > 0) {
      filtered = filtered.filter((entry) =>
        entry.agent && filter.agents.includes(entry.agent)
      );
    }

    // 新しい順にソート
    return filtered.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [entries, filter]);
}
