/**
 * チャットメッセージバブルコンポーネント。
 *
 * 個別メッセージをチャット形式の吹き出しで表示します。
 * ParsedMessage（inbox 由来）と UnifiedTimelineEntry（session 由来）の両方に対応します。
 *
 * @module components/chat/ChatMessageBubble
 */

'use client';

import { memo, useCallback, useState, type ReactNode } from 'react';
import type { ParsedMessage, UnifiedTimelineEntry, FileChangeInfo } from '@/types/message';
import { getMessageTypeConfig, getMessageTypeColorClass, renderMessageByType } from '@/types/message';
import { clsx } from 'clsx';
import { BookmarkButton } from './BookmarkButton';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * 統合メッセージ型。
 *
 * ParsedMessage または UnifiedTimelineEntry のいずれか。
 */
export type TimelineMessage = ParsedMessage | UnifiedTimelineEntry;

/**
 * UnifiedTimelineEntry かどうかを判定する型ガード。
 */
function isUnifiedTimelineEntry(message: TimelineMessage): message is UnifiedTimelineEntry {
  // source が 'session' の場合は UnifiedTimelineEntry
  return 'source' in message && message.source === 'session';
}

/**
 * メッセージタイプに対応するアイコンを取得。
 *
 * MESSAGE_TYPE_CONFIG からアイコンを取得。
 */
const getMessageTypeIcon = (type: string): string => {
  return getMessageTypeConfig(type as any).icon;
};

/**
 * メッセージタイプに対応する色クラスを取得。
 *
 * MESSAGE_TYPE_CONFIG から色クラスを取得。
 */
const getMessageTypeColorClassLocal = (type: string): string => {
  return getMessageTypeColorClass(type as any);
};

/**
 * JSON形式のプロトコルメッセージをパースする。
 *
 * assistant_message の content が JSON 形式の場合、
 * プロトコルメッセージとしてパースして表示データを返す。
 *
 * @param content - パース対象のテキスト
 * @returns パース成功時は MessageDisplayData、失敗時は null
 */
const parseProtocolMessageFromContent = (content: string): { summary: string; detail?: string } | null => {
  if (!content || typeof content !== 'string') {
    return null;
  }

  try {
    const data = JSON.parse(content);
    // プロトコルメッセージの形式かをチェック（type フィールドが必須）
    if (!data.type || typeof data.type !== 'string') {
      return null;
    }

    // renderMessageByType を使用して表示データを取得
    const displayData = renderMessageByType(data as Record<string, unknown>);

    return {
      summary: displayData.summary,
      detail: displayData.detail,
    };
  } catch {
    // JSON パースエラーの場合は null を返す
    return null;
  }
};

/**
 * メッセージタイプに対応する表示用サマリーと詳細を生成。
 *
 * プロトコルメッセージの解析を行い、適切な表示テキストを返す。
 * ParsedMessage と UnifiedTimelineEntry の両方に対応します。
 *
 * @param message タイムラインメッセージ
 * @returns summary（一覧表示用）と detail（詳細表示用、オプション）
 */
