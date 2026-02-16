/**
 * LoadingSpinner コンポーネントの単体テスト。
 *
 * T-CMP-001: ローディング表示
 *
 * @
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

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
      const spinner = container.querySelector('.h-8.w-8')
      expect(spinner).toBeInTheDocument()
    })
  })
})
