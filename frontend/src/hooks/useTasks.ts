import { useQuery } from '@tanstack/react-query';
import { Task, TaskSummary } from '@/types/task';
import { useDashboardStore } from '@/stores/dashboardStore';

/**
 * 全タスク一覧を取得・管理するカスタムフック（React Query版）。
 *
 * /api/tasks エンドポイントからタスク一覧を取得し、
 * 設定された間隔でポーリングします。
 *
 * @returns tasks - タスクサマリー配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 */
export function useTasks() {
  const tasksInterval = useDashboardStore((state) => state.tasksInterval);

  const { data: tasks = [], isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json() as Promise<TaskSummary[]>;
    },
    refetchInterval: tasksInterval,
    staleTime: 0,
  });

  return {
    tasks,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    dataUpdatedAt,
  };
}

/**
 * 特定チームのタスク一覧を取得・管理するカスタムフック（React Query版）。
 *
 * /api/tasks/team/{teamName} エンドポイントからチーム別タスクを取得します。
 * チーム名が変更されると自動的に再取得します。
 *
 * @param teamName - 取得対象のチーム名
 * @returns tasks - タスク詳細配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 */
export function useTeamTasks(teamName: string) {
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['tasks', 'team', teamName],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/team/${teamName}`);
      if (!response.ok) throw new Error('Failed to fetch team tasks');
      return response.json() as Promise<Task[]>;
    },
    enabled: !!teamName,
    refetchInterval: messagesInterval,
    staleTime: 0,
  });

  return {
    tasks,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
