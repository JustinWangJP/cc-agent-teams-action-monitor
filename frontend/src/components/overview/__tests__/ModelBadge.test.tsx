/**
 * ModelBadge コンポーネントの単体テスト。
 *
 * T-CMP-MB-001: Claude Opus 4.6 モデル表示
 * T-CMP-MB-002: Claude Sonnet 4.5 モデル表示
 * T-CMP-MB-003: Claude Haiku 4.5 モデル表示
 * T-CMP-MB-004: Kimi K2.5 モデル表示
 * T-CMP-MB-005: GLM-5 モデル表示
 * T-CMP-MB-006: 未知のモデル（デフォルト）表示
 * T-CMP-MB-007: カウント表示機能
 * T-CMP-MB-008: サイズバリエーション
 * T-CMP-MB-009: ModelBadgeGroup グループ表示
 *
 * @
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModelBadge, ModelBadgeGroup } from '../ModelBadge'

describe('ModelBadge', () => {
  describe('T-CMP-MB-001: Claude Opus 4.6', () => {
    it('紫のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.backgroundColor).toBe('rgba(139, 92, 246, 0.2)') // violet-500 with opacity
    })

    it('🟣 アイコンを表示する', () => {
      render(<ModelBadge model="claude-opus-4-6" />)
      expect(screen.getByText('🟣')).toBeInTheDocument()
    })

    it('"Opus 4.6" ラベルを表示する', () => {
      render(<ModelBadge model="claude-opus-4-6" />)
      expect(screen.getByText('Opus 4.6')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-002: Claude Sonnet 4.5', () => {
    it('青のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="claude-sonnet-4-5" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.color).toBe('rgb(59, 130, 246)') // blue-500
    })

    it('🔵 アイコンを表示する', () => {
      render(<ModelBadge model="claude-sonnet-4-5" />)
      expect(screen.getByText('🔵')).toBeInTheDocument()
    })

    it('"Sonnet 4.5" ラベルを表示する', () => {
      render(<ModelBadge model="claude-sonnet-4-5" />)
      expect(screen.getByText('Sonnet 4.5')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-003: Claude Haiku 4.5', () => {
    it('緑のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="claude-haiku-4-5" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.color).toBe('rgb(16, 185, 129)') // green-500
    })

    it('🟢 アイコンを表示する', () => {
      render(<ModelBadge model="claude-haiku-4-5" />)
      expect(screen.getByText('🟢')).toBeInTheDocument()
    })

    it('"Haiku 4.5" ラベルを表示する', () => {
      render(<ModelBadge model="claude-haiku-4-5" />)
      expect(screen.getByText('Haiku 4.5')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-004: Kimi K2.5', () => {
    it('黄色のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="kimi-k2.5" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.color).toBe('rgb(245, 158, 11)') // amber-500
    })

    it('🟡 アイコンを表示する', () => {
      render(<ModelBadge model="kimi-k2.5" />)
      expect(screen.getByText('🟡')).toBeInTheDocument()
    })

    it('"Kimi K2.5" ラベルを表示する', () => {
      render(<ModelBadge model="kimi-k2.5" />)
      expect(screen.getByText('Kimi K2.5')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-005: GLM-5', () => {
    it('赤のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="glm-5" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.color).toBe('rgb(239, 68, 68)') // red-500
    })

    it('🔴 アイコンを表示する', () => {
      render(<ModelBadge model="glm-5" />)
      expect(screen.getByText('🔴')).toBeInTheDocument()
    })

    it('"GLM-5" ラベルを表示する', () => {
      render(<ModelBadge model="glm-5" />)
      expect(screen.getByText('GLM-5')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-006: 未知のモデル（デフォルト）', () => {
    it('灰色のバッジを表示する', () => {
      const { container } = render(<ModelBadge model="unknown-model-x" />)
      const badge = container.querySelector('span')
      expect(badge).toBeInTheDocument()
      expect(badge?.style.color).toBe('rgb(107, 114, 128)') // gray-500
    })

    it('⚪ アイコンを表示する', () => {
      render(<ModelBadge model="unknown-model-x" />)
      expect(screen.getByText('⚪')).toBeInTheDocument()
    })

    it('"Unknown" ラベルを表示する', () => {
      render(<ModelBadge model="unknown-model-x" />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })
  })

  describe('T-CMP-MB-007: カウント表示機能', () => {
    it('count={5} で "× 5" を表示する', () => {
      render(<ModelBadge model="claude-opus-4-6" count={5} />)
      expect(screen.getByText('× 5')).toBeInTheDocument()
    })

    it('count={0} でカウントを非表示にする', () => {
      render(<ModelBadge model="claude-opus-4-6" count={0} />)
      expect(screen.queryByText('× 0')).not.toBeInTheDocument()
    })

    it('count 未指定でカウントを非表示にする', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" />)
      const content = container.textContent || ''
      expect(content).not.toContain('×')
    })
  })

  describe('T-CMP-MB-008: サイズバリエーション', () => {
    it('smサイズ: 小さいバッジ', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" size="sm" />)
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('text-xs')
      expect(badge?.className).toContain('px-2')
      expect(badge?.className).toContain('py-0.5')
    })

    it('mdサイズ: 大きいバッジ', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" size="md" />)
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('text-sm')
      expect(badge?.className).toContain('px-2.5')
      expect(badge?.className).toContain('py-1')
    })

    it('デフォルト: smサイズ', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" />)
      const badge = container.querySelector('span')
      expect(badge?.className).toContain('text-xs')
    })
  })

  describe('T-CMP-MB-009: ModelBadgeGroup', () => {
    it('複数のモデルバッジを表示する', () => {
      render(
        <ModelBadgeGroup
          models={['claude-opus-4-6', 'claude-sonnet-4-5', 'kimi-k2.5']}
        />
      )
      expect(screen.getByText('Opus 4.6')).toBeInTheDocument()
      expect(screen.getByText('Sonnet 4.5')).toBeInTheDocument()
      expect(screen.getByText('Kimi K2.5')).toBeInTheDocument()
    })

    it('空の配列で null を返す', () => {
      const { container } = render(<ModelBadgeGroup models={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('単一モデルでも正しく表示する', () => {
      render(<ModelBadgeGroup models={['claude-opus-4-6']} />)
      expect(screen.getByText('Opus 4.6')).toBeInTheDocument()
    })
  })

  describe('ModelConfig オブジェクト直接指定', () => {
    it('ModelConfig オブジェクトでバッジを表示する', () => {
      const config = {
        id: 'test-model',
        color: '#FF00FF',
        icon: '🟣',
        label: 'Test Model',
        provider: 'other' as const,
      }
      render(<ModelBadge model={config} />)
      expect(screen.getByText('Test Model')).toBeInTheDocument()
      expect(screen.getByText('🟣')).toBeInTheDocument()
    })
  })

  describe('アクセシビリティ', () => {
    it('title 属性を設定する', () => {
      const { container } = render(<ModelBadge model="claude-opus-4-6" />)
      const badge = container.querySelector('span')
      expect(badge?.getAttribute('title')).toBe('Opus 4.6')
    })
  })
})