const getMessageDisplayText = (message: TimelineMessage): { summary: string; detail?: string } => {
  // 共通プロパティを取得
  const parsedType = isUnifiedTimelineEntry(message) ? message.parsedType : message.parsedType;
  const parsedData = isUnifiedTimelineEntry(message) ? message.parsedData : message.parsedData;
  const msgSummary = isUnifiedTimelineEntry(message) ? message.summary : message.summary;
  const content = isUnifiedTimelineEntry(message) ? message.content : message.text;

  // UnifiedTimelineEntry の場合
  if (isUnifiedTimelineEntry(message)) {
    const { details } = message;

    // session 由来のエントリ
    if (message.source === 'session') {
      switch (parsedType) {
        case 'thinking':
          return {
            summary: '思考中...',
            detail: details?.thinking || content,
          };
        case 'user_message':
          return {
            summary: content,
            detail: content,
          };
        case 'assistant_message':
          // assistant_message の content が JSON 形式のプロトコルメッセージかをチェック
          const protocolDisplay = parseProtocolMessageFromContent(content);
          if (protocolDisplay) {
            // プロトコルメッセージとしてパースできた場合はその表示を使用
            return protocolDisplay;
          }
          // 通常のテキストとして表示
          return {
            summary: msgSummary || content,
            detail: content,
          };
        default:
          return {
            summary: msgSummary || content,
            detail: content,
          };
      }
    }

    // inbox 由来のエントリ（UnifiedTimelineEntry として）
    if (parsedData && typeof parsedData === 'object') {
      const data = parsedData as Record<string, unknown>;

      switch (parsedType) {
        case 'task_assignment':
          return {
            summary: (data.subject as string) || msgSummary || 'タスク割り当て',
            detail: (data.description as string) || undefined,
          };

        case 'task_completed':
          return {
            summary: `タスク完了: ${data.taskId || ''}`,
            detail: data.content as string | undefined,
          };

        case 'idle_notification': {
          const reason = data.idleReason as string;
          if (reason === 'available') {
            return { summary: '指示待機中' };
          }
          return { summary: `アイドル: ${reason || '理由不明'}` };
        }

        case 'shutdown_request':
          return {
            summary: 'シャットダウン要求',
            detail: (data.reason as string) || undefined,
          };

        case 'shutdown_response': {
          const approve = data.approve as boolean;
          return {
            summary: approve ? 'シャットダウン応答: 承認' : 'シャットダウン応答: 却下',
          };
        }

        case 'plan_approval_request':
          return {
            summary: 'プラン承認要求',
            detail: (data.reason as string) || undefined,
          };

        case 'plan_approval_response': {
          const planApprove = data.approve as boolean;
          return {
            summary: planApprove ? 'プラン承認: 承認' : 'プラン承認: 修正要求',
          };
        }

        default:
          break;
      }
    }

    return {
      summary: msgSummary || content,
      detail: msgSummary ? content : undefined,
    };
  }

  // ParsedMessage（既存の inbox メッセージ）の場合
  if (parsedData && typeof parsedData === 'object') {
    const data = parsedData as unknown as Record<string, unknown>;

    switch (parsedType) {
      case 'task_assignment':
        return {
          summary: (data.subject as string) || msgSummary || 'タスク割り当て',
          detail: (data.description as string) || undefined,
        };

      case 'idle_notification': {
        const reason = data.idleReason as string;
        if (reason === 'available') {
          return { summary: '指示待機中' };
        }
        return { summary: `アイドル: ${reason || '理由不明'}` };
      }

      case 'shutdown_request':
        return {
          summary: 'シャットダウン要求',
          detail: (data.reason as string) || undefined,
        };

      case 'shutdown_response': {
        const approve = data.approve as boolean;
        return {
          summary: approve ? 'シャットダウン応答: 承認' : 'シャットダウン応答: 却下',
        };
      }

      case 'shutdown_approved':
        return { summary: 'シャットダウン了承済み' };

      case 'plan_approval_request':
        return {
          summary: 'プラン承認要求',
          detail: (data.reason as string) || undefined,
        };

      case 'plan_approval_response': {
        const planApprove = data.approve as boolean;
        return {
          summary: planApprove ? 'プラン承認: 承認' : 'プラン承認: 修正要求',
        };
      }

      default:
        break;
    }
  }

  return {
    summary: msgSummary || content || 'メッセージ',
    detail: msgSummary ? content : undefined,
  };
};

/**
 * User/AIメッセージ用の色設定を取得。
 *
 * session由来のuser_message/assistant_message用のスタイルを返す。
 */
const getUserAIColor = (
  parsedType: string | undefined
): { bg: string; text: string; border: string; icon: string; displayName: string } | null => {
  if (parsedType === 'user_message') {
    return {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: '👤',
      displayName: 'User',
    };
  }
  if (parsedType === 'assistant_message') {
    return {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
      icon: '🤖',
      displayName: 'AI Assistant',
    };
  }
  return null;
};

/**
 * エージェント名から一意の色を生成。
 */
const getAgentColor = (agentName: string | undefined): { bg: string; text: string; border: string } => {
  // 事前定義された色マッピング
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'team-lead': {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    'backend-dev': {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    'frontend-dev': {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
    'reviewer': {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
  };

  const name = agentName || 'unknown';

  return (
    colorMap[name] || {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
    }
  );
};

/**
 * エージェント名の頭文字を取得。
 * User/AIメッセージの場合はアイコン絵文字を返す。
 */
const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const parts = name.split(/[-_]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * テキストをハイライト表示する関数。
 */
const highlightText = (text: string, query: string): ReactNode => {
  if (!query) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-700/50 text-yellow-900 dark:text-yellow-100 rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
};

/**
 * 安全に日付をフォーマットする関数。
 *
 * @param timestamp - タイムスタンプ
 * @param showAbsolute - 絶対時刻を表示するかどうか
 * @returns フォーマットされた日時文字列
 */
const safeFormatDate = (
  timestamp: string | number | Date | undefined
): string => {
  if (!timestamp) return '日時不明';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '無効な日時';
    }

    // 常に具体的な時刻を表示
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '無効な日時';
  }
};

/**
 * 具体的な時刻を表示する関数。
 *
 * @param timestamp - タイムスタンプ
 * @returns フォーマットされた日時文字列
 */
const formatFullDate = (timestamp: string | number | Date | undefined): string => {
  if (!timestamp) return '日時不明';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '無効な日時';
    }

    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '無効な日時';
  }
};

