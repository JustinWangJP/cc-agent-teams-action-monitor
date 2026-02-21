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
import { formatDistanceToNow } from 'date-fns';
import type { ParsedMessage, UnifiedTimelineEntry, FileChangeInfo } from '@/types/message';
import { getMessageTypeConfig, getMessageTypeColorClass } from '@/types/message';
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
  return 'source' in message && 'parsedType' in message;
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
        case 'tool_use':
          return {
            summary: `ツール使用: ${details?.toolName || '不明'}`,
            detail: content,
          };
        case 'file_change':
          return {
            summary: `${details?.files?.length || 0}件のファイル変更`,
            detail: content,
          };
        case 'user_message':
          return {
            summary: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
            detail: content,
          };
        case 'assistant_message':
          return {
            summary: msgSummary || (content.slice(0, 50) + (content.length > 50 ? '...' : '')),
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
 * エージェント名から一意の色を生成。
 */
const getAgentColor = (agentName: string): { bg: string; text: string; border: string } => {
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

  return (
    colorMap[agentName] || {
      bg: 'bg-gray-100 dark:bg-gray-900/30',
      text: 'text-gray-800 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
    }
  );
};

/**
 * エージェント名の頭文字を取得。
 */
const getInitials = (name: string): string => {
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
 */
const safeFormatDate = (timestamp: string | number | Date | undefined): string => {
  if (!timestamp) return '日時不明';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '無効な日時';
    }
    // ja ロケールが読み込まれていない場合はデフォルトを使用
    return formatDistanceToNow(date, { addSuffix: true });
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

const SessionDetails = memo<SessionDetailsProps>(({ details, parsedType }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!details) return null;

  // 折りたたみ可能な詳細を持つタイプ
  const hasExpandableContent =
    details.thinking ||
    (details.files && details.files.length > 0) ||
    details.toolName;

  if (!hasExpandableContent) return null;

  return (
    <div className="mt-2 space-y-2 text-sm">
      {/* thinking ブロック */}
      {details.thinking && (
        <details
          className="bg-slate-100 dark:bg-slate-800 rounded p-2 group/details"
          open={isExpanded}
          onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
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

      {/* ツール使用 */}
      {details.toolName && (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
          <span>🔧</span>
          <span className="font-medium">{details.toolName}</span>
          {details.toolInput && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      )}

      {/* ツール入力（展開時） */}
      {details.toolInput && isExpanded && (
        <pre className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(details.toolInput, null, 2)}
        </pre>
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
  ({ message, isHighlighted = false, searchQuery = '', onClick, isSelected = false, showBookmark = true }) => {
    const colors = getAgentColor(message.from);

    // UnifiedTimelineEntry か ParsedMessage かに応じて処理を分岐
    const parsedType = isUnifiedTimelineEntry(message)
      ? message.parsedType
      : message.parsedType;

    const typeIcon = getMessageTypeIcon(parsedType);
    const typeColorClass = getMessageTypeColorClassLocal(parsedType);
    const initials = getInitials(message.from);
    const formattedTime = safeFormatDate(message.timestamp);

    // メッセージ表示用テキストを生成（タイプ別ロジック）
    const { summary: messageSummary, detail: messageDetail } = getMessageDisplayText(message);
    const messageText = messageSummary;

    // メッセージID（ブックマーク用）
    const messageId = `${message.timestamp}-${message.from}`;

    const handleClick = useCallback(() => {
      onClick?.(message);
    }, [message, onClick]);

    // ブックマーク機能はBookmarkButton内で完結しているため、
    // handleBookmarkClickは不要（内部でlocalStorage管理）

    return (
      <div
        className={clsx(
          'group relative flex gap-3 p-3 rounded-lg transition-all duration-200',
          'hover:bg-slate-50 dark:hover:bg-slate-800/50',
          isSelected && 'bg-blue-50 dark:bg-blue-900/20',
          isHighlighted && 'bg-yellow-50 dark:bg-yellow-900/20 ring-2 ring-yellow-400 dark:ring-yellow-600',
          'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400'
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
        aria-label={`${message.from}からのメッセージ: ${messageText.slice(0, 50)}${messageText.length > 50 ? '...' : ''}`}
        aria-pressed={isSelected}
      >
        {/* ブックマークボタン（オーバーレイ） */}
        {showBookmark && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <BookmarkButton
              messageId={messageId}
              size="sm"
            />
          </div>
        )}

        {/* アバター */}
        <div className="relative flex-shrink-0">
          <div
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
              colors.bg,
              colors.text,
              colors.border,
              'border-2'
            )}
            title={message.from}
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

        {/* メッセージコンテンツ */}
        <div className="flex-1 min-w-0">
          {/* ヘッダー（送信者→受信者 + 時刻） */}
          <div className="flex items-center gap-2 mb-1">
            {/* 送信者→受信者の表示 */}
            <span className={clsx('text-sm font-medium', colors.text)}>
              {searchQuery ? highlightText(message.from, searchQuery) : message.from}
            </span>
            {message.to && message.to !== 'all' && (
              <>
                <span className="text-xs text-slate-500 dark:text-slate-400">→</span>
                <span className={clsx('text-sm font-medium', colors.text)}>
                  {searchQuery ? highlightText(message.to, searchQuery) : message.to}
                </span>
              </>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{typeIcon}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
              {formattedTime}
            </span>
          </div>

          {/* メッセージバブル */}
          <div
            className={clsx(
              'inline-block max-w-full px-3 py-2 rounded-lg',
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
            {/* 詳細情報がある場合は別行で表示 */}
            {messageDetail && (
              <div className="mt-2 pt-2 border-t border-current opacity-75">
                {searchQuery ? (
                  <p className="whitespace-pre-wrap">
                    {highlightText(messageDetail, searchQuery)}
                  </p>
                ) : isMarkdown(messageDetail) ? (
                  <MarkdownRenderer content={messageDetail} />
                ) : (
                  <p className="whitespace-pre-wrap">{messageDetail}</p>
                )}
              </div>
            )}
            {/* session 由来の詳細情報を表示 */}
            {isUnifiedTimelineEntry(message) && message.source === 'session' && (
              <SessionDetails
                details={message.details}
                parsedType={message.parsedType}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

ChatMessageBubble.displayName = 'ChatMessageBubble';

export default ChatMessageBubble;
