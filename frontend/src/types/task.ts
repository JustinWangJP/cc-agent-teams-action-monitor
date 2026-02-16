/**
 * タスク関連の TypeScript 型定義。
 *
 * Task、TaskSummary インターフェースを定義し、
 * Claude Code Agent Teams のタスク管理を型安全に行います。
 *
*/

/**
 * タスク詳細情報を表すインターフェース。
 *
 * タスクID、件名、ステータス、担当者、依存関係、メタデータを持ちます。
 * pending/in_progress/completed/deleted のステータスを取ります。
 */
export interface Task {
  id: string;
  subject: string;
  description?: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  owner?: string;
  blocks: string[];
  blockedBy: string[];
  metadata?: Record<string, unknown>;
  teamName?: string;
}

/**
 * タスク一覧表示用のサマリーインターフェース。
 *
 * タスクID、件名、ステータス、担当者、依存タスク数を持ちます。
 * 一覧画面での高速表示用に最適化されています。
 */
export interface TaskSummary {
  id: string;
  subject: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  owner?: string;
  blockedCount: number;
  teamName?: string;
}
