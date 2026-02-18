import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';

/**
 * インボックスメッセージの型定義。
 */
export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
  content: unknown;
  summary?: string;
  status?: 'unread' | 'read';
}

/**
 * チーム全体のインボックス（エージェント別）。
 */
export interface TeamInbox {
  [agentName: string]: InboxMessage[];
}

/**
 * チーム全体のインボックスメッセージを取得・管理するカスタムフック。
 *
 * React Query を使用して /api/teams/{teamName}/inboxes エンドポイントから
 * インボックスメッセージを取得し、設定された間隔でポーリングします。
 * API はエージェント別のメッセージ配列を返します（TeamInbox 型）。
 * 便宜上、全メッセージのフラット配列も提供します。
 *
 * @param teamName - 取得対象のチーム名
 * @returns inbox - エージェント別のメッセージマップ（TeamInbox）
 * @returns messages - 全メッセージのフラット配列（InboxMessage[]）
 * @returns loading - ローディング状態
 * @returns error - エラーメッセージ（null 可能）
 * @returns refetch - 手動再取得関数
 *
 * 
 */
export function useInbox(teamName: string) {
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);

  const { data: inbox = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['inbox', teamName],
    queryFn: async () => {
      const response = await fetch(`/api/teams/${teamName}/inboxes`);
      if (!response.ok) throw new Error('Failed to fetch inbox');
      return response.json() as Promise<TeamInbox>;
    },
    refetchInterval: inboxInterval,
    enabled: !!teamName,
    staleTime: 0,
  });

  // 便宜上、全メッセージのフラット配列も提供
  const allMessages = useMemo(() => {
    return Object.values(inbox).flat();
  }, [inbox]);

  return {
    inbox,              // TeamInbox (Record<string, InboxMessage[]>)
    messages: allMessages,  // InboxMessage[] (フラット)
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
