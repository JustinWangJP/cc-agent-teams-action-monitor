/**
 * Vitest テスト環境のセットアップファイル。
 *
 * @testing-library/jest-dom のマッチャーをグローバルに追加し、
 * テスト実行前に適用されます。
 *
 * @module test/setup
 */
import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import { afterEach, vi, beforeAll } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { initI18n } from '../i18n/index';
import i18n from '../i18n/index';

// 各テスト前にi18nを初期化
beforeAll(async () => {
  await initI18n();
  // テストでは日本語をデフォルトにする
  await i18n.changeLanguage('ja');
});

// 各テスト後にDOMをクリーンアップ
afterEach(() => {
  cleanup();
});

// IntersectionObserver のモック（可視性検出用）
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof IntersectionObserver;

// ResizeObserver のモック（リサイズ検出用）
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

// matchMedia のモック（ダークモード等のメディアクエリ用）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * i18n と QueryClient プロバイダーでラップしたカスタムレンダー関数。
 *
 * テスト内で i18n 翻訳と React Query を正しく機能させるために使用します。
 *
 * @param ui - レンダリングする React 要素
 * @param options - レンダリングオプション
 * @returns レンダリング結果
 *
 * @example
 * ```tsx
 * import { render, screen } from '@testing-library/react';
 * import { MyComponent } from './MyComponent';
 *
 * test('翻訳が表示される', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('日本語テキスト')).toBeInTheDocument();
 * });
 * ```
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  // テスト用の QueryClient を作成（リトライ無効、キャッシュ無効）
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {ui}
      </I18nextProvider>
    </QueryClientProvider>,
    options,
  );
};

// @testing-library/react から必要な関数を明示的にエクスポート
export {
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
  getByLabelText,
  getByPlaceholderText,
  getByText,
  getByAltText,
  getByTitle,
  getByRole,
  getByTestId,
  queryByLabelText,
  queryByPlaceholderText,
  queryByText,
  queryByAltText,
  queryByTitle,
  queryByRole,
  queryByTestId,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByText,
  findAllByAltText,
  findAllByTitle,
  findAllByRole,
  findAllByTestId,
  findByLabelText,
  findByPlaceholderText,
  findByText,
  findByAltText,
  findByTitle,
  findByRole,
  findByTestId,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByText,
  getAllByAltText,
  getAllByTitle,
  getAllByRole,
  getAllByTestId,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByText,
  queryAllByAltText,
  queryAllByTitle,
  queryAllByRole,
  queryAllByTestId,
} from '@testing-library/react';

// デフォルトの render を i18n プロバイダー付きのカスタムレンダーで上書き
export { customRender as render };
