/**
 * ExpandedTaskCard コンポーネントの単体テスト。
 *
 * TC-009: タスク進捗トラッキングテスト
 *
 * テストケース:
 * - TC-009-01: 進捗バー表示
 * - TC-009-02: activeForm表示
 * - TC-009-03: blockedBy表示
 * - TC-009-04: blocks表示
 * - TC-009-05: 依存関係パスハイライト
 * - TC-009-06: 関連ファイル表示
 * - TC-009-07: タイムライン連携
 * - TC-009-08: ステータス色分け
 * - TC-009-09: 完了タスク
 * - TC-009-10: 担当者リンク
 */
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/setup.tsx'
import { ExpandedTaskCard } from '../ExpandedTaskCard'
import type { TaskWithProgress } from '@/types/task'

const mockTask: TaskWithProgress = {
  id: '1',
  subject: 'テストタスク',
  status: 'in_progress',
  activeForm: '実装中',
  progress: 60,
  owner: 'test-agent',
  teamName: 'test-team',
  relatedFiles: ['/path/to/file1.py', '/path/to/file2.ts'],
  startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  blocks: ['3'],
  blockedBy: [],
  blockedCount: 0
}

describe('ExpandedTaskCard', () => {
  describe('TC-009-01: 進捗バー表示', () => {
    it('進捗60%のプログレスバーを表示する', () => {
      render(<ExpandedTaskCard task={mockTask} />)

      expect(screen.getByText('60%')).toBeInTheDocument()
    })

    it('進捗0%のプログレスバーを表示する', () => {
      const task0: TaskWithProgress = { ...mockTask, progress: 0 }
      render(<ExpandedTaskCard task={task0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('進捗100%のプログレスバーを表示する', () => {
      const task100: TaskWithProgress = { ...mockTask, progress: 100 }
      render(<ExpandedTaskCard task={task100} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('TC-009-02: activeForm表示', () => {
    it('activeFormを表示する', () => {
      render(<ExpandedTaskCard task={mockTask} />)

      expect(screen.getByText('🔄 進行中の作業')).toBeInTheDocument()
      expect(screen.getByText('実装中')).toBeInTheDocument()
    })

    it('activeFormがない場合、進行中の作業セクションを表示しない', () => {
      const taskWithoutActiveForm: TaskWithProgress = {
        ...mockTask,
        activeForm: ''
      }
      render(<ExpandedTaskCard task={taskWithoutActiveForm} />)

      expect(screen.queryByText('🔄 進行中の作業')).not.toBeInTheDocument()
    })
  })

  describe('TC-009-03: blockedBy表示', () => {
    it('blockedByタスクを表示する', () => {
      const taskBlocked: TaskWithProgress = {
        ...mockTask,
        blockedBy: ['2', '4']
      }
      render(<ExpandedTaskCard task={taskBlocked} />)

      expect(screen.getByText('🔗 依存関係')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText('#4')).toBeInTheDocument()
    })
  })

  describe('TC-009-04: blocks表示', () => {
    it('blocksタスクを表示する', () => {
      const taskBlocking: TaskWithProgress = {
        ...mockTask,
        blocks: ['4', '5']
      }
      render(<ExpandedTaskCard task={taskBlocking} />)

      expect(screen.getByText('🔗 依存関係')).toBeInTheDocument()
      expect(screen.getByText('#4')).toBeInTheDocument()
      expect(screen.getByText('#5')).toBeInTheDocument()
    })
  })

  describe('TC-009-06: 関連ファイル表示', () => {
    it('関連ファイルを表示する', () => {
      render(<ExpandedTaskCard task={mockTask} />)

      expect(screen.getByText(/関連ファイル.*2/)).toBeInTheDocument()
    })

    it('ファイルが10件を超える場合、省略表示', () => {
      const manyFiles = Array.from({ length: 15 }, (_, i) => `/path/to/file${i}.py`)
      const taskWithManyFiles: TaskWithProgress = {
        ...mockTask,
        relatedFiles: manyFiles
      }
      render(<ExpandedTaskCard task={taskWithManyFiles} />)

      expect(screen.getByText(/他.*件/)).toBeInTheDocument()
    })

    it('ファイルがない場合、関連ファイルセクションを表示しない', () => {
      const taskWithoutFiles: TaskWithProgress = {
        ...mockTask,
        relatedFiles: []
      }
      render(<ExpandedTaskCard task={taskWithoutFiles} />)

      expect(screen.queryByText(/関連ファイル/)).not.toBeInTheDocument()
    })
  })

  describe('TC-009-07: タイムライン連携', () => {
    it('タイムラインボタンクリックでonTimelineFilterを呼び出す', () => {
      const handleTimelineFilter = vi.fn()
      render(
        <ExpandedTaskCard
          task={mockTask}
          onTimelineFilter={handleTimelineFilter}
        />
      )

      const button = screen.getByTitle(/タイムラインでこのタスクに関連するアクティビティを表示/)
      button.click()

      expect(handleTimelineFilter).toHaveBeenCalledWith('1')
    })
  })

  describe('TC-009-08: ステータス色分け', () => {
    it('pending: ステータス表示', () => {
      render(<ExpandedTaskCard task={{ ...mockTask, status: 'pending' }} />)
      // 翻訳されたテキスト（日本語）を確認
      expect(screen.getByText('未着手')).toBeInTheDocument()
    })

    it('in_progress: ステータス表示', () => {
      render(<ExpandedTaskCard task={{ ...mockTask, status: 'in_progress' }} />)
      // 翻訳されたテキスト（日本語）を確認
      expect(screen.getByText('進行中')).toBeInTheDocument()
    })

    it('completed: ステータス表示', () => {
      render(<ExpandedTaskCard task={{ ...mockTask, status: 'completed' }} />)
      // 翻訳されたテキスト（日本語）を確認
      expect(screen.getByText('完了')).toBeInTheDocument()
    })
  })

  describe('TC-009-09: 完了タスク', () => {
    it('完了タスクは100%プログレスバー', () => {
      const completedTask: TaskWithProgress = {
        ...mockTask,
        status: 'completed',
        progress: 100
      }
      render(<ExpandedTaskCard task={completedTask} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('TC-009-10: 担当者リンク', () => {
    it('担当者を表示する', () => {
      render(<ExpandedTaskCard task={mockTask} enableOwnerLink={true} />)

      expect(screen.getByText('test-agent')).toBeInTheDocument()
    })
  })

  describe('依存関係の表示', () => {
    it('blockedCountが0の場合、ブロック表示を省略', () => {
      const taskNotBlocked: TaskWithProgress = {
        ...mockTask,
        blockedBy: [],
        blocks: []
      }
      render(<ExpandedTaskCard task={taskNotBlocked} />)

      expect(screen.queryByText(/Blocked by/)).not.toBeInTheDocument()
    })
  })
})
