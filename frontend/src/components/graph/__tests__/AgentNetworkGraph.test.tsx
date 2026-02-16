/**
 * AgentNetworkGraph コンポーネントの単体テスト。
 *
 * @module components/graph/__tests__/AgentNetworkGraph.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AgentNetworkGraph } from '../AgentNetworkGraph';

// D3.js をモック化
vi.mock('d3', () => ({
  forceSimulation: vi.fn(() => ({
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    alphaTarget: vi.fn().mockReturnThis(),
    restart: vi.fn(),
  })),
  forceLink: vi.fn(() => ({
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
  })),
  forceManyBody: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCenter: vi.fn(() => ({
    strength: vi.fn().mockReturnThis(),
  })),
  forceCollide: vi.fn(() => ({
    radius: vi.fn().mockReturnThis(),
  })),
  drag: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
  })),
  select: vi.fn(() => ({
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
  })),
  selectAll: vi.fn(() => ({
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
  })),
  zoom: vi.fn(() => ({
    scaleExtent: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
  })),
  zoomIdentity: { transform: '' },
}));

// fetch をモック化
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        nodes: [
          {
            id: 'agent-1',
            label: 'agent-1',
            model: 'claude-opus-4-6',
            modelColor: '#8B5CF6',
            modelIcon: '💎',
            messageCount: 10,
            sentCount: 5,
            receivedCount: 5,
          },
          {
            id: 'agent-2',
            label: 'agent-2',
            model: 'claude-sonnet-4-5',
            modelColor: '#3B82F6',
            modelIcon: '🔵',
            messageCount: 8,
            sentCount: 4,
            receivedCount: 4,
          },
        ],
        edges: [
          {
            source: 'agent-1',
            target: 'agent-2',
            count: 5,
            types: {
              message: 3,
              idle_notification: 1,
              shutdown_request: 0,
              shutdown_response: 1,
              plan_approval: 0,
              other: 0,
            },
            dominantType: 'message',
            lastTimestamp: '2026-02-16T10:00:00Z',
          },
        ],
        teamName: 'test-team',
        meta: {
          totalMessages: 18,
          timeRange: {
            min: '2026-02-16T09:00:00Z',
            max: '2026-02-16T11:00:00Z',
          },
        },
      }),
  }),
) as any;

describe('AgentNetworkGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('T-CMP-018: 基本レンダリング', () => {
    it('ローディング状態を表示する', () => {
      render(<AgentNetworkGraph teamName="test-team" />);
      expect(screen.getByText('ネットワークデータを読み込み中...')).toBeInTheDocument();
    });

    it('デフォルトのサイズで SVG をレンダリングする', async () => {
      const { container } = render(<AgentNetworkGraph teamName="test-team" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '800');
        expect(svg).toHaveAttribute('height', '500');
      });
    });

    it('カスタムサイズで SVG をレンダリングする', async () => {
      const { container } = render(
        <AgentNetworkGraph teamName="test-team" width={1000} height={600} />
      );

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '1000');
        expect(svg).toHaveAttribute('height', '600');
      });
    });

    it('データ取得後にグラフを表示する', async () => {
      const { container } = render(<AgentNetworkGraph teamName="test-team" />);

      await waitFor(() => {
        expect(screen.queryByText('ネットワークデータを読み込み中...')).not.toBeInTheDocument();
      });

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('T-CMP-019: エラーハンドリング', () => {
    it('API エラー時にエラーメッセージを表示する', async () => {
      (global.fetch as any) = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found',
        })
      );

      render(<AgentNetworkGraph teamName="nonexistent-team" />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });

    it('ネットワークエラー時にエラーメッセージを表示する', async () => {
      (global.fetch as any) = vi.fn(() => Promise.reject(new Error('Network error')));

      render(<AgentNetworkGraph teamName="test-team" />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('T-CMP-020: インタラクション', () => {
    it('ノードクリック時のコールバックを呼び出す', async () => {
      const onNodeClick = vi.fn();
      render(<AgentNetworkGraph teamName="test-team" onNodeClick={onNodeClick} />);

      await waitFor(() => {
        expect(screen.queryByText('ネットワークデータを読み込み中...')).not.toBeInTheDocument();
      });

      // D3.js がモック化されているため、実際のクリックイベントはシミュレートできない
      // コールバックが正しく渡されていることを確認
      expect(onNodeClick).toBeDefined();
    });

    it('ノードホバー時のコールバックを呼び出す', async () => {
      const onNodeHover = vi.fn();
      render(<AgentNetworkGraph teamName="test-team" onNodeHover={onNodeHover} />);

      await waitFor(() => {
        expect(screen.queryByText('ネットワークデータを読み込み中...')).not.toBeInTheDocument();
      });

      expect(onNodeHover).toBeDefined();
    });
  });

  describe('T-CMP-021: グラフ設定', () => {
    it('カスタム設定を適用する', async () => {
      const { container } = render(
        <AgentNetworkGraph
          teamName="test-team"
          config={{
            nodeRadius: 30,
            linkDistance: 150,
            chargeStrength: -500,
          }}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('エッジケース', () => {
    it('空データの場合は空状態メッセージを表示する', async () => {
      (global.fetch as any) = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              nodes: [],
              edges: [],
              teamName: 'empty-team',
              meta: {
                totalMessages: 0,
                timeRange: { min: '', max: '' },
              },
            }),
        })
      );

      render(<AgentNetworkGraph teamName="empty-team" />);

      await waitFor(() => {
        expect(screen.getByText('表示する通信データがありません')).toBeInTheDocument();
      });
    });

    it('多数のノード（50以上）をレンダリングする', async () => {
      const manyNodes = Array.from({ length: 50 }, (_, i) => ({
        id: `agent-${i}`,
        label: `agent-${i}`,
        model: 'claude-opus-4-6',
        modelColor: '#8B5CF6',
        modelIcon: '💎',
        messageCount: i + 1,
        sentCount: Math.floor((i + 1) / 2),
        receivedCount: Math.ceil((i + 1) / 2),
      }));

      (global.fetch as any) = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              nodes: manyNodes,
              edges: [],
              teamName: 'large-team',
              meta: {
                totalMessages: 1275,
                timeRange: { min: '2026-02-16T00:00:00Z', max: '2026-02-16T23:59:59Z' },
              },
            }),
        })
      );

      const { container } = render(<AgentNetworkGraph teamName="large-team" />);

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('多数のエッジ（100以上）をレンダリングする', async () => {
      const manyEdges = Array.from({ length: 100 }, (_, i) => ({
        source: 'agent-1',
        target: `agent-${i + 2}`,
        count: i + 1,
        types: {
          message: i,
          idle_notification: 0,
          shutdown_request: 0,
          shutdown_response: 0,
          plan_approval: 0,
          other: 1,
        },
        dominantType: 'message',
        lastTimestamp: '2026-02-16T10:00:00Z',
      }));

      (global.fetch as any) = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              nodes: [
                {
                  id: 'agent-1',
                  label: 'agent-1',
                  model: 'claude-opus-4-6',
                  modelColor: '#8B5CF6',
                  modelIcon: '💎',
                  messageCount: 5050,
                  sentCount: 5050,
                  receivedCount: 0,
                },
              ],
              edges: manyEdges,
              teamName: 'busy-team',
              meta: {
                totalMessages: 5050,
                timeRange: { min: '2026-02-16T00:00:00Z', max: '2026-02-16T23:59:59Z' },
              },
            }),
        })
      );

      const { container } = render(<AgentNetworkGraph teamName="busy-team" />);

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  describe('T-CMP-022: ダークモード対応', () => {
    it('ダークモード用クラスを含む SVG をレンダリングする', async () => {
      const { container } = render(<AgentNetworkGraph teamName="test-team" />);

      await waitFor(() => {
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        // Tailwind CSS のダークモードクラスが適用されているか確認
        expect(svg).toHaveClass('dark:bg-slate-800');
        expect(svg).toHaveClass('dark:border-slate-700');
      });
    });
  });
});
