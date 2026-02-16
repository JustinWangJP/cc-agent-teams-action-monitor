/**
 * メッセージ関連の TypeScript 型定義。
 *
 * InboxMessage、ProtocolMessage、ActivityEvent、WebSocketMessage インターフェースを定義し、
 * エージェント間通信とリアルタイム更新を型安全に管理します。
 *
 * @
 */

/**
 * インボックスメッセージを表すインターフェース。
 *
 * 送信者、メッセージ本文、タイムスタンプ、既読フラグ等を持ちます。
 * エージェント間のメッセージ通信に使用されます。
 */
export interface InboxMessage {
  from: string;
  text: string;
  summary?: string;
  timestamp: string;
  color?: string;
  read: boolean;
}

/**
 * プロトコルメッセージを表すインターフェース。
 *
 * メッセージタイプ、送信者、リクエストID等を持ちます。
 * Claude Code エージェント間の JSON-in-JSON 通信に使用されます。
 */
export interface ProtocolMessage {
  type: string;
  from?: string;
  timestamp?: string;
  requestId?: string;
  idleReason?: string;
  reason?: string;
}

/**
 * アクティビティイベントを表すインターフェース。
 *
 * イベントID、タイプ、チーム名、エージェント名、コンテンツ、タイムスタンプを持ちます。
 * message/task_update/member_join/member_leave のタイプを取ります。
 */
export interface ActivityEvent {
  id: string;
  type: 'message' | 'task_update' | 'member_join' | 'member_leave';
  teamName: string;
  agentName: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket メッセージを表すインターフェース。
 *
 * メッセージタイプ、チーム名、タスクID、エージェント名、データ等を持ちます。
 * team_update/task_update/inbox_update 等のタイプを取ります。
 */
export interface WebSocketMessage {
  type: string;
  team?: string;
  task_id?: string;
  data?: unknown;
  agent?: string;
  event?: string;
  messages?: InboxMessage[];
}
