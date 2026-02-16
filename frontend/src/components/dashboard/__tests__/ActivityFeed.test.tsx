/**
 * ActivityFeed コンポーネントの単体テスト。
 *
 * T-CMP-007: フィード表示
 *
 * @
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityFeed } from '../ActivityFeed'

const mockActivities = [
  {
    id: '1',
    type: 'task_update',
    message: 'Task completed',
    timestamp: '2025-01-15T10:30:00Z',
    agent: 'test-agent'
  },
  {
    id: '2',
    type: 'team_update',
    message: 'New member joined',
    timestamp: '2025-01-15T09:00:00Z',
    agent: 'lead-agent'
  }
]

describe('ActivityFeed', () => {
  describe('T-CMP-007: フィード表示', () => {
    it('アクティビティリストをレンダリングする', () => {
      render(<ActivityFeed activities={mockActivities} />)
      expect(screen.getByText('Task completed')).toBeInTheDocument()
      expect(screen.getByText('New member joined')).toBeInTheDocument()
    })

    it('空の配列の場合、メッセージを表示する', () => {
      render(<ActivityFeed activities={[]} />)
      expect(screen.getByText(/no activity/i)).toBeInTheDocument()
    })

    it('各アクティビティのタイムスタンプを表示する', () => {
      render(<ActivityFeed activities={mockActivities} />)
      // 相対時間表示が含まれることを確認
      const timestamps = screen.getAllByText(/\d+:\d+/)
      expect(timestamps.length).toBeGreaterThan(0)
    })
  })
})
