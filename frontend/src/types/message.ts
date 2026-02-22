/**
 * メッセージ関連の TypeScript 型定義。
 *
 * InboxMessage、ProtocolMessage、ActivityEvent インターフェースを定義し、
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
 * message/task_update/member_join/member_leave/session_event のタイプを取ります。
 *
 * セッションログ統合により session_event タイプを追加。
 */
export interface ActivityEvent {
  id: string;
  type: 'message' | 'task_update' | 'member_join' | 'member_leave' | 'session_event';
  teamName: string;
  agentName: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  /** セッション由来の追加情報（session_event タイプの場合） */
  sessionData?: {
    sessionId: string;
    parsedType: ExtendedParsedType;
    details?: ParsedEvent['details'];
  };
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
  | 'task_completed'
  | 'unknown';

/**
 * タイムラインのデータソース。
 *
 * inbox: エージェント間のメッセージ（既存）
 * session: セッションログ（.jsonl）由来のエントリ（新規）
 */
export type TimelineSource = 'inbox' | 'session';

/**
 * セッションログエントリの基本型。
 *
 * ~/.claude/projects 配下の .jsonl ファイルから読み込まれる生のセッションログエントリ。
 */
export interface SessionEvent {
  /** エントリタイプ */
  type: 'user' | 'assistant' | 'thinking' | 'tool_use' | 'file_change' | 'system' | 'progress';
  /** タイムスタンプ */
  timestamp?: string;
  /** セッションID */
  sessionId?: string;
  /** メッセージ内容（text形式の場合） */
  content?: string;
  /** メッセージ内容（delta形式の場合） */
  delta?: { text?: string; type?: string };
  /** 思考プロセス（thinkingタイプ） */
  thinking?: string;
  /** ツール使用情報（tool_useタイプ） */
  toolUse?: {
    name: string;
    input?: unknown;
    result?: unknown;
  };
  /** ファイル変更情報（file_changeタイプ） */
  fileChange?: {
    path: string;
    operation: 'created' | 'modified' | 'deleted' | 'read';
    version?: number;
  };
  /** その他のデータ */
  [key: string]: unknown;
}

/**
 * パース済みセッションイベント。
 *
 * SessionEvent を解析し、タイムライン表示用に変換したもの。
 */
export interface ParsedEvent {
  /** パースされたタイプ */
  parsedType: ExtendedParsedType;
  /** 表示用コンテンツ */
  content: string;
  /** 送信者（推定） */
  from: string;
  /** タイムスタンプ */
  timestamp: string;
  /** セッションID */
  sessionId: string;
  /** 詳細情報 */
  details?: {
    /** 思考プロセス */
    thinking?: string;
    /** ファイル変更一覧 */
    files?: FileChangeInfo[];
    /** 関連タスクID */
    taskId?: string;
    /** タスク件名 */
    taskSubject?: string;
    /** ツール名 */
    toolName?: string;
    /** ツール入力 */
    toolInput?: unknown;
  };
}

/**
 * 拡張メッセージタイプ。
 *
 * inbox 由来の既存タイプに加え、session 由来のタイプを含む統合タイムライン用。
 */
export type ExtendedParsedType =
  // inbox 由来（既存）
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'task_completed'
  // session 由来（新規）
  | 'user_message'
  | 'assistant_message'
  | 'thinking';

/**
 * ファイル変更情報。
 */
export interface FileChangeInfo {
  /** ファイルパス */
  path: string;
  /** 操作種別 */
  operation: 'created' | 'modified' | 'deleted' | 'read';
  /** ファイルバージョン（省略可能） */
  version?: number;
}

/**
 * 統合タイムラインエントリ。
 *
 * inbox メッセージと session ログを統合したタイムラインエントリ。
 * 既存の ParsedMessage と互換性を保ちつつ、session 由来の詳細情報を追加。
 */
export interface UnifiedTimelineEntry {
  /** エントリID（一意識別子） */
  id: string;
  /** コンテンツ本文 */
  content: string;
  /** ParsedMessage 互換のための text プロパティ（content と同じ値） */
  text?: string;
  /** 送信者（APIレスポンスでは from_ フィールド） */
  from_?: string;
  /** 送信者（変換後のフィールド） */
  from?: string;
  /** 受信者（省略可能） */
  to?: string;
  /** タイムスタンプ（ISO 8601形式） */
  timestamp: string;
  /** 表示色（省略可能） */
  color?: string;
  /** 既読フラグ */
  read?: boolean;
  /** サマリー（省略可能） */
  summary?: string;

