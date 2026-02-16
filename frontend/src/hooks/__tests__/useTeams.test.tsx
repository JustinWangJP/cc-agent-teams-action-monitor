/**
 * useTeams フックの単体テスト。
 *
 * T-HK-001: データ取得
 * T-HK-002: ローディング状態
 *
*/
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTeams, useTeam } from '../useTeams'

// fetch のモック
global.fetch = vi.fn()

const mockTeamsResponse = [
  {
    name: 'team1',
    description: 'Team 1',
    memberCount: 3,
    status: 'active',
    lastActivity: '2025-01-15T10:30:00Z',
    leadAgentId: 'agent1@anthropic'
  },
  {
    name: 'team2',
    memberCount: 2,
    status: 'inactive',
    leadAgentId: 'agent2@anthropic'
  }
]

describe('useTeams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('T-HK-001: データ取得', () => {
    it('チーム一覧を取得して teams を更新する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamsResponse
      } as Response)

      const { result } = renderHook(() => useTeams())

      await waitFor(() => {
        expect(result.current.teams).toEqual(mockTeamsResponse)
      })
    })

    it('refetch 関数で再取得できる', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTeamsResponse
      } as Response)

      const { result } = renderHook(() => useTeams())

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

      const { result } = renderHook(() => useTeams())

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

      const { result } = renderHook(() => useTeams())

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch teams')
      })
    })

    it('ネットワークエラー時に error を設定する', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTeams())

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })
  })
})

describe('useTeam', () => {
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

    const { result } = renderHook(() => useTeam('team1'))

    await waitFor(() => {
      expect(result.current.team).toEqual(mockTeam)
    })
  })

  it('teamName が空の場合、API呼び出しを行わない', async () => {
    const { result } = renderHook(() => useTeam(''))

    await waitFor(() => {
      expect(result.current.team).toBeNull()
    })

    expect(fetch).not.toHaveBeenCalled()
  })
})
