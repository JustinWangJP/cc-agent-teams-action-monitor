/**
 * メッセージ関連の TypeScript 型定義。
 *
 * InboxMessage、ProtocolMessage、ActivityEvent、WebSocketMessage インターフェースを定義し、
 * エージェント間通信とリアルタイム更新を型安全に管理します。
 *
 * @module types/message
 */

/**
 * インボックスメッセージを表すインターフェース。
 *
 * 送信者、メッセージ本文、タイムスタンプ、既読フラグ等を持ちます。
 * エージェント間のメッセージ通信に使用されます。
 */
export interface InboxMessage {
  from: string;
  to?: string;
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
  | 'shutdown_response'
  | 'shutdown_approved'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'unknown';

/**
 * メッセージタイプ別の表示データ。
 */
export interface MessageDisplayData {
  /** 一覧表示用の短いテキスト */
  summary: string;
  /** 詳細パネル用の長いテキスト */
  detail?: string;
  /** アイコン絵文字 */
  icon: string;
  /** Tailwind色クラス（背景色とテキスト色） */
  colorClass: string;
}

/**
 * メッセージタイプ別の表示データを生成する関数です。
 *
 * プロトコルメッセージの種類に応じて、適切なサマリー、詳細、アイコン、
 * 色クラスを返します。未定義タイプはデフォルトのメッセージ表示になります。
 *
 * @param data - パース済みのメッセージデータ（Record形式）
 * @returns メッセージタイプに応じた表示データ（summary, detail, icon, colorClass）
 *
 */
export const renderMessageByType = (data: Record<string, unknown>): MessageDisplayData => {
  const type = data.type as string;

  switch (type) {
    case 'task_assignment':
      return {
        summary: data.subject as string || 'タスク割り当て',
        detail: data.description as string,
        icon: '📋',
        colorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      };

    case 'idle_notification': {
      const reason = data.idleReason as string;
      return {
        summary: reason === 'available' ? '指示待機中' : `アイドル: ${reason || '理由不明'}`,
        icon: '💤',
        colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      };
    }

    case 'shutdown_request':
      return {
        summary: 'シャットダウン要求',
        detail: data.reason as string,
        icon: '🛑',
        colorClass: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      };

    case 'shutdown_response':
      return {
        summary: `シャットダウン応答: ${(data.approve as boolean) ? '承認' : '却下'}`,
        detail: data.content as string,
        icon: '✅',
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      };

    case 'shutdown_approved':
      return {
        summary: 'シャットダウン了承済み',
        icon: '✔️',
        colorClass: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      };

    case 'plan_approval_request':
      return {
        summary: 'プラン承認要求',
        detail: data.reason as string,
        icon: '📄',
        colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      };

    case 'plan_approval_response':
      return {
        summary: `プラン承認: ${(data.approve as boolean) ? '承認' : '修正要求'}`,
        detail: data.content as string,
        icon: '📝',
        colorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      };

    default:
      return {
        summary: (data.summary as string) || (data.text as string) || 'メッセージ',
        icon: '💬',
        colorClass: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
      };
  }
};

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
