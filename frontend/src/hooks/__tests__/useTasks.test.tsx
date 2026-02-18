/**
 * useTasks フックの単体テスト（React Query版）。
 *
 * T-HK-003: データ取得
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTasks, useTeamTasks } from '../useTasks'

global.fetch = vi.fn()

const mockTasksResponse = [
  {
    id: '1',
    subject: 'Task 1',
    status: 'pending' as const,
    owner: 'agent1',
    blockedCount: 0,
    teamName: 'team1'
  },
  {
    id: '2',
    subject: 'Task 2',
    status: 'completed' as const,
    owner: 'agent2',
    blockedCount: 1,
    teamName: 'team1'
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

describe('useTasks (React Query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('T-HK-003: データ取得', () => {
    it('タスク一覧を取得して tasks を更新する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksResponse
      } as Response)

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.tasks).toEqual(mockTasksResponse)
      })
    })

    it('refetch 関数で再取得できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksResponse
      } as Response)

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(2)
      })

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockTasksResponse[0]]
      } as Response)

      await result.current.refetch()

      await waitFor(() => {
        expect(result.current.tasks.length).toBe(1)
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('APIエラー時に error を設定する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response)

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch tasks')
      })
    })

    it('ネットワークエラー時に error を設定する', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTasks(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })
  })
})

describe('useTeamTasks (React Query)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('特定チームのタスクを取得する', async () => {
    const mockTeamTasks = [
      {
        id: '1',
        subject: 'Team Task 1',
        description: 'Description',
        activeForm: 'Processing',
        status: 'in_progress' as const,
        owner: 'agent1',
        blocks: [],
        blockedBy: [],
        teamName: 'team1'
      }
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamTasks
    } as Response)

    const { result } = renderHook(() => useTeamTasks('team1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTeamTasks)
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/tasks/team/team1'
    )
  })

  it('teamName が空の場合、API呼び出しを行わない', async () => {
    const { result } = renderHook(() => useTeamTasks(''), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.tasks).toEqual([])
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})
