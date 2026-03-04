/**
 * ExpandedAgentCard コンポーネントの単体テスト。
 *
 * TC-008: 拡張エージェントカードテスト
 *
 * テストケース:
 * - TC-008-01: プログレスバー表示
 * - TC-008-02: idleステータス
 * - TC-008-03: workingステータス
 * - TC-008-04: waitingステータス
 * - TC-008-05: errorステータス
 * - TC-008-06: completedステータス
 * - TC-008-07: activeForm表示
 * - TC-008-08: 経過時間表示
 * - TC-008-09: モデル名表示
 * - TC-008-10: 関連ファイル一覧
 */
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/setup.tsx'
import { ExpandedAgentCard } from '../ExpandedAgentCard'
import type { AgentStatus } from '@/types/agent'

const mockAgent: AgentStatus = {
  agentId: 'test-agent',
  name: 'test-agent',
  status: 'idle',
  progress: 0,
  model: 'claude-opus-4-6',
  color: '#f59e0b',
  lastActivityAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  currentTaskId: '1',
  currentTaskSubject: 'テストタスク',
  activeForm: '実装中',
  assignedTasks: ['1', '2', '3'],
  completedTasks: ['1'],
  touchedFiles: ['/path/to/file1.py', '/path/to/file2.ts']
}

