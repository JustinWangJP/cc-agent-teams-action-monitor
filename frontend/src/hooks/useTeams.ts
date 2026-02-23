import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Team, TeamSummary } from '@/types/team';
import { useDashboardStore } from '@/stores/dashboardStore';
import toast from 'react-hot-toast';

/**
 * チーム削除のレスポンス型
 */
interface DeleteTeamResponse {
  message: string;
  deletedPaths: string[];
}

/**
 * 全チーム一覧を取得・管理するカスタムフック（React Query版）。
 *
 * /api/teams エンドポイントからチーム一覧を取得し、
 * 設定された間隔でポーリングします。
 *
 * @returns teams - チームサマリー配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 */
export function useTeams() {
  const teamsInterval = useDashboardStore((state) => state.teamsInterval);

  const { data: teams = [], isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams/');
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json() as Promise<TeamSummary[]>;
    },
    refetchInterval: teamsInterval,
    staleTime: 0,
  });

  return {
    teams,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    dataUpdatedAt,
  };
}

/**
 * 特定チームの詳細を取得・管理するカスタムフック（React Query版）。
 *
 * /api/teams/{teamName} エンドポイントからチーム詳細を取得します。
 * チーム名が変更されると自動的に再取得します。
 *
 * @param teamName - 取得対象のチーム名
 * @returns team - チーム詳細データ（null 可能）
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 */
export function useTeam(teamName: string) {
  const { data: team = null, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['team', teamName],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamName}`);
      if (!response.ok) throw new Error('Failed to fetch team');
      return response.json() as Promise<Team>;
    },
    enabled: !!teamName,
    staleTime: 0,
  });

  return {
    team,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    dataUpdatedAt,
  };
}

/**
 * チームを削除するカスタムフック（React Query版）。
 *
 * /api/teams/{teamName} エンドポイントに DELETE リクエストを送信し、
 * stopped 状態のチームと関連ファイルを削除します。
 *
 * @returns mutate - 削除実行関数
 * @returns isPending - 削除処理中フラグ
 * @returns error - エラーメッセージ（null 可能）
 */
export function useDeleteTeam() {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (teamName: string) => {
      const response = await fetch(`/api/teams/${teamName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'チームの削除に失敗しました');
      }

      return response.json() as Promise<DeleteTeamResponse>;
    },
    onSuccess: (data) => {
      // チーム一覧を再取得してキャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    deleteTeam: mutate,
    isDeleting: isPending,
    error: error?.message || null,
  };
}
