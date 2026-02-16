/**
 * ErrorDisplay コンポーネントの単体テスト。
 *
 * T-CMP-002: エラー表示
 *
*/
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorDisplay, InlineError } from '../ErrorDisplay'

describe('ErrorDisplay', () => {
  describe('T-CMP-002: エラー表示', () => {
    it('エラーメッセージを表示する', () => {
      render(<ErrorDisplay message="エラーが発生しました" />)
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    })

    it('リトライボタンを表示する', () => {
      const handleRetry = vi.fn()
      render(<ErrorDisplay message="エラー" onRetry={handleRetry} />)
      expect(screen.getByRole('button', { name: /再接続/ })).toBeInTheDocument()
    })

    it('リトライボタンクリックでハンドラーを呼ぶ', async () => {
      const user = userEvent.setup()
      const handleRetry = vi.fn()
      render(<ErrorDisplay message="エラー" onRetry={handleRetry} />)

      const retryButton = screen.getByRole('button', { name: /再接続/ })
      await user.click(retryButton)

      expect(handleRetry).toHaveBeenCalledTimes(1)
    })

    it('カスタムリトライテキストを表示する', () => {
      render(<ErrorDisplay message="エラー" onRetry={() => {}} retryText="再試行" />)
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument()
    })

    it('errorType=networkで接続エラーを表示する', () => {
      render(<ErrorDisplay errorType="network" />)
      expect(screen.getByText('接続エラー')).toBeInTheDocument()
      expect(screen.getByText(/インターネット接続を確認してください/)).toBeInTheDocument()
    })

    it('errorType=serverでサー�ーエラーを表示する', () => {
      render(<ErrorDisplay errorType="server" />)
      expect(screen.getByText('サーバーエラー')).toBeInTheDocument()
    })

    it('errorType=dataでデータエラーを表示する', () => {
      render(<ErrorDisplay errorType="data" />)
      expect(screen.getByText('データエラー')).toBeInTheDocument()
    })

    it('errorType=generalで汎用エラーを表示する', () => {
      render(<ErrorDisplay errorType="general" />)
      expect(screen.getByText('エラー')).toBeInTheDocument()
    })

    it('追加のアクションボタンを表示する', () => {
      render(
        <ErrorDisplay
          message="エラー"
          onRetry={() => {}}
          extraActions={<button type="button">キャンセル</button>}
        />
      )
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
    })

    it('アイコンを表示する', () => {
      const { container } = render(<ErrorDisplay message="エラー" />)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('中央揃えで表示する', () => {
      const { container } = render(<ErrorDisplay message="エラー" />)
      const wrapper = container.querySelector('.flex.flex-col.items-center.justify-center')
      expect(wrapper).toBeInTheDocument()
    })
  })
})

describe('InlineError', () => {
  it('エラーメッセージを表示する', () => {
    render(<InlineError message="エラーが発生しました" />)
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
  })

  it('インラインスタイルを持つ', () => {
    const { container } = render(<InlineError message="エラー" />)
    const wrapper = container.querySelector('.flex.items-center.gap-2')
    expect(wrapper).toBeInTheDocument()
  })

  it('エラー色のスタイルを持つ', () => {
    const { container } = render(<InlineError message="エラー" />)
    const wrapper = container.querySelector('.bg-red-50')
    expect(wrapper).toBeInTheDocument()
  })

  it('onRetry propでリトライリンクを表示する', () => {
    render(<InlineError message="エラー" onRetry={() => {}} />)
    expect(screen.getByRole('button', { name: /リトライ/ })).toBeInTheDocument()
  })

  it('リトライリンククリックでハンドラーを呼ぶ', async () => {
    const user = userEvent.setup()
    const handleRetry = vi.fn()
    render(<InlineError message="エラー" onRetry={handleRetry} />)

    const retryLink = screen.getByRole('button', { name: /リトライ/ })
    await user.click(retryLink)

    expect(handleRetry).toHaveBeenCalledTimes(1)
  })
})
