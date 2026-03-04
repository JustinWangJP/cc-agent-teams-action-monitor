/**
 * TeamCard コンポーネントの単体テスト。
 *
 * T-CMP-004: チームカード表示
 * T-CMP-005: クリックイベント
 *
*/
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/test/setup.tsx'
import { TeamCard } from '../TeamCard'
import type { TeamSummary } from '@/types/team'

const mockTeam: TeamSummary = {
  name: 'test-team',
  description: 'Test team description',
  memberCount: 3,
  taskCount: 5,
  status: 'active',
  lastActivity: '2025-01-15T10:30:00Z',
  leadAgentId: 'claude-sonnet-4@anthropic'
}

describe('TeamCard', () => {
  describe('T-CMP-004: チームカード表示', () => {
    it('チーム名を表示する', () => {
      render(<TeamCard team={mockTeam} />)
      expect(screen.getByText('test-team')).toBeInTheDocument()
    })

    it('説明文を表示する', () => {
      render(<TeamCard team={mockTeam} />)
      expect(screen.getByText('Test team description')).toBeInTheDocument()
    })

    it('メンバー数を表示する', () => {
      render(<TeamCard team={mockTeam} />)
      // コンポーネントは数字のみを表示（"members"テキストなし）
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('リードエージェントIDを表示する', () => {
      render(<TeamCard team={mockTeam} />)
      expect(screen.getByText('claude-sonnet-4')).toBeInTheDocument()
    })

    it('説明がない場合、説明要素をレンダリングしない', () => {
      const teamWithoutDesc: TeamSummary = {
        ...mockTeam,
        description: undefined
      }
      const { container } = render(<TeamCard team={teamWithoutDesc} />)
      const descElement = container.querySelector('.text-sm.text-gray-600.mb-3')
      expect(descElement).not.toBeInTheDocument()
    })
  })

  describe('T-CMP-005: クリックイベント', () => {
    it('onClickハンドラーを呼び出す', () => {
      const handleClick = vi.fn()
      const { container } = render(<TeamCard team={mockTeam} onClick={handleClick} />)
      const card = container.querySelector('.bg-white.rounded-lg')

      expect(card).toBeInTheDocument()
      fireEvent.click(card!)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('onClick未指定時、クリック可能なカーソルスタイルを維持', () => {
      const { container } = render(<TeamCard team={mockTeam} />)
      const card = container.querySelector('.bg-white.rounded-lg')
      expect(card).toHaveClass('cursor-pointer')
    })
  })

  describe('ステータスバッジ表示', () => {
    it('activeステータスのバッジを表示', () => {
      render(<TeamCard team={mockTeam} />)
      // i18n対応により日本語で表示される
      expect(screen.getByText('アクティブ')).toBeInTheDocument()
    })

    it('inactiveステータスのバッジを表示', () => {
      const inactiveTeam: TeamSummary = { ...mockTeam, status: 'inactive' }
      render(<TeamCard team={inactiveTeam} />)
      // i18n対応により日本語で表示される
      expect(screen.getByText('非アクティブ')).toBeInTheDocument()
    })
  })
})