describe('ExpandedAgentCard', () => {
  describe('TC-008-01: プログレスバー表示', () => {
    it('進捗75%のプログレスバーを表示する', () => {
      const agentWithProgress: AgentStatus = {
        ...mockAgent,
        assignedTasks: ['1', '2', '3', '4'],
        completedTasks: ['1', '2', '3']
      }
      render(<ExpandedAgentCard agent={agentWithProgress} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('進捗0%のプログレスバーを表示する', () => {
      const agent0: AgentStatus = {
        ...mockAgent,
        assignedTasks: [],
        completedTasks: []
      }
      render(<ExpandedAgentCard agent={agent0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('進捗100%のプログレスバーを表示する', () => {
      const agent100: AgentStatus = {
        ...mockAgent,
        assignedTasks: ['1', '2'],
        completedTasks: ['1', '2']
      }
      render(<ExpandedAgentCard agent={agent100} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('TC-008-02: idleステータス', () => {
    it('idleステータスを表示する', () => {
      const agentIdle: AgentStatus = { ...mockAgent, status: 'idle' }
      render(<ExpandedAgentCard agent={agentIdle} />)

      expect(screen.getByText('💤')).toBeInTheDocument()
      expect(screen.getByText('待機中')).toBeInTheDocument()
    })
  })

  describe('TC-008-03: workingステータス', () => {
    it('workingステータスを表示する', () => {
      const agentWorking: AgentStatus = { ...mockAgent, status: 'working' }
      render(<ExpandedAgentCard agent={agentWorking} />)

      expect(screen.getByText('🔵')).toBeInTheDocument()
      expect(screen.getByText('作業中')).toBeInTheDocument()
    })
  })

  describe('TC-008-04: waitingステータス', () => {
    it('waitingステータスを表示する', () => {
      const agentWaiting: AgentStatus = { ...mockAgent, status: 'waiting' }
      render(<ExpandedAgentCard agent={agentWaiting} />)

      expect(screen.getByText('⏳')).toBeInTheDocument()
      expect(screen.getByText('待機中')).toBeInTheDocument()
    })
  })

  describe('TC-008-05: errorステータス', () => {
    it('errorステータスを表示する', () => {
      const agentError: AgentStatus = { ...mockAgent, status: 'error' }
      render(<ExpandedAgentCard agent={agentError} />)

      expect(screen.getByText('❌')).toBeInTheDocument()
      expect(screen.getByText('エラー')).toBeInTheDocument()
    })
  })

  describe('TC-008-06: completedステータス', () => {
    it('completedステータスを表示する', () => {
      const agentCompleted: AgentStatus = {
        ...mockAgent,
        status: 'completed',
        progress: 100,
        assignedTasks: ['1', '2'],
        completedTasks: ['1', '2']
      }
      render(<ExpandedAgentCard agent={agentCompleted} />)

      expect(screen.getAllByText('✅')).toHaveLength(2)
      expect(screen.getByText('完了')).toBeInTheDocument()
    })
  })

  describe('TC-008-07: activeForm表示', () => {
    it('activeFormを表示する', () => {
      const agentWithActiveForm: AgentStatus = {
        ...mockAgent,
        activeForm: '実装中'
      }
      render(<ExpandedAgentCard agent={agentWithActiveForm} />)

      expect(screen.getByText('🔄')).toBeInTheDocument()
      expect(screen.getByText('実装中')).toBeInTheDocument()
    })

    it('activeFormがない場合、現在のタスクのみ表示', () => {
      const agentWithoutActiveForm: AgentStatus = {
        ...mockAgent,
        activeForm: undefined
      }
      render(<ExpandedAgentCard agent={agentWithoutActiveForm} />)

      expect(screen.queryByText('🔄')).not.toBeInTheDocument()
    })
  })

  describe('TC-008-08: 経過時間表示', () => {
    it('相対時間を表示する（5分前）', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const agentWithTime: AgentStatus = {
        ...mockAgent,
        lastActivityAt: fiveMinutesAgo
      }
      render(<ExpandedAgentCard agent={agentWithTime} />)

      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument()
    })
  })

  describe('TC-008-09: モデル名表示', () => {
    it('モデル名バッジを表示する', () => {
      const agentWithModel: AgentStatus = {
        ...mockAgent,
        model: 'claude-opus-4-6'
      }
      render(<ExpandedAgentCard agent={agentWithModel} />)

      expect(screen.getByText('claude-opus-4-6')).toBeInTheDocument()
    })

    it('モデル名がunknownの場合、表示する', () => {
      const agentWithUnknownModel: AgentStatus = {
        ...mockAgent,
        model: 'unknown'
      }
      render(<ExpandedAgentCard agent={agentWithUnknownModel} />)

      expect(screen.getByText('unknown')).toBeInTheDocument()
    })
  })

  describe('TC-008-10: 関連ファイル一覧', () => {
    it('関連ファイルを表示する', () => {
      const agentWithFiles: AgentStatus = {
        ...mockAgent,
        touchedFiles: ['/path/to/file1.py', '/path/to/file2.ts']
      }
      render(<ExpandedAgentCard agent={agentWithFiles} />)

      expect(screen.getByText(/関連ファイル.*2/)).toBeInTheDocument()
    })

    it('ファイルが10件を超える場合、省略表示', () => {
      const manyFiles = Array.from({ length: 15 }, (_, i) => `/path/to/file${i}.py`)
      const agentWithManyFiles: AgentStatus = {
        ...mockAgent,
        touchedFiles: manyFiles
      }
      render(<ExpandedAgentCard agent={agentWithManyFiles} />)

      expect(screen.getByText(/他.*件/)).toBeInTheDocument()
    })

    it('ファイルがない場合、関連ファイルセクションを表示しない', () => {
      const agentWithoutFiles: AgentStatus = {
        ...mockAgent,
        touchedFiles: []
      }
      render(<ExpandedAgentCard agent={agentWithoutFiles} />)

      expect(screen.queryByText(/関連ファイル/)).not.toBeInTheDocument()
    })
  })

  describe('タスク統計', () => {
    it('担当タスク数と完了タスク数を表示する', () => {
      const agentWithTasks: AgentStatus = {
        ...mockAgent,
        assignedTasks: ['1', '2', '3'],
        completedTasks: ['1']
      }
      render(<ExpandedAgentCard agent={agentWithTasks} />)

      expect(screen.getByText(/担当: 3件/)).toBeInTheDocument()
      expect(screen.getByText(/完了: 1件/)).toBeInTheDocument()
    })
  })
})
