/**
 * チーム関連の TypeScript 型定義。
 *
 * Member、Team、TeamSummary インターフェースを定義し、
 * Claude Code Agent Teams のチーム構成を型安全に管理します。
 *
*/

/**
 * チームメンバー情報を表すインターフェース。
 *
 * エージェントID、名前、タイプ、モデル、ステータス等の属性を持ちます。
 * Claude Code で作成されたエージェントの情報を表現します。
 */
export interface Member {
  agentId: string;
  name: string;
  agentType: string;
  model: string;
  joinedAt: number;
  tmuxPaneId?: string;
  cwd: string;
  subscriptions: string[];
  color?: string;
  status: 'active' | 'idle';
  lastActivity?: string;
}

/**
 * チーム詳細情報を表すインターフェース。
 *
 * チーム名、説明、作成日時、リードエージェント、メンバーリストを持ちます。
 * Claude Code で作成されたチームの完全な情報を表現します。
 */
export interface Team {
  name: string;
  description?: string;
  createdAt: number;
  leadAgentId: string;
  leadSessionId?: string;
  members: Member[];
  lastActivity?: string;
}

/**
 * チーム一覧表示用のサマリーインターフェース。
 *
 * チーム名、メンバー数、ステータスを持ち、一覧画面での高速表示用に
 * 最適化されています。
 *
 * モデル情報を含める場合は `models` プロパティを追加してください。
 */
export interface TeamSummary {
  name: string;
  description?: string;
  memberCount: number;
  status: 'active' | 'inactive';
  lastActivity?: string;
  leadAgentId: string;
  /** モデル使用状況（オプション） */
  models?: string[];
  /** プライマリモデル（最も使用されているモデル） */
  primaryModel?: string;
}
