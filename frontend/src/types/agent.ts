/**
 * エージェント関連の TypeScript 型定義。
 *
 * エージェントの状態、進捗、タスク情報を管理します。
 *
 * @module types/agent
 */

/**
 * エージェントの状態。
 */
export type AgentStatusType = 'idle' | 'active' | 'working' | 'completed' | 'error';

/**
 * 拡張エージェント状態。
 *
 * セッションログとタスク状態から推論したエージェントの詳細情報。
 */
export interface AgentStatus {
  /** エージェントID */
  agentId: string;
  /** エージェント名 */
  name: string;

  // 状態
  /** 現在の状態 */
  status: AgentStatusType;
  /** 進捗（0-100） */
  progress: number;

  // 詳細情報
  /** 使用モデル */
  model: string;
  /** 表示色 */
  color: string;
  /** 最終活動時刻（ISO 8601形式） */
  lastActivityAt: string;

  // タスク情報
  /** 現在のタスクID */
  currentTaskId: string | null;
  /** 現在のタスク件名 */
  currentTaskSubject: string | null;
  /** 担当タスクIDリスト */
  assignedTasks: string[];
  /** 完了タスクIDリスト */
  completedTasks: string[];

  // ファイル情報
  /** 関連ファイルパスリスト */
  touchedFiles: string[];
}

/**
 * エージェント状態別の設定。
 */
export interface AgentStatusConfig {
  /** アイコン */
  icon: string;
  /** 表示ラベル */
  label: string;
  /** 背景色クラス */
  bgClass: string;
  /** テキスト色クラス */
  textClass: string;
  /** ボーダー色クラス */
  borderClass: string;
}

/**
 * エージェント状態別の設定マップ。
 */
export const AGENT_STATUS_CONFIG: Record<AgentStatusType, AgentStatusConfig> = {
  idle: {
    icon: '💤',
    label: '待機中',
    bgClass: 'bg-yellow-50 dark:bg-yellow-900/20',
    textClass: 'text-yellow-800 dark:text-yellow-300',
    borderClass: 'border-yellow-300 dark:border-yellow-700',
  },
  active: {
    icon: '🟢',
    label: 'アクティブ',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    textClass: 'text-green-800 dark:text-green-300',
    borderClass: 'border-green-300 dark:border-green-700',
  },
  working: {
    icon: '🔵',
    label: '作業中',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    textClass: 'text-blue-800 dark:text-blue-300',
    borderClass: 'border-blue-300 dark:border-blue-700',
  },
  completed: {
    icon: '✅',
    label: '完了',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    textClass: 'text-green-800 dark:text-green-300',
    borderClass: 'border-green-300 dark:border-green-700',
  },
  error: {
    icon: '❌',
    label: 'エラー',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    textClass: 'text-red-800 dark:text-red-300',
    borderClass: 'border-red-300 dark:border-red-700',
  },
};

/**
 * エージェント状態設定を取得するヘルパー関数。
 *
 * @param status - エージェント状態
 * @returns 状態設定
 */
export function getAgentStatusConfig(status: AgentStatusType): AgentStatusConfig {
  return AGENT_STATUS_CONFIG[status] || AGENT_STATUS_CONFIG.idle;
}

/**
 * プログレスバーの色を取得するヘルパー関数。
 *
 * @param progress - 進捗（0-100）
 * @param status - エージェント状態
 * @returns Tailwind CSS クラス
 */
export function getProgressColorClass(progress: number, status: AgentStatusType): string {
  if (status === 'error') {
    return 'bg-red-500';
  }
  if (status === 'completed') {
    return 'bg-green-500';
  }
  if (progress >= 80) {
    return 'bg-green-500';
  }
  if (progress >= 50) {
    return 'bg-blue-500';
  }
  if (progress >= 25) {
    return 'bg-yellow-500';
  }
  return 'bg-slate-500';
}
