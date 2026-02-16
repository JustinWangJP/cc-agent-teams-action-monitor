/**
 * useTasks フックの単体テスト。
 *
 * T-HK-003: データ取得
 *
 * @
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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

describe('useTasks', () => {
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

      const { result } = renderHook(() => useTasks())

      await waitFor(() => {
        expect(result.current.tasks).toEqual(mockTasksResponse)
      })
    })

    it('refetch 関数で再取得できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasksResponse
      } as Response)

      const { result } = renderHook(() => useTasks())

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

  describe('ポーリング', () => {
    it('10秒間隔でポーリングする', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: async () => mockTasksResponse
        } as Response)
      })

      renderHook(() => useTasks())

      // 初期呼び出し
      await waitFor(() => {
        expect(callCount).toBe(1)
      })

      // 10秒後に2回目の呼び出し
      vi.advanceTimersByTime(10000)
      await waitFor(() => {
        expect(callCount).toBe(2)
      })
    })

    it('アンマウント時にポーリングを停止する', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTasksResponse
      } as Response)

      const { unmount } = renderHook(() => useTasks())

      unmount()

      vi.advanceTimersByTime(10000)

      // unmount後は追加の呼び出しがないことを確認
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    })
  })
})

describe('useTeamTasks', () => {
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

    const { result } = renderHook(() => useTeamTasks('team1'))

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTeamTasks)
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/tasks/team/team1'
    )
  })

  it('teamName が空の場合、API呼び出しを行わない', async () => {
    const { result } = renderHook(() => useTeamTasks(''))

    await waitFor(() => {
      expect(result.current.tasks).toEqual([])
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})
