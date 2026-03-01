import { QueryClient } from '@tanstack/react-query'

/**
 * React Query の QueryClient インスタンス
 * アプリケーション全体でキャッシュとクエリ設定を一元管理
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30秒間はデータを新鲜とみなす（ポーリング間隔と合わせる）
      staleTime: 1000 * 30,
      // 5分間キャッシュを保持
      gcTime: 1000 * 60 * 5,
      // エラー時は1回のみリトライ
      retry: 1,
      // ウィンドウフォーカス時の再フェッチを有効
      refetchOnWindowFocus: true,
    },
  },
})
