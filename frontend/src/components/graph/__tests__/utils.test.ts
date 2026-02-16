/**
 * グラフユーティリティ関数の単体テスト。
 *
 * @module components/graph/__tests__/utils.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildNodesFromTasks,
  buildEdgesFromTasks,
  truncateLabel,
  getStatusColor,
  getStatusIcon,
  mergeConfig,
  statusToOrder,
  DEFAULT_GRAPH_CONFIG,
  DEFAULT_STATUS_COLORS,
} from '../utils';
import type { TaskNode } from '../types';

describe('グラフユーティリティ関数', () => {
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
    {
      id: '4',
      subject: '削除されたタスク',
      status: 'deleted' as const,
      owner: 'agent-4',
      blockedBy: ['3'],
      teamName: 'test-team',
    },
  ];

  describe('buildNodesFromTasks', () => {
    it('T-UTIL-001: タスク配列からノード配列を正しく生成する', () => {
      const nodes = buildNodesFromTasks(mockTasks);

      expect(nodes).toHaveLength(4);
      expect(nodes[0]).toMatchObject({
        id: '1',
        label: '最初のタスク',
        subject: '最初のタスク',
        status: 'completed',
        owner: 'agent-1',
        teamName: 'test-team',
      });
    });

    it('T-UTIL-002: 必須プロパティを含むノードを生成する', () => {
      const nodes = buildNodesFromTasks(mockTasks);
      const node = nodes[0];

      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('label');
      expect(node).toHaveProperty('subject');
      expect(node).toHaveProperty('status');
      expect(node).toHaveProperty('x');
      expect(node).toHaveProperty('y');
      expect(node).toHaveProperty('vx');
      expect(node).toHaveProperty('vy');
      expect(node).toHaveProperty('index');
    });

    it('T-UTIL-003: 空配列からは空のノード配列を生成する', () => {
      const nodes = buildNodesFromTasks([]);
      expect(nodes).toEqual([]);
    });
  });

  describe('buildEdgesFromTasks', () => {
    it('T-UTIL-004: blockedBy からエッジ配列を正しく生成する', () => {
      const edges = buildEdgesFromTasks(mockTasks);

      expect(edges).toHaveLength(3);
      expect(edges[0]).toEqual({
        source: '1',
        target: '2',
      });
      expect(edges[1]).toEqual({
        source: '2',
        target: '3',
      });
      expect(edges[2]).toEqual({
        source: '3',
        target: '4',
      });
    });

    it('T-UTIL-005: 存在しない依存先は除外する', () => {
      const tasksWithInvalidRef = [
        {
          id: '1',
          subject: 'タスク1',
          status: 'pending' as const,
          blockedBy: ['non-existent'], // 存在しないタスクID
        },
      ];
      const edges = buildEdgesFromTasks(tasksWithInvalidRef);
      expect(edges).toHaveLength(0);
    });

    it('T-UTIL-006: 複数の依存関係を持つタスクを正しく処理する', () => {
      const tasksWithMultipleDeps = [
        {
          id: '1',
          subject: 'タスク1',
          status: 'pending' as const,
          blockedBy: [],
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
          blockedBy: ['1', '2'], // 複数の依存
        },
      ];
      const edges = buildEdgesFromTasks(tasksWithMultipleDeps);
      expect(edges).toHaveLength(3);
    });
  });

  describe('truncateLabel', () => {
    it('T-UTIL-007: 短いラベルをそのまま返す', () => {
      expect(truncateLabel('短い', 20)).toBe('短い');
    });

    it('T-UTIL-008: 長いラベルを省略する', () => {
      expect(truncateLabel('これは非常に長いラベルです', 10)).toBe('これは非常...');
    });

    it('T-UTIL-009: 最大長ちょうどのラベルを省略しない', () => {
      expect(truncateLabel('1234567890', 10)).toBe('1234567890');
    });

    it('T-UTIL-010: 最大長+1のラベルを省略する', () => {
      expect(truncateLabel('12345678901', 10)).toBe('12345...');
    });
  });

  describe('getStatusColor', () => {
    it('T-UTIL-011: デフォルトカラーを正しく返す', () => {
      expect(getStatusColor('pending')).toBe(DEFAULT_STATUS_COLORS.pending);
      expect(getStatusColor('in_progress')).toBe(DEFAULT_STATUS_COLORS.in_progress);
      expect(getStatusColor('completed')).toBe(DEFAULT_STATUS_COLORS.completed);
      expect(getStatusColor('deleted')).toBe(DEFAULT_STATUS_COLORS.deleted);
    });

    it('T-UTIL-012: カスタムカラーを正しく適用する', () => {
      const customColors = {
        pending: '#AAAAAA',
        in_progress: '#BBBBBB',
      };
      expect(getStatusColor('pending', customColors)).toBe('#AAAAAA');
      expect(getStatusColor('in_progress', customColors)).toBe('#BBBBBB');
      // 未指定のステータスはデフォルトを使用
      expect(getStatusColor('completed', customColors)).toBe(DEFAULT_STATUS_COLORS.completed);
    });
  });

  describe('getStatusIcon', () => {
    it('T-UTIL-013: 各ステータスに対応するアイコンを返す', () => {
      expect(getStatusIcon('pending')).toBe('⏳');
      expect(getStatusIcon('in_progress')).toBe('🔄');
      expect(getStatusIcon('completed')).toBe('✅');
      expect(getStatusIcon('deleted')).toBe('🗑️');
    });
  });

  describe('mergeConfig', () => {
    it('T-UTIL-014: 引数なしでデフォルト設定を返す', () => {
      const config = mergeConfig();
      expect(config).toEqual(DEFAULT_GRAPH_CONFIG);
    });

    it('T-UTIL-015: カスタム設定をマージする', () => {
      const customConfig = {
        nodeRadius: 30,
        linkDistance: 200,
      };
      const config = mergeConfig(customConfig);

      expect(config.nodeRadius).toBe(30);
      expect(config.linkDistance).toBe(200);
      // 未指定のプロパティはデフォルト値
      expect(config.chargeStrength).toBe(DEFAULT_GRAPH_CONFIG.chargeStrength);
    });
  });

  describe('statusToOrder', () => {
    it('T-UTIL-016: ステータスを正しい順序数値に変換する', () => {
      expect(statusToOrder('completed')).toBe(0);
      expect(statusToOrder('in_progress')).toBe(1);
      expect(statusToOrder('pending')).toBe(2);
      expect(statusToOrder('deleted')).toBe(3);
    });

    it('T-UTIL-017: ソート順序が正しい', () => {
      const statuses: Array<TaskNode['status']> = ['pending', 'in_progress', 'completed', 'deleted'];
      const sorted = [...statuses].sort((a, b) => statusToOrder(a) - statusToOrder(b));

      expect(sorted).toEqual(['completed', 'in_progress', 'pending', 'deleted']);
    });
  });
});
