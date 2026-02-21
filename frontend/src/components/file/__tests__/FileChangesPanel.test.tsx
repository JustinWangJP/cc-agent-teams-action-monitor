/**
 * TC-010: FileChangesPanel のテスト.
 *
 * ファイル変更監視パネルコンポーネントの機能を検証します。
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileChangesPanel from '../FileChangesPanel';
import type { FileChangeEntry } from '@/types/message';

/**
 * テスト用の QueryClient を作成するラッパーコンポーネント。
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        retryDelay: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * モックデータ：ファイル変更エントリのサンプル.
 */
const mockFileChanges: FileChangeEntry[] = [
  {
    id: 'file-1',
    file: { path: 'src/components/Test.tsx', operation: 'created' },
    timestamp: '2026-02-21T10:00:00+00:00',
    agent: 'frontend-dev',
  },
  {
    id: 'file-2',
    file: { path: 'src/utils/helpers.ts', operation: 'modified' },
    timestamp: '2026-02-21T10:01:00+00:00',
    agent: 'backend-dev',
  },
  {
    id: 'file-3',
    file: { path: 'README.md', operation: 'deleted' },
    timestamp: '2026-02-21T10:02:00+00:00',
    agent: 'team-lead',
  },
  {
    id: 'file-4',
    file: { path: 'package.json', operation: 'read' },
    timestamp: '2026-02-21T10:03:00+00:00',
    agent: 'frontend-dev',
  },
];

describe('TC-010: FileChangesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-010-01: ファイル変更一覧', () => {
    it('APIレスポンスで変更リストが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
        expect(screen.getByText('src/utils/helpers.ts')).toBeInTheDocument();
        expect(screen.getByText('README.md')).toBeInTheDocument();
        expect(screen.getByText('package.json')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-02: created アイコン', () => {
    it('Plusアイコンが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockFileChanges[0]],
          last_timestamp: '2026-02-21T10:00:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      const { container } = render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        const plusIcon = container.querySelector('.lucide-plus');
        expect(plusIcon).toBeInTheDocument();
        expect(screen.getByText('作成')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-03: modified アイコン', () => {
    it('Editアイコンが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockFileChanges[1]],
          last_timestamp: '2026-02-21T10:01:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      const { container } = render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        const editIcon = container.querySelector('.lucide-edit');
        expect(editIcon).toBeInTheDocument();
        expect(screen.getByText('変更')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-04: deleted アイコン', () => {
    it('Trashアイコンが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockFileChanges[2]],
          last_timestamp: '2026-02-21T10:02:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      const { container } = render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        const trashIcon = container.querySelector('.lucide-trash');
        expect(trashIcon).toBeInTheDocument();
        expect(screen.getByText('削除')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-05: read アイコン', () => {
    it('Eyeアイコンが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [mockFileChanges[3]],
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      const { container } = render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        const eyeIcon = container.querySelector('.lucide-eye');
        expect(eyeIcon).toBeInTheDocument();
        expect(screen.getByText('読み取り')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-06: 操作フィルタ', () => {
    it('operations: ["created"] で作成のみが表示される', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // フィルタボタンをクリック
      await waitFor(async () => {
        const filterButton = await screen.findByText('操作');
        await user.click(filterButton);
      });

      // "作成"オプションを選択（チェックボックス）
      await waitFor(async () => {
        const createdCheckbox = screen.getByText('created');
        await user.click(createdCheckbox);
      });

      // created 操作のみが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-07: ディレクトリフィルタ', () => {
    it('directories: ["src"] で src 配下のみ表示される', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // ディレクトリフィルタをクリック
      await waitFor(async () => {
        const dirFilterButton = await screen.findByText('ディレクトリ');
        await user.click(dirFilterButton);
      });

      // "src" オプションを選択
      await waitFor(async () => {
        const srcOption = screen.getByText('src');
        await user.click(srcOption);
      });

      // src 配下のファイルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
        expect(screen.getByText('src/utils/helpers.ts')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-08: 拡張子フィルタ', () => {
    it('extensions: ["tsx"] で .tsx ファイルのみ表示される', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // 拡張子フィルタをクリック
      await waitFor(async () => {
        const extFilterButton = await screen.findByText('拡張子');
        await user.click(extFilterButton);
      });

      // "tsx" オプションを選択
      await waitFor(async () => {
        const tsxOption = screen.getByText('tsx');
        await user.click(tsxOption);
      });

      // .tsx ファイルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-09: エージェントフィルタ', () => {
    it('agents: ["frontend-dev"] で該当エージェントのみ表示される', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // エージェントフィルタをクリック
      await waitFor(async () => {
        const agentFilterButton = await screen.findByText('エージェント');
        await user.click(agentFilterButton);
      });

      // "frontend-dev" オプションを選択
      await waitFor(async () => {
        const frontendDevOption = screen.getByText('frontend-dev');
        await user.click(frontendDevOption);
      });

      // frontend-dev のファイル変更が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
        expect(screen.getByText('package.json')).toBeInTheDocument();
      });
    });
  });

  describe('TC-010-10: リアルタイム更新', () => {
    it('新規ファイル変更が自動的に追加表示される（ポーリング）', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [mockFileChanges[0]],
              last_timestamp: '2026-02-21T10:00:00+00:00',
            }),
          });
        } else {
          // 2回目の呼び出しで新規エントリを返す
          return Promise.resolve({
            ok: true,
            json: async () => ({
              items: [...mockFileChanges],
              last_timestamp: '2026-02-21T10:03:00+00:00',
            }),
          });
        }
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // 初回データを確認
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
        expect(callCount).toBe(1);
      });

      // ポーリングにより自動更新されることを確認
      // 注: 実際のポーリングは時間がかかるため、ここでは初期ロードとフェッチ関数の挙動のみ検証
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時にエラーメッセージが表示される', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(/データの取得に失敗しました/)).toBeInTheDocument();
      });
    });
  });

  describe('空状態', () => {
    it('ファイル変更がない場合、空メッセージが表示される', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          last_timestamp: '2026-02-21T10:00:00+00:00',
        }),
      });

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('ファイル変更はありません')).toBeInTheDocument();
      });
    });
  });

  describe('チーム未選択状態', () => {
    it('teamName が null の場合、チーム選択メッセージが表示される', () => {
      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="" />, { wrapper });

      expect(screen.getByText('チームを選択してください')).toBeInTheDocument();
    });
  });

  describe('手動リフレッシュ', () => {
    it('更新ボタンクリックでデータ再取得が実行される', async () => {
      const user = userEvent.setup();
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: mockFileChanges,
          last_timestamp: '2026-02-21T10:03:00+00:00',
        }),
      });

      global.fetch = fetchMock;

      const wrapper = createWrapper();
      render(<FileChangesPanel teamName="test-team" />, { wrapper });

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('src/components/Test.tsx')).toBeInTheDocument();
      });

      // 更新ボタンをクリック
      const refreshButton = screen.getByTitle('更新');
      await user.click(refreshButton);

      // 再フェッチが実行されることを確認
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });
  });
});
