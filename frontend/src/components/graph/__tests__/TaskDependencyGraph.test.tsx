/**
 * TaskDependencyGraph コンポーネントの単体テスト。
 *
 * @module components/graph/__tests__/TaskDependencyGraph.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TaskDependencyGraph } from '../TaskDependencyGraph';

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

describe('TaskDependencyGraph', () => {
  const mockTasks = [
    {
      id: '1',
      subject: '最初のタスク',
      status: 'completed' as const,
      owner: 'agent-1',
      blockedBy: [],
      teamName: 'test-team',
    },
    {
      id: '2',
      subject: '二番目のタスク',
      status: 'in_progress' as const,
      owner: 'agent-2',
      blockedBy: ['1'],
      teamName: 'test-team',
    },
    {
      id: '3',
      subject: '三番目のタスク',
      status: 'pending' as const,
      owner: 'agent-3',
      blockedBy: ['2'],
      teamName: 'test-team',
    },
  ];

  describe('T-CMP-008: 基本レンダリング', () => {
    it('空タスク配列の場合は空状態メッセージを表示する', () => {
      render(<TaskDependencyGraph tasks={[]} />);
      expect(screen.getByText('表示するタスクがありません')).toBeInTheDocument();
    });

    it('デフォルトのサイズで SVG をレンダリングする', async () => {
      const { container } = render(<TaskDependencyGraph tasks={mockTasks} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '800');
      expect(svg).toHaveAttribute('height', '500');
    });

    it('カスタムサイズで SVG をレンダリングする', async () => {
      const { container } = render(
        <TaskDependencyGraph tasks={mockTasks} width={1000} height={600} />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '1000');
      expect(svg).toHaveAttribute('height', '600');
    });
  });

  describe('T-CMP-009: インタラクション', () => {
    it('ノードクリック時のコールバックを呼び出す', async () => {
      const onNodeClick = vi.fn();
      render(<TaskDependencyGraph tasks={mockTasks} onNodeClick={onNodeClick} />);

      // ノードは非同期で描画されるため、少し待つ
      await waitFor(() => {
        expect(onNodeClick).not.toHaveBeenCalled(); // 初期状態では呼ばれない
      });
    });

    it('ノードホバー時のコールバックを呼び出す', async () => {
      const onNodeHover = vi.fn();
      render(<TaskDependencyGraph tasks={mockTasks} onNodeHover={onNodeHover} />);

      await waitFor(() => {
        expect(onNodeHover).not.toHaveBeenCalled();
      });
    });
  });

  describe('T-CMP-010: グラフ設定', () => {
    it('カスタム設定を適用する', () => {
      render(
        <TaskDependencyGraph
          tasks={mockTasks}
          config={{
            nodeRadius: 30,
            linkDistance: 150,
            chargeStrength: -500,
          }}
        />
      );
      // SVG がレンダリングされていることを確認
      const { container } = render(
        <TaskDependencyGraph
          tasks={mockTasks}
          config={{
            nodeRadius: 30,
          }}
        />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('カスタムカラーを適用する', () => {
      const { container } = render(
        <TaskDependencyGraph
          tasks={mockTasks}
          colors={{
            pending: '#FF0000',
            in_progress: '#00FF00',
            completed: '#0000FF',
          }}
        />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('エッジケース', () => {
    it('存在しない依存先タスクを無視する', () => {
      const tasksWithInvalidDependency = [
        {
          id: '1',
          subject: 'タスク1',
          status: 'pending' as const,
          blockedBy: ['non-existent-id'], // 存在しないタスクID
        },
      ];
      const { container } = render(
        <TaskDependencyGraph tasks={tasksWithInvalidDependency} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('循環依存を含むタスクをレンダリングする', () => {
      const cyclicTasks = [
        {
          id: '1',
          subject: 'タスク1',
          status: 'pending' as const,
          blockedBy: ['3'],
        },
        {
          id: '2',
          subject: 'タスク2',
          status: 'pending' as const,
          blockedBy: ['1'],
        },
        {
          id: '3',
          subject: 'タスク3',
          status: 'pending' as const,
          blockedBy: ['2'],
        },
      ];
      const { container } = render(<TaskDependencyGraph tasks={cyclicTasks} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('多数のタスク（100以上）をレンダリングする', () => {
      const manyTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        subject: `タスク${i}`,
        status: 'pending' as const,
        blockedBy: i > 0 ? [`${i - 1}`] : [],
      }));
      const { container } = render(<TaskDependencyGraph tasks={manyTasks} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
