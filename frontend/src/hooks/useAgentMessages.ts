import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { InboxMessage } from './useInbox';

/**
 * 特定エージェントのインボックスメッセージを取得・管理するカスタムフック。
 *
 * React Query を使用して /api/teams/{teamName}/inboxes/{agentName} エンドポイントから
 * エージェント別メッセージを取得し、設定された間隔でポーリングします。
 * ダッシュボードストアからポーリング間隔を取得し、自動的にデータを更新します。
 *
 * @param teamName - チーム名（必須）
 * @param agentName - エージェント名（必須）
 * @returns messages - インボックスメッセージ配列
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 *
 * 
 */
export function useAgentMessages(teamName: string, agentName: string) {
  const messagesInterval = useDashboardStore((state) => state.messagesInterval);

  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ['inbox', teamName, agentName],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamName}/inboxes/${agentName}`);
      if (!response.ok) throw new Error('Failed to fetch agent messages');
      return response.json() as Promise<InboxMessage[]>;
    },
    refetchInterval: messagesInterval,
    enabled: !!teamName && !!agentName,
    staleTime: 0,
  });

  return {
    messages,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
