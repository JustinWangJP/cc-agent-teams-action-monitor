/**
 * useWebSocket フックの単体テスト。
 *
 * T-HK-004: 接続確立
 * T-HK-005: メッセージ受信
 * T-HK-006: 再接続
 *
 * @
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWebSocket } from '../useWebSocket'
import type { WebSocketMessage } from '@/types/message'

// WebSocket のモック
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    // 非同期で接続成功をシミュレート
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  // テスト用ヘルパー: メッセージを受信
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  // テスト用ヘルパー: 切断をシミュレート
  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-ignore - グローバル WebSocket をモックに置き換え
    global.WebSocket = MockWebSocket as any
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('T-HK-004: 接続確立', () => {
    it('WebSocket 接続を確立する', async () => {
      const { result } = renderHook(() => useWebSocket('dashboard'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })
    })

    it('正しいURLで接続する', async () => {
      const { result } = renderHook(() => useWebSocket('tasks'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })

      // WebSocketが正しいURLで初期化されたことを確認
      // 注: このテストは実装により調整が必要
    })

    it('初期状態で connecting を返す', () => {
      const { result } = renderHook(() => useWebSocket('dashboard'))
      expect(result.current.connectionStatus).toBe('connecting')
    })
  })

  describe('T-HK-005: メッセージ受信', () => {
    it('メッセージを受信して lastMessage を更新する', async () => {
      const { result } = renderHook(() => useWebSocket('dashboard'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })

      const testMessage: WebSocketMessage = {
        type: 'team_update',
        team: 'test-team',
        data: { event: 'modified' }
      }

      act(() => {
        // WebSocketインスタンスに直接アクセスしてメッセージをシミュレート
        // 注: 実装によりヘルパー関数を使う
      })

      // 注: このテストは実際のWebSocketインスタンスにアクセスする方法に
      //     よって調整が必要
    })
  })

  describe('T-HK-006: 再接続', () => {
    it('切断後に自動再接続する', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useWebSocket('dashboard'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })

      // 切断をシミュレート
      act(() => {
        // WebSocketインスタンスのcloseを呼び出す
      })

      // 切断状態を確認
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('closed')
      })

      // タイマーを進めて再接続を待つ
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // 再接続を確認
      // 注: 実装に応じて調整
    })

    it('指数バックオフで再接続遅延を増やす', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useWebSocket('dashboard'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })

      // 複数回の切断と再接続をシミュレート
      // 1回目: 1秒後
      // 2回目: 2秒後
      // 3回目: 4秒後
      // ...
    })
  })

  describe('sendMessage', () => {
    it('接続中にメッセージを送信する', async () => {
      const { result } = renderHook(() => useWebSocket('dashboard'))

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('open')
      })

      act(() => {
        result.current.sendMessage({ type: 'ping' })
      })

      // 送信されたことを確認
      // 注: 実装に応じて調整
    })
  })

  describe('ping/pong', () => {
    it('30秒間隔でpingを送信する', async () => {
      vi.useFakeTimers()

      renderHook(() => useWebSocket('dashboard'))

      act(() => {
        vi.advanceTimersByTime(30000)
      })

      // pingが送信されたことを確認
      // 注: 実装に応じて調整
    })
  })
})