  // 拡張フィールド
  /** データソース（inbox | session） */
  source: TimelineSource;
  /** パースされたメッセージタイプ */
  parsedType: ExtendedParsedType;
  /** パースされたデータ（省略可能） */
  parsedData?: Record<string, unknown>;

  // session 由来の詳細情報
  /** 詳細情報（session 由来のエントリに含まれる） */
  details?: {
    /** 思考プロセス（thinking タイプ） */
    thinking?: string;
    /** ファイル変更一覧 */
    files?: FileChangeInfo[];
    /** 関連タスクID */
    taskId?: string;
    /** タスク件名 */
    taskSubject?: string;
    /** ツール名 */
    toolName?: string;
    /** ツール入力 */
    toolInput?: unknown;
  };
}

/**
 * 統合タイムラインアイテム。
 *
 * UnifiedTimelineEntry のエイリアス。
 * タスク割り当てで指定された型名との互換性のため。
 */
export type UnifiedTimelineItem = UnifiedTimelineEntry;

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

/**
 * メッセージタイプ別設定。
 *
 * 統合タイムラインで使用する各タイプのアイコン、色、ラベルを定義。
 */
export interface MessageTypeConfig {
  /** アイコン絵文字 */
  icon: string;
  /** 色（HEX） */
  color: string;
  /** 表示ラベル */
  label: string;
}

/**
 * メッセージタイプ別の設定マップ。
 *
 * inbox 由来と session 由来の両方のタイプ設定を含む。
 */
export const MESSAGE_TYPE_CONFIG: Record<ExtendedParsedType, MessageTypeConfig> = {
  // inbox 由来
  message: {
    icon: '💬',
    color: '#6b7280',
    label: 'メッセージ',
  },
  task_assignment: {
    icon: '📋',
    color: '#3b82f6',
    label: 'タスク割り当て',
  },
  task_completed: {
    icon: '✅',
    color: '#10b981',
    label: 'タスク完了',
  },
  idle_notification: {
    icon: '💤',
    color: '#f59e0b',
    label: 'アイドル通知',
  },
  shutdown_request: {
    icon: '🔌',
    color: '#ef4444',
    label: 'シャットダウン要求',
  },
  shutdown_response: {
    icon: '✓',
    color: '#22c55e',
    label: 'シャットダウン応答',
  },
  plan_approval_request: {
    icon: '📝',
    color: '#8b5cf6',
    label: 'プラン承認要求',
  },
  plan_approval_response: {
    icon: '✅',
    color: '#22c55e',
    label: 'プラン承認応答',
  },
  // session 由来
  user_message: {
    icon: '👤',
    color: '#3b82f6',
    label: 'ユーザーメッセージ',
  },
  assistant_message: {
    icon: '🤖',
    color: '#8b5cf6',
    label: 'AI応答',
  },
  thinking: {
    icon: '💭',
    color: '#9ca3af',
    label: '思考',
  },
};

/**
 * メッセージタイプ設定を取得するヘルパー関数。
 *
 * @param type - メッセージタイプ
 * @returns 該当する設定（未定義タイプの場合はデフォルト値を返す）
 */
export function getMessageTypeConfig(type: ExtendedParsedType): MessageTypeConfig {
  return MESSAGE_TYPE_CONFIG[type] || {
    icon: '❓',
    color: '#6b7280',
    label: '不明',
  };
}

/**
 * メッセージタイプ設定から Tailwind CSS クラスを生成するヘルパー関数。
 *
 * @param type - メッセージタイプ
 * @returns Tailwind CSS クラス文字列（背景色とテキスト色）
 */
export function getMessageTypeColorClass(type: ExtendedParsedType): string {
  const config = getMessageTypeConfig(type);
  const colorMap: Record<string, string> = {
    '#6b7280': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
    '#3b82f6': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    '#10b981': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    '#f59e0b': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    '#ef4444': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    '#22c55e': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    '#8b5cf6': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    '#9ca3af': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    '#06b6d4': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    '#0891b2': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  };
  return colorMap[config.color] || colorMap['#6b7280'];
}

/**
 * 統合タイムラインAPIレスポンス。
 *
 * ChatTimelinePanel パターンに準拠したレスポンス形式。
 * items 配列と最後のタイムスタンプを含む。
 */
export interface UnifiedTimelineResponse {
  /** タイムラインエントリ配列 */
  items: UnifiedTimelineEntry[];
  /** 最後のエントリのタイムスタンプ（差分取得用） */
  lastTimestamp: string;
}
