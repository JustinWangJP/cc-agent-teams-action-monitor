/**
 * StatusBadge コンポーネントの単体テスト。
 *
 * T-CMP-002: active ステータス
 * T-CMP-003: pending ステータス
 * T-CMP-0XX: その他ステータスのカバレッジ
 *
*/
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
      expect(screen.getByText('active')).toBeInTheDocument()
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
      expect(screen.getByText('pending')).toBeInTheDocument()
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
      expect(screen.getByText('in progress')).toBeInTheDocument()
    })

    it('completedステータス: 緑色バッジ', () => {
      const { container } = render(<StatusBadge status="completed" />)
      expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
    })

    it('deletedステータス: 赤色バッジ', () => {
      const { container } = render(<StatusBadge status="deleted" />)
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
    })

    it('不明なステータス: デフォルト灰色バッジ', () => {
      const { container } = render(<StatusBadge status="unknown" />)
      expect(container.querySelector('.bg-gray-400')).toBeInTheDocument()
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
    it('in_progress を "in progress" に変換', () => {
      render(<StatusBadge status="in_progress" />)
      expect(screen.getByText('in progress')).toBeInTheDocument()
    })
  })

  describe('WebSocket 接続状態 (TC-403)', () => {
    it('open状態: 赤色のLiveバッジを表示', () => {
      const { container } = render(<StatusBadge status="open" />)
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('open状態: 点滅アニメーションを持つ', () => {
      const { container } = render(<StatusBadge status="open" />)
      const indicator = container.querySelector('.animate-pulse')
      expect(indicator).toBeInTheDocument()
    })

    it('connecting状態: 黄色のConnectingバッジ', () => {
      render(<StatusBadge status="connecting" />)
      expect(screen.getByText('Connecting')).toBeInTheDocument()
    })

    it('closed状態: 灰色のDisconnectedバッジ', () => {
      const { container } = render(<StatusBadge status="closed" />)
      expect(container.querySelector('.bg-gray-400')).toBeInTheDocument()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('closed状態: 点滅アニメーションなし', () => {
      const { container } = render(<StatusBadge status="closed" />)
      const indicator = container.querySelector('.animate-pulse')
      expect(indicator).not.toBeInTheDocument()
    })

    it('showLiveText=falseでLiveテキストを非表示', () => {
      render(<StatusBadge status="open" showLiveText={false} />)
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })
  })
})
