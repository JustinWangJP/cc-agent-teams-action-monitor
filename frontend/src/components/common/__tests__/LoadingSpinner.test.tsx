/**
 * LoadingSpinner コンポーネントの単体テスト。
 *
 * T-CMP-001: ローディング表示
 *
*/
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingSpinner, SkeletonLoader, LoadingOverlay } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  describe('T-CMP-001: ローディング表示', () => {
    it('スピナーをレンダリングする', () => {
      const { container } = render(<LoadingSpinner />)
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('中央揃えのコンテナを持つ', () => {
      const { container } = render(<LoadingSpinner />)
      const wrapper = container.querySelector('.flex.items-center.justify-center')
      expect(wrapper).toBeInTheDocument()
    })

    it('円形のスピナー形状を持つ', () => {
      const { container } = render(<LoadingSpinner />)
      const spinner = container.querySelector('.rounded-full')
      expect(spinner).toBeInTheDocument()
    })

    it('適切なサイズクラスを持つ', () => {
      const { container } = render(<LoadingSpinner />)
      const spinner = container.querySelector('.h-12.w-12')
      expect(spinner).toBeInTheDocument()
    })

    it('デフォルトメッセージを表示する', () => {
      const { getByText } = render(<LoadingSpinner />)
      expect(getByText('Loading...')).toBeInTheDocument()
    })

    it('カスタムメッセージを表示する', () => {
      const { getByText } = render(<LoadingSpinner message="データを読み込んでいます..." />)
      expect(getByText('データを読み込んでいます...')).toBeInTheDocument()
    })

    it('spinnerOnly propでメッセージを非表示にする', () => {
      const { queryByText } = render(<LoadingSpinner spinnerOnly />)
      expect(queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('サイズに応じたクラスを適用する', () => {
      const { container: smContainer } = render(<LoadingSpinner size="sm" />)
      const { container: mdContainer } = render(<LoadingSpinner size="md" />)
      const { container: lgContainer } = render(<LoadingSpinner size="lg" />)

      expect(smContainer.querySelector('.h-6.w-6')).toBeInTheDocument()
      expect(mdContainer.querySelector('.h-12.w-12')).toBeInTheDocument()
      expect(lgContainer.querySelector('.h-16.w-16')).toBeInTheDocument()
    })
  })
})

describe('SkeletonLoader', () => {
  it('指定された数のスケルトンをレンダリングする', () => {
    const { container } = render(<SkeletonLoader count={5} />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(5)
  })

  it('デフォルトで3つのスケルトンをレンダリングする', () => {
    const { container } = render(<SkeletonLoader />)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(3)
  })
})

describe('LoadingOverlay', () => {
  it('show=trueでオーバーレイを表示する', () => {
    const { container } = render(<LoadingOverlay show={true} />)
    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).toBeInTheDocument()
  })

  it('show=falseで何も表示しない', () => {
    const { container } = render(<LoadingOverlay show={false} />)
    const overlay = container.querySelector('.fixed.inset-0')
    expect(overlay).not.toBeInTheDocument()
  })

  it('backdrop blurを持つ', () => {
    const { container } = render(<LoadingOverlay show={true} />)
    const overlay = container.querySelector('.backdrop-blur-sm')
    expect(overlay).toBeInTheDocument()
  })
})
