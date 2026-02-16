/**
 * TaskCard コンポーネントの単体テスト。
 *
 * T-CMP-006: タスクカード表示
 *
 * @
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
import type { TaskSummary } from '@/types/task'

const mockTask: TaskSummary = {
  id: '1',
  subject: 'Test Task',
  status: 'pending',
  owner: 'test-agent',
  blockedCount: 2,
  teamName: 'test-team'
}

describe('TaskCard', () => {
  describe('T-CMP-006: タスクカード表示', () => {
    it('タスク件名を表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('Test Task')).toBeInTheDocument()
    })

    it('タスクIDを表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('チーム名を表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('test-team')).toBeInTheDocument()
    })

    it('担当者を表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText(/Owner: test-agent/)).toBeInTheDocument()
    })

    it('ブロックされているタスク数を表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText(/Blocked by 2/)).toBeInTheDocument()
    })

    it('ステータスバッジを表示する', () => {
      render(<TaskCard task={mockTask} />)
      expect(screen.getByText('pending')).toBeInTheDocument()
    })
  })

  describe('ステータス別のボーダーカラー', () => {
    it('pending: 灰色ボーダー', () => {
      const { container } = render(<TaskCard task={{ ...mockTask, status: 'pending' }} />)
      expect(container.querySelector('.border-l-gray-400')).toBeInTheDocument()
    })

    it('in_progress: 青色ボーダー', () => {
      const { container } = render(<TaskCard task={{ ...mockTask, status: 'in_progress' }} />)
      expect(container.querySelector('.border-l-blue-500')).toBeInTheDocument()
    })

    it('completed: 緑色ボーダー', () => {
      const { container } = render(<TaskCard task={{ ...mockTask, status: 'completed' }} />)
      expect(container.querySelector('.border-l-green-500')).toBeInTheDocument()
    })

    it('deleted: 赤色ボーダー', () => {
      const { container } = render(<TaskCard task={{ ...mockTask, status: 'deleted' }} />)
      expect(container.querySelector('.border-l-red-500')).toBeInTheDocument()
    })
  })

  describe('オプションプロパティ', () => {
    it('teamNameがない場合、チーム名を表示しない', () => {
      const taskWithoutTeam: TaskSummary = {
        ...mockTask,
        teamName: undefined
      }
      const { container } = render(<TaskCard task={taskWithoutTeam} />)
      expect(container.querySelector('.text-primary-600')).not.toBeInTheDocument()
    })

    it('ownerがない場合、オーナー表示を省略', () => {
      const taskWithoutOwner: TaskSummary = {
        ...mockTask,
        owner: undefined
      }
      const { container } = render(<TaskCard task={taskWithoutOwner} />)
      expect(screen.queryByText(/Owner:/)).not.toBeInTheDocument()
    })

    it('blockedCountが0の場合、ブロック表示を省略', () => {
      const taskNotBlocked: TaskSummary = {
        ...mockTask,
        blockedCount: 0
      }
      const { container } = render(<TaskCard task={taskNotBlocked} />)
      expect(container.querySelector('.text-amber-600')).not.toBeInTheDocument()
    })
  })
})
