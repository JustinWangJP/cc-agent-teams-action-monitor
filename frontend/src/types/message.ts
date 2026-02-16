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

/**
 * メッセージタイプの列挙。
 *
 * エージェント間通信で使用されるプロトコルメッセージの種類を定義します。
 */
export type MessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_approved'
  | 'task_assignment'
  | 'unknown';

/**
 * パース済みメッセージを表すインターフェース。
 *
 * InboxMessage を拡張し、プロトコルメッセージのパース結果を追加します。
 * text フィールドが JSON かプレインテキストかを自動判定します。
 */
export interface ParsedMessage extends InboxMessage {
  /** パースされたメッセージタイプ */
  parsedType: MessageType;
  /** プロトコルメッセージの場合のパース結果 */
  parsedData?: ProtocolMessage;
  /** 受信者（推定） */
  to?: string;
}

/**
 * メッセージフィルター条件を表すインターフェース。
 *
 * タイムライン表示時のフィルタリング条件を定義します。
 */
export interface MessageFilter {
  /** 送信者でフィルタ（空配列で全送信者） */
  senders: string[];
  /** 受信者でフィルタ（空配列で全受信者） */
  receivers: string[];
  /** メッセージタイプでフィルタ（空配列で全タイプ） */
  types: MessageType[];
  /** 未読のみを表示 */
  unreadOnly: boolean;
}

/**
 * 時間範囲を表すインターフェース。
 *
 * タイムラインの表示期間を定義します。
 */
export interface TimeRange {
  /** 開始時刻 */
  start: Date;
  /** 終了時刻 */
  end: Date;
}