/**
 * テキストがMarkdown形式かどうかを判定。
 *
 * Markdownの特徴的なパターンを検出:
 * - ヘッダー (# )
 * - リスト (- , * , 1. )
 * - コードブロック (```)
 * - 太字/斜体 (**, *)
 * - リンク ([text](url))
 * - コード (`code`)
 */
const isMarkdown = (text: string): boolean => {
  if (!text) return false;

  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,                    // ヘッダー
    /^[-*+]\s+.+$/m,                     // 箇条書き
    /^\d+\.\s+.+$/m,                     // 番号付きリスト
    /```[\s\S]*?```/,                    // コードブロック
    /\*\*.+?\*\*/,                       // 太字
    /\*.+?\*/,                           // 斜体
    /\[.+?\]\(.+?\)/,                    // リンク
    /`[^`]+`/,                           // インラインコード
    /^>\s+.+$/m,                         // 引用
    /^---+$/m,                           // 水平線
  ];

  return markdownPatterns.some(pattern => pattern.test(text));
};

/**
 * Markdownをレンダリングするコンポーネント。
 *
 * GitHub Flavored Markdown (GFM) に対応し、
 * 適切なスタイリングを適用する。
 */
interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = memo<MarkdownRendererProps>(({ content, className }) => {
  return (
    <div
      className={clsx(
        'markdown-content',
        // 基本スタイル
        'text-inherit',
        // 見出し
        '[&>h1]:text-lg [&>h1]:font-bold [&>h1]:mt-2 [&>h1]:mb-1',
        '[&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-2 [&>h2]:mb-1',
        '[&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mt-1 [&>h3]:mb-1',
        // リスト
        '[&>ul]:list-disc [&>ul]:pl-4 [&>ul]:my-1',
        '[&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:my-1',
        '[&>li]:my-0.5',
        // コードブロック
        '[&>pre]:bg-slate-800 [&>pre]:text-slate-100 [&>pre]:p-2 [&>pre]:rounded [&>pre]:my-1 [&>pre]:overflow-x-auto',
        '[&>pre>code]:text-xs',
        // インラインコード
        '[&>code]:bg-slate-200 [&>code]:dark:bg-slate-700 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-xs',
        // リンク
        '[&>a]:text-blue-600 [&>a]:dark:text-blue-400 [&>a]:underline [&>a]:hover:text-blue-800',
        // 引用
        '[&>blockquote]:border-l-4 [&>blockquote]:border-slate-400 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:my-1',
        // 水平線
        '[&>hr]:border-slate-300 [&>hr]:my-2',
        // 段落
        '[&>p]:my-1',
        // テーブル（GitHubスタイル）
        '[&>table]:w-full [&>table]:border-collapse [&>table]:my-2 [&>table]:overflow-x-auto',
        '[&>table>thead>tr]:border-b-2 [&>table>thead>tr]:border-slate-300 [&>table>thead>tr]:dark:border-slate-600',
        '[&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:p-3 [&>table>thead>tr>th]:bg-slate-100 [&>table>thead>tr>th]:dark:bg-slate-700 [&>table>thead>tr>th]:font-bold [&>table>thead>tr>th]:text-slate-900 [&>table>thead>tr>th]:dark:text-slate-100',
        '[&>table>tbody>tr]:border-b [&>table>tbody>tr]:border-slate-200 [&>table>tbody>tr]:dark:border-slate-700',
        '[&>table>tbody>tr>td]:p-3 [&>table>tbody>tr>td]:align-top [&>table>tbody>tr>td]:text-slate-700 [&>table>tbody>tr>td]:dark:text-slate-300',
        '[&>table>tbody>tr:nth-child(even)]:bg-slate-50 [&>table>tbody>tr:nth-child(even)]:dark:bg-slate-800/70',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

/**
 * Session 由来の詳細表示コンポーネント。
 *
 * UnifiedTimelineEntry の details フィールドを表示します。
 * thinking、ファイル変更、ツール使用などの詳細情報を折りたたみ可能で表示します。
 */
interface SessionDetailsProps {
  details?: UnifiedTimelineEntry['details'];
  parsedType: string;
}

const SessionDetails = memo<SessionDetailsProps>(({ details, parsedType: _parsedType }) => {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  if (!details) return null;

  // 折りたたみ可能な詳細を持つタイプ
  const hasExpandableContent =
    details.thinking ||
    (details.files && details.files.length > 0);

  if (!hasExpandableContent) return null;

  return (
    <div className="mt-2 space-y-2 text-sm">
      {/* thinking ブロック */}
      {details.thinking && (
        <details
          className="bg-slate-100 dark:bg-slate-800 rounded p-2 group/details"
          open={isThinkingExpanded}
          onToggle={(e) => setIsThinkingExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 select-none">
            <span className="inline-flex items-center gap-1">
              💭 思考プロセス
              <span className="text-xs opacity-50 group-open/details:rotate-90 transition-transform">▶</span>
            </span>
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">
            {details.thinking}
          </pre>
        </details>
      )}

      {/* ファイル変更 */}
      {details.files && details.files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {details.files.map((file, i) => (
            <FileChangeBadge key={i} file={file} />
          ))}
        </div>
      )}
    </div>
  );
});

SessionDetails.displayName = 'SessionDetails';

/**
 * ファイル変更バッジコンポーネント。
 *
 * 個別のファイル変更を操作種別アイコン付きで表示します。
 */
interface FileChangeBadgeProps {
  file: FileChangeInfo;
}

const FileChangeBadge = memo<FileChangeBadgeProps>(({ file }) => {
  const operationConfig: Record<FileChangeInfo['operation'], { icon: string; label: string; class: string }> = {
    read: {
      icon: '📖',
      label: '読み取り',
      class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    created: {
      icon: '✨',
      label: '作成',
      class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    modified: {
      icon: '✏️',
      label: '変更',
      class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    deleted: {
      icon: '🗑️',
      label: '削除',
      class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const config = operationConfig[file.operation];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
        config.class
      )}
      title={`${config.label}: ${file.path}`}
    >
      <span>{config.icon}</span>
      <span className="max-w-[200px] truncate">{file.path}</span>
    </span>
  );
});

FileChangeBadge.displayName = 'FileChangeBadge';

/**
 * メタデータ表示コンポーネント。
 *
 * セッション由来のメタデータ（タスク情報、セッションIDなど）を表示します。
 */
interface MetadataDisplayProps {
  /** UnifiedTimelineEntry のメタデータ */
  metadata?: {
    /** セッションID */
    sessionId?: string;
    /** タスクID */
    taskId?: string;
    /** タスク件名 */
    taskSubject?: string;
    /** モデル名 */
    model?: string;
  };
  /** 表示を折りたたむかどうか */
  collapsible?: boolean;
}

const MetadataDisplay = memo<MetadataDisplayProps>(({ metadata, collapsible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata) return null;

  const hasMetadata =
    metadata.sessionId ||
    metadata.taskId ||
    metadata.taskSubject ||
    metadata.model;

  if (!hasMetadata) return null;

  return (
    <details
      className={clsx(
        'mt-2 bg-slate-50 dark:bg-slate-800/50 rounded p-2 text-xs',
        'border border-slate-200 dark:border-slate-700'
      )}
      open={collapsible ? isExpanded : true}
      onToggle={(e) => collapsible && setIsExpanded((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 select-none flex items-center gap-1">
        <span>📋 メタデータ</span>
        {collapsible && (
          <span className="text-xs opacity-50 group-open/metadata:rotate-90 transition-transform">▶</span>
        )}
      </summary>
      <dl className="mt-2 space-y-1">
        {metadata.sessionId && (
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400 min-w-[80px]">セッションID:</dt>
            <dd className="text-slate-700 dark:text-slate-300 font-mono truncate">
              {metadata.sessionId.slice(0, 8)}...
            </dd>
          </div>
        )}
        {metadata.taskId && (
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400 min-w-[80px]">タスクID:</dt>
            <dd className="text-slate-700 dark:text-slate-300 font-mono">#{metadata.taskId}</dd>
          </div>
        )}
        {metadata.taskSubject && (
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400 min-w-[80px]">タスク:</dt>
            <dd className="text-slate-700 dark:text-slate-300">{metadata.taskSubject}</dd>
          </div>
        )}
        {metadata.model && (
          <div className="flex gap-2">
            <dt className="text-slate-500 dark:text-slate-400 min-w-[80px]">モデル:</dt>
            <dd className="text-slate-700 dark:text-slate-300">{metadata.model}</dd>
          </div>
        )}
      </dl>
    </details>
  );
});

MetadataDisplay.displayName = 'MetadataDisplay';

/**
 * チャットメッセージバブルのプロパティ。
 */
export interface ChatMessageBubbleProps {
  /** メッセージデータ（ParsedMessage または UnifiedTimelineEntry） */
  message: TimelineMessage;
  /** ハイライト表示（検索結果など） */
  isHighlighted?: boolean;
  /** 検索クエリ（テキストハイライト用） */
  searchQuery?: string;
  /** クリックハンドラー */
  onClick?: (message: TimelineMessage) => void;
  /** 選択中のメッセージかどうか */
  isSelected?: boolean;
  /** ブックマーク機能を有効にするかどうか */
  showBookmark?: boolean;
  /** 絶対時刻を表示するかどうか */
  showAbsoluteTime?: boolean;
  /** メタデータを表示するかどうか */
  showMetadata?: boolean;
}

/**
 * チャットメッセージバブルコンポーネント。
 *
 * 個別メッセージを吹き出し形式で表示します。
 * ParsedMessage（inbox 由来）と UnifiedTimelineEntry（session 由来）の両方に対応します。
 *
 * @example
 * ```tsx
 * <ChatMessageBubble
 *   message={message}
 *   isHighlighted={false}
 *   onClick={handleClick}
 *   isSelected={false}
 * />
 * ```
 */
export const ChatMessageBubble = memo<ChatMessageBubbleProps>(
  ({
    message,
    isHighlighted = false,
    searchQuery = '',
    onClick,
    isSelected = false,
    showBookmark = true,
    showAbsoluteTime = false,
    showMetadata = false,
  }) => {
    // データソース判定: sessionは左側、inboxは右側
    const isSession = isUnifiedTimelineEntry(message) && message.source === 'session';

    // fromフィールドがundefinedの場合の安全対策
    const safeFrom = message.from || 'Unknown';

    // UnifiedTimelineEntry か ParsedMessage かに応じて処理を分岐
    const parsedType = isUnifiedTimelineEntry(message)
      ? message.parsedType
      : message.parsedType;

    // User/AIメッセージ用の色設定を取得
    const userAIColor = getUserAIColor(parsedType);
    const colors = userAIColor || getAgentColor(safeFrom);

    const typeIcon = getMessageTypeIcon(parsedType);
    const typeColorClass = getMessageTypeColorClassLocal(parsedType);
    // User/AIメッセージの場合はアイコン絵文字、それ以外は頭文字
    const initials = userAIColor?.icon || getInitials(safeFrom);
    // User/AIメッセージの場合は displayName、それ以外は from
    const displayName = userAIColor?.displayName || safeFrom;
    const formattedTime = safeFormatDate(message.timestamp);

    // メッセージ表示用テキストを生成（タイプ別ロジック）
    const { summary: messageSummary, detail: messageDetail } = getMessageDisplayText(message);
    const messageText = messageSummary;

    // メッセージID（ブックマーク用）
    const messageId = `${message.timestamp}-${safeFrom}`;

    // メタデータの抽出
    const metadata = isUnifiedTimelineEntry(message) && message.source === 'session'
      ? {
          sessionId: message.details?.taskId ? undefined : (message as any).sessionId,
          taskId: message.details?.taskId,
          taskSubject: message.details?.taskSubject,
          model: (message as any).model,
        }
      : undefined;

    const handleClick = useCallback(() => {
      onClick?.(message);
    }, [message, onClick]);

    return (
      <article
        className={clsx(
          'group relative flex p-4 rounded-lg transition-all duration-200',
          // gap: session は gap-4、inbox は gap-4
          isSession ? 'gap-4' : 'gap-4',
          'hover:bg-slate-50 dark:hover:bg-slate-800/50',
          isSelected && 'bg-blue-50 dark:bg-blue-900/20',
          isHighlighted && 'bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-400 dark:ring-yellow-600',
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400',
          // session は左寄せ、inbox は右寄せ
          isSession ? 'justify-start' : 'justify-end'
        )}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`${displayName}からのメッセージ: ${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}`}
        aria-pressed={isSelected ? 'true' : 'false'}
      >
        {/* session は左配置（アバター→コンテンツ）、inbox は右配置（コンテンツ→アバター） */}
        {isSession ? (
          /* アバター（左側） */
          <div className="relative flex-shrink-0">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
                colors.bg,
                colors.text,
                colors.border,
                'border-2'
              )}
              title={displayName}
            >
              {initials}
            </div>
            {/* エージェントステータスインジケーター */}
            <div className="absolute -bottom-0.5 -right-0.5">
              <AgentStatusIndicator
                lastActivity={message.timestamp}
                size="sm"
              />
            </div>
          </div>
        ) : null}

        {/* メッセージコンテンツ（共通） */}
        <div className={clsx(
          "min-w-0",
          isSession
            ? "flex-1 max-w-[70%] min-w-[30%] overflow-x-auto"
            : "w-auto max-w-[70%] min-w-[30%] overflow-x-auto"
        )}>
          {/* ヘッダー（送信者→受信者 + タイプ + 時刻） */}
          <div className={clsx('flex items-center gap-2 mb-1', isSession ? 'justify-start' : 'justify-end')}>
            {/* 送信者→受信者の表示 */}
            <span className={clsx('text-sm font-medium', colors.text)}>
              {searchQuery ? highlightText(displayName, searchQuery) : displayName}
            </span>
            {message.to && message.to !== 'all' && (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400">→</span>
                <span className={clsx('text-sm font-medium', colors.text)}>
                  {searchQuery ? highlightText(message.to, searchQuery) : message.to}
                </span>
              </>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400" aria-label={`メッセージタイプ: ${parsedType}`}>
              {typeIcon}
            </span>
            <time
              className="text-xs text-slate-500 dark:text-slate-400 cursor-help"
              title={showAbsoluteTime ? formatFullDate(message.timestamp) : undefined}
              dateTime={typeof message.timestamp === 'string' ? message.timestamp : new Date(message.timestamp).toISOString()}
            >
              {formattedTime}
            </time>
          </div>

          {/* メッセージバブル */}
          <div
            className={clsx(
              'inline-block px-3 py-2 rounded-lg',
              'border text-sm break-words',
              typeColorClass
            )}
          >
            {/* 検索ハイライト時はプレーンテキスト、それ以外はMarkdown判定 */}
            {searchQuery ? (
              <p className="whitespace-pre-wrap">
                {highlightText(messageText, searchQuery)}
              </p>
            ) : isMarkdown(messageText) ? (
              <MarkdownRenderer content={messageText} />
            ) : (
              <p className="whitespace-pre-wrap">{messageText}</p>
            )}
            {/* detail（description）がある場合は表示（session由来のメッセージは除く） */}
            {messageDetail && !isSession && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2">
                {isMarkdown(messageDetail) ? (
                  <MarkdownRenderer content={messageDetail} />
                ) : (
                  <p>{messageDetail}</p>
                )}
              </div>
            )}
            {isUnifiedTimelineEntry(message) && message.source === 'session' && (
              <SessionDetails
                details={message.details}
                parsedType={message.parsedType}
              />
            )}
          </div>

          {/* メタデータ表示 */}
          {showMetadata && metadata && (
            <MetadataDisplay metadata={metadata} />
          )}
        </div>

        {/* inbox はアバターを右側に配置 */}
        {!isSession && (
          <div className="relative flex-shrink-0">
            <div
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
                colors.bg,
                colors.text,
                colors.border,
                'border-2'
              )}
              title={displayName}
            >
              {initials}
            </div>
            {/* エージェントステータスインジケーター（メッセージ側に表示） */}
            <div className="absolute -bottom-0.5 -left-0.5">
              <AgentStatusIndicator
                lastActivity={message.timestamp}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* ブックマークボタン（オーバーレイ） */}
        {showBookmark && (
          <div className={clsx('absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10', isSession ? 'right-2' : 'left-2')}>
            <BookmarkButton
              messageId={messageId}
              size="sm"
            />
          </div>
        )}
      </article>
    );
  }
);

ChatMessageBubble.displayName = 'ChatMessageBubble';

export default ChatMessageBubble;
