/**
 * ステータス関連の共通ユーティリティ
 *
 * チーム・タスクのステータスに応じた色や判定ロジックを提供します。
 */

/**
 * チームステータス型
 */
export type TeamStatus = 'active' | 'stopped' | 'inactive' | 'unknown';

/**
 * タスクステータス型
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

/**
 * チームのボーダー色マッピング
 */
export const TEAM_BORDER_COLORS: Record<TeamStatus, string> = {
  active: 'border-green-500 dark:border-green-400',
  stopped: 'border-gray-400 dark:border-gray-600 opacity-70',
  inactive: 'border-gray-300 dark:border-gray-700 opacity-60',
  unknown: 'border-yellow-400 dark:border-yellow-600 opacity-70',
};

/**
 * タスクのボーダー色マッピング
 */
export const TASK_BORDER_COLORS: Record<TaskStatus, string> = {
  pending: 'border-l-gray-400',
  in_progress: 'border-l-blue-500',
  completed: 'border-l-green-500',
  deleted: 'border-l-red-500',
};

/**
 * デフォルトのボーダー色
 */
export const DEFAULT_BORDER_COLOR = 'border-primary-500 dark:border-primary-400';
export const DEFAULT_TASK_BORDER_COLOR = 'border-l-gray-400';

/**
 * 削除可能なチームステータス一覧
 * active 状態以外は削除可能
 */
export const DELETABLE_TEAM_STATUSES: TeamStatus[] = ['stopped', 'inactive', 'unknown'];

/**
 * チームステータスに応じたボーダー色を取得
 *
 * @param status - チームステータス
 * @returns Tailwind CSS クラス文字列
 */
export function getTeamBorderClass(status: string): string {
  return TEAM_BORDER_COLORS[status as TeamStatus] ?? DEFAULT_BORDER_COLOR;
}

/**
 * タスクステータスに応じたボーダー色を取得
 *
 * @param status - タスクステータス
 * @returns Tailwind CSS クラス文字列
 */
export function getTaskBorderClass(status: string): string {
  return TASK_BORDER_COLORS[status as TaskStatus] ?? DEFAULT_TASK_BORDER_COLOR;
}

/**
 * チームが削除可能かどうかを判定
 *
 * @param status - チームステータス
 * @returns 削除可能な場合 true
 */
export function isTeamDeletable(status: string): boolean {
  return DELETABLE_TEAM_STATUSES.includes(status as TeamStatus);
}
