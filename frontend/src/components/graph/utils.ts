/**
 * タスク依存グラフのユーティリティ関数。
 *
 * @module components/graph/utils
 */

import type { TaskNode, TaskEdge, GraphConfig, StatusColors, TaskDependencyGraphProps } from './types';

/**
 * タスク型（blockedBy はオプション）
 */
type Task = NonNullable<TaskDependencyGraphProps['tasks']>[number];

/**
 * デフォルトのグラフ設定。
 */
export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  nodeRadius: 25,
  nodePadding: 10,
  linkDistance: 120,
  chargeStrength: -400,
  centerStrength: 0.1,
  velocityDecay: 0.6,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
};

/**
 * デフォルトのステータス別カラー。
 */
export const DEFAULT_STATUS_COLORS: StatusColors = {
  pending: '#6B7280',      // gray-500
  in_progress: '#3B82F6',  // blue-500
  completed: '#10B981',    // green-500
  deleted: '#EF4444',      // red-500
};

/**
 * Task オブジェクトから TaskNode 配列を生成します。
 *
 * @param tasks - タスク配列
 * @returns TaskNode 配列
 */
export function buildNodesFromTasks(tasks: Task[]): TaskNode[] {
  return tasks.map((task) => ({
    id: task.id,
    taskId: task.id,
    label: truncateLabel(task.subject, 20),
    subject: task.subject,
    status: task.status,
    owner: task.owner,
    teamName: task.teamName,
    x: undefined,
    y: undefined,
    vx: undefined,
    vy: undefined,
    index: undefined,
  }));
}

/**
 * Task オブジェクトの blockedBy 配列から TaskEdge 配列を生成します。
 *
 * @param tasks - タスク配列
 * @returns TaskEdge 配列
 */
export function buildEdgesFromTasks(tasks: Task[]): TaskEdge[] {
  const edges: TaskEdge[] = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  tasks.forEach((task) => {
    const blockedBy = task.blockedBy || [];
    blockedBy.forEach((blockingId: string) => {
      // 依存先タスクが存在する場合のみエッジを追加
      if (taskIds.has(blockingId)) {
        edges.push({
          source: blockingId,
          target: task.id,
        });
      }
    });
  });

  return edges;
}

/**
 * ラベルを指定文字数で省略します。
 *
 * @param label - 元のラベル
 * @param maxLength - 最大長
 * @returns 省略されたラベル
 */
export function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) {
    return label;
  }
  return label.slice(0, maxLength - 3) + '...';
}

/**
 * ステータスに対応する色を取得します。
 *
 * @param status - タスクステータス
 * @param colors - カスタムカラー設定（オプション）
 * @returns カラーコード（hex）
 */
export function getStatusColor(
  status: TaskNode['status'],
  colors: Partial<StatusColors> = {}
): string {
  const mergedColors = { ...DEFAULT_STATUS_COLORS, ...colors };
  return mergedColors[status] || mergedColors.pending;
}

/**
 * ステータスに対応するアイコンを取得します。
 *
 * @param status - タスクステータス
 * @returns アイコン文字列
 */
export function getStatusIcon(status: TaskNode['status']): string {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'in_progress':
      return '🔄';
    case 'completed':
      return '✅';
    case 'deleted':
      return '🗑️';
    default:
      return '❓';
  }
}

/**
 * 設定をマージして最終的なグラフ設定を取得します。
 *
 * @param customConfig - カスタム設定
 * @returns マージされた設定
 */
export function mergeConfig(customConfig: Partial<GraphConfig> = {}): GraphConfig {
  return { ...DEFAULT_GRAPH_CONFIG, ...customConfig };
}

/**
 * ステータスをソート用の数値に変換します。
 *
 * @param status - タスクステータス
 * @returns ソート用の数値（完了: 0, 進行中: 1, 未着手: 2, 削除: 3）
 */
export function statusToOrder(status: TaskNode['status']): number {
  switch (status) {
    case 'completed':
      return 0;
    case 'in_progress':
      return 1;
    case 'pending':
      return 2;
    case 'deleted':
      return 3;
    default:
      return 4;
  }
}
