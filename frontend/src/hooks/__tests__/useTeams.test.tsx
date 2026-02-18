/**
 * useTeams フックの単体テスト（React Query版）。
 *
 * T-HK-001: データ取得
 * T-HK-002: ローディング状態
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTeams, useTeam } from '../useTeams'

// fetch のモック
global.fetch = vi.fn()

const mockTeamsResponse = [
  {
    name: 'team1',
    description: 'Team 1',
    memberCount: 3,
    taskCount: 5,
    status: 'active',
    lastActivity: '2025-01-15T10:30:00Z',
    leadAgentId: 'agent1@anthropic'
  },
  {
    name: 'team2',
    memberCount: 2,
    taskCount: 3,
    status: 'inactive',
    leadAgentId: 'agent2@anthropic'
  }
]

// Zustand Store のモック
vi.mock('../stores/dashboardStore', () => ({
  useDashboardStore: vi.fn((selector) => {
    const state = {
      teamsInterval: 30000,
      tasksInterval: 30000,
      inboxInterval: 30000,
      messagesInterval: 30000,
    }
    return selector ? selector(state) : state
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTeams (React Query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('T-HK-001: データ取得', () => {
    it('チーム一覧を取得して teams を更新する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamsResponse
      } as Response)

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.teams).toEqual(mockTeamsResponse)
      })
    })

    it('refetch 関数で再取得できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamsResponse
      } as Response)

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.teams.length).toBe(2)
      })

      // 2回目の取得
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTeamsResponse[0]]
      } as Response)

      await result.current.refetch()

      await waitFor(() => {
        expect(result.current.teams.length).toBe(1)
      })
    })
  })

  describe('T-HK-002: ローディング状態', () => {
    it('初期状態で loading=true、完了後に loading=false', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTeamsResponse
      } as Response)

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('APIエラー時に error を設定する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response)

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch teams')
      })
    })

    it('ネットワークエラー時に error を設定する', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTeams(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })
  })
})

describe('useTeam (React Query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('特定のチーム詳細を取得する', async () => {
    const mockTeam = {
      name: 'team1',
      description: 'Team 1',
      createdAt: 1705300200000,
      leadAgentId: 'agent1@anthropic',
      members: []
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeam
    } as Response)

    const { result } = renderHook(() => useTeam('team1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.team).toEqual(mockTeam)
    })
  })

  it('teamName が空の場合、API呼び出しを行わない', async () => {
    const { result } = renderHook(() => useTeam(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.team).toBeNull()
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})
