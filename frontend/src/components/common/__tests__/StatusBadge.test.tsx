/**
 * StatusBadge コンポーネントの単体テスト。
 *
 * T-CMP-002: active ステータス
 * T-CMP-003: pending ステータス
 * T-CMP-0XX: その他ステータスのカバレッジ
 *
*/
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/test/setup.tsx'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  describe('T-CMP-002: active status', () => {
    it('緑色のバッジを表示する', () => {
      const { container } = render(<StatusBadge status="active" />)
      const badge = container.querySelector('.bg-green-500')
      expect(badge).toBeInTheDocument()
    })

    it('"active"テキストを表示する', () => {
      render(<StatusBadge status="active" />)
      // 翻訳されたテキスト（日本語）を確認
      expect(screen.getByText('アクティブ')).toBeInTheDocument()
    })
  })

  describe('T-CMP-003: pending status', () => {
    it('黄色のバッジを表示する', () => {
      const { container } = render(<StatusBadge status="pending" />)
      const badge = container.querySelector('.bg-yellow-500')
      expect(badge).toBeInTheDocument()
    })

    it('"pending"テキストを表示する', () => {
      render(<StatusBadge status="pending" />)
      // 翻訳されたテキスト（日本語）を確認 - ツールチップにも同じテキストが含まれるためgetAllByTextを使用
      const elements = screen.getAllByText('保留中')
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  describe('その他のステータス', () => {
    it('idleステータス: 灰色バッジ', () => {
      const { container } = render(<StatusBadge status="idle" />)
      expect(container.querySelector('.bg-gray-400')).toBeInTheDocument()
    })

    it('in_progressステータス: 青色バッジ', () => {
      const { container } = render(<StatusBadge status="in_progress" />)
      expect(container.querySelector('.bg-blue-500')).toBeInTheDocument()
      // 翻訳されたテキスト（日本語）を確認 - ツールチップにも同じテキストが含まれるためgetAllByTextを使用
      const elements = screen.getAllByText('進行中')
      expect(elements.length).toBeGreaterThan(0)
    })

    it('completedステータス: 緑色バッジ', () => {
      const { container } = render(<StatusBadge status="completed" />)
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
    })

    it('deletedステータス: 赤色バッジ', () => {
      const { container } = render(<StatusBadge status="deleted" />)
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
    })

    it('不明なステータス: 黄色バッジ', () => {
      const { container } = render(<StatusBadge status="unknown" />)
      // unknownステータスは黄色（bg-yellow-500）で表示される
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument()
    })
  })

  describe('サイズバリエーション', () => {
    it('smサイズ: 小さいインジケーター', () => {
      const { container } = render(<StatusBadge status="active" size="sm" />)
      const indicator = container.querySelector('.w-2.h-2')
      expect(indicator).toBeInTheDocument()
    })

    it('mdサイズ: 大きいインジケーター', () => {
      const { container } = render(<StatusBadge status="active" size="md" />)
      const indicator = container.querySelector('.w-3.h-3')
      expect(indicator).toBeInTheDocument()
    })

    it('デフォルト: smサイズ', () => {
      const { container } = render(<StatusBadge status="active" />)
      const indicator = container.querySelector('.w-2.h-2')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('アンダースコア置換', () => {
    it('in_progress を翻訳キーで表示', () => {
      render(<StatusBadge status="in_progress" />)
      // 翻訳されたテキスト（日本語）を確認 - ツールチップにも同じテキストが含まれるためgetAllByTextを使用
      const elements = screen.getAllByText('進行中')
      expect(elements.length).toBeGreaterThan(0)
    })
  })
})
