/**
 * チャットメッセージバブルコンポーネント。
 *
 * 個別メッセージをチャット形式の吹き出しで表示します。
 *
 * @module components/chat/ChatMessageBubble
 */

'use client';

import { memo, useCallback, type ReactNode } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { ParsedMessage } from '@/types/message';
import { clsx } from 'clsx';
import { BookmarkButton } from './BookmarkButton';
import { AgentStatusIndicator } from './AgentStatusIndicator';

/**
 * メッセージタイプに対応するアイコンを取得。
 */
const getMessageTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    message: '💬',
    idle_notification: '💤',
    shutdown_request: '🛑',
    shutdown_response: '✅',
    plan_approval_request: '📋',
    plan_approval_response: '✅',
    task_assignment: '📝',
    shutdown_approved: '✅',
  };
  return icons[type] || '❓';
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
    return formatDistanceToNow(date, { addSuffix: true, locale: ja });
  } catch {
    return '無効な日時';
  }
};

/**
 * チャットメッセージバブルのプロパティ。
 */
export interface ChatMessageBubbleProps {
  /** メッセージデータ */
  message: ParsedMessage;
  /** ハイライト表示（検索結果など） */
  isHighlighted?: boolean;
  /** 検索クエリ（テキストハイライト用） */
  searchQuery?: string;
  /** クリックハンドラー */
  onClick?: (message: ParsedMessage) => void;
  /** 選択中のメッセージかどうか */
  isSelected?: boolean;
  /** ブックマーク機能を有効にするかどうか */
  showBookmark?: boolean;
}

/**
 * チャットメッセージバブルコンポーネント。
 *
 * 個別メッセージを吹き出し形式で表示します。
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
    const typeIcon = getMessageTypeIcon(message.parsedType);
    const initials = getInitials(message.from);
    const formattedTime = safeFormatDate(message.timestamp);

    // メッセージ本文（パース済みの場合はサマリー、なければテキスト）
    const messageText =
      message.parsedType === 'message' ? message.text : message.summary || message.text;

    // 秘密メッセージかどうか（toフィールドがある場合）
    const isPrivate = !!message.to && message.to !== 'all';

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
        aria-describedby={!message.read ? `unread-${messageId}` : undefined}
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
          {/* ヘッダー（送信者名 + 時刻） */}
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-sm font-medium', colors.text)}>
              {searchQuery ? highlightText(message.from, searchQuery) : message.from}
            </span>
            {isPrivate && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                title={`To: ${message.to}`}
              >
                🔒 秘密
              </span>
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
              colors.bg,
              colors.border,
              'border text-sm break-words'
            )}
          >
            <p
              className={clsx(
                'text-slate-700 dark:text-slate-300 whitespace-pre-wrap',
                colors.text
              )}
            >
              {searchQuery ? highlightText(messageText, searchQuery) : messageText}
            </p>
          </div>

          {/* 未読インジケーター */}
          {!message.read && (
            <div className="mt-1" id={`unread-${messageId}`}>
              <span
                className="inline-block w-2 h-2 bg-blue-500 rounded-full"
                aria-label="未読"
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatMessageBubble.displayName = 'ChatMessageBubble';

export default ChatMessageBubble;
