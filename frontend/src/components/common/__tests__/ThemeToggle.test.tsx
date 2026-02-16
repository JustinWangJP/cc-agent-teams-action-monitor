/**
 * ThemeToggle コンポーネントの単体テスト。
 *
 * T-CMP-TT-001: ライトモードでの初期表示
 * T-CMP-TT-002: ダークモードでの初期表示
 * T-CMP-TT-003: テーマ切り替え機能
 * T-CMP-TT-004: localStorage 設定保存
 * T-CMP-TT-005: サイズバリエーション
 * T-CMP-TT-006: アクセシビリティ属性
 *
*/
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn() as Mock<[string], string | null>,
  setItem: vi.fn() as Mock<[string, string], void>,
  clear: vi.fn(),
}
localStorageMock.getItem.mockReturnValue(null)

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('ThemeToggle', () => {
  beforeEach(() => {
    // テスト前にリセット
    localStorageMock.getItem.mockReturnValue(null)
    document.documentElement.classList.remove('dark')
    vi.clearAllMocks()
  })

  afterEach(() => {
    // テスト後にクリーンアップ
    document.documentElement.classList.remove('dark')
  })

  describe('T-CMP-TT-001: ライトモードでの初期表示', () => {
    it('太陽アイコンを表示する（ライトモード）', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      // 太陽アイコンの path (ライトモード時は月アイコンが表示されるが、
      // クリックでダークに切り替わるので月アイコンが表示される)
      // 初期状態がライトの場合、月アイコン（ダークへの切り替え）を表示
      const moonIcon = screen.getByRole('button').querySelector('svg')
      expect(moonIcon).toBeInTheDocument()
    })

    it('dark クラスが付与されていない', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('T-CMP-TT-002: ダークモードでの初期表示', () => {
    it('月アイコンを表示する（ダークモード）', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      render(<ThemeToggle />)

      // ダークモード時は太陽アイコン（ライトへの切り替え）を表示
      const sunIcon = screen.getByRole('button').querySelector('svg')
      expect(sunIcon).toBeInTheDocument()
    })

    it('dark クラスが付与されている', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      render(<ThemeToggle />)

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('T-CMP-TT-003: テーマ切り替え機能', () => {
    it('ライト→ダークへの切り替え', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    })

    it('ダーク→ライトへの切り替え', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
    })

    it('トグルで交互に切り替わる', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')

      // ライト → ダーク
      fireEvent.click(button)
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      // ダーク → ライト
      fireEvent.click(button)
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      // ライト → ダーク
      fireEvent.click(button)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('T-CMP-TT-004: localStorage 設定保存', () => {
    it('テーマ切り替え時に localStorage に保存する', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
    })

    it('初期化時に localStorage から読み込む', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      render(<ThemeToggle />)

      expect(localStorageMock.getItem).toHaveBeenCalledWith('theme')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('T-CMP-TT-005: サイズバリエーション', () => {
    it('smサイズ: 小さいボタン', () => {
      render(<ThemeToggle size="sm" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-8')
      expect(button.className).toContain('h-8')
    })

    it('mdサイズ: 中サイズボタン', () => {
      render(<ThemeToggle size="md" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-10')
      expect(button.className).toContain('h-10')
    })

    it('lgサイズ: 大きいボタン', () => {
      render(<ThemeToggle size="lg" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-12')
      expect(button.className).toContain('h-12')
    })

    it('デフォルト: mdサイズ', () => {
      render(<ThemeToggle />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('w-10')
    })
  })

  describe('T-CMP-TT-006: アクセシビリティ属性', () => {
    it('aria-label を設定する（ライトモード時）', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      expect(button.getAttribute('aria-label')).toBe('Switch to dark mode')
    })

    it('aria-label を設定する（ダークモード時）', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      expect(button.getAttribute('aria-label')).toBe('Switch to light mode')
    })

    it('title 属性を設定する', () => {
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      expect(button.getAttribute('title')).toContain('Current: light mode')
    })

    it('フォーカス可能である', () => {
      render(<ThemeToggle />)
      const button = screen.getByRole('button')
      expect(button.tabIndex).toBe(0)
    })
  })

  describe('システム設定検出', () => {
    it('localStorage が空の場合、システム設定を使用する（ライト）', () => {
      localStorageMock.getItem.mockReturnValue(null)
      render(<ThemeToggle />)

      // デフォルトの matchMedia モックは matches: false を返す
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('システム設定がダークモードの場合', () => {
      localStorageMock.getItem.mockReturnValue(null)

      // matchMedia をダークモード用にモック
      ;(window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<ThemeToggle />)

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('onThemeChange コールバック', () => {
    it('テーマ変更時にコールバックを呼び出す', () => {
      const handleChange = vi.fn()
      localStorageMock.getItem.mockReturnValue('light')
      render(<ThemeToggle onThemeChange={handleChange} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(handleChange).toHaveBeenCalledWith('dark')
    })

    it('初期化時にはコールバックを呼び出さない', () => {
      const handleChange = vi.fn()
      render(<ThemeToggle onThemeChange={handleChange} />)

      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('追加クラス', () => {
    it('カスタム className を適用する', () => {
      render(<ThemeToggle className="custom-class" />)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })
  })

  describe('SSR 対応', () => {
    it('SSR 環境（window.undefined）でデフォルトライトモードになる', () => {
      // 元の window オブジェクトを保存
      const originalWindow = global.window

      // @ts-ignore - テスト用に一時的に window を削除
      delete (global as any).window

      // window がない状態でレンダリング
      const { container } = render(<ThemeToggle />)

      // エラーが発生せず、ボタンが表示される
      const button = container.querySelector('button')
      expect(button).toBeInTheDocument()

      // デフォルトでライトモード（dark クラスなし）
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      // window を復元
      global.window = originalWindow
    })

    it('window 後でも localStorage モックが機能する', () => {
      // 元の window を保存
      const originalWindow = global.window

      // @ts-ignore
      delete (global as any).window
      global.window = { ...originalWindow, localStorage: localStorageMock } as any

      // localStorage モックが機能することを確認
      localStorageMock.getItem.mockReturnValue('dark')
      const { container } = render(<ThemeToggle />)

      expect(container.querySelector('button')).toBeInTheDocument()

      // 元に戻す
      global.window = originalWindow
    })
  })
})
