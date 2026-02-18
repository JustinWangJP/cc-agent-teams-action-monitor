/**
 * チャットメッセージリストコンポーネント。
 *
 * メッセージリストの表示とスクロール管理を担当します。
 * スマートスクロール機能：最下部から100px以内の場合のみ自動スクロール。
 *
 * @module components/chat/ChatMessageList
 */

'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { ArrowDown, ChevronDown } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { ParsedMessage } from '@/types/message';
import { clsx } from 'clsx';

/**
 * チャットメッセージリストのプロパティ。
 */
export interface ChatMessageListProps {
  /** メッセージ配列（時刻昇順） */
  messages: ParsedMessage[];
  /** 選択中のメッセージID */
  selectedMessageId?: string;
  /** ハイライト中のメッセージID（検索結果） */
  highlightedMessageId?: string;
  /** 検索クエリ（ハイライト用） */
  searchQuery?: string;
  /** メッセージクリックハンドラー */
  onMessageClick?: (message: ParsedMessage) => void;
  /** 自動スクロール有効フラグ */
  autoScroll?: boolean;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
}

/**
 * 新着メッセージ通知コンポーネント。
 */
interface NewMessageNotificationProps {
  count: number;
  onClick: () => void;
}

const NewMessageNotification = memo<NewMessageNotificationProps>(({ count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'absolute bottom-4 left-1/2 -translate-x-1/2',
      'inline-flex items-center gap-2 px-4 py-2',
      'bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium',
      'rounded-full shadow-lg transition-all duration-200',
      'animate-bounce cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    )}
    aria-label={`${count}件の新着メッセージを表示`}
  >
    <span>新着メッセージ {count}件</span>
    <ChevronDown className="w-4 h-4" />
  </button>
));

NewMessageNotification.displayName = 'NewMessageNotification';

/**
 * 最下部へスクロールボタンコンポーネント。
 */
interface ScrollToBottomButtonProps {
  onClick: () => void;
  isVisible: boolean;
}

const ScrollToBottomButton = memo<ScrollToBottomButtonProps>(({ onClick, isVisible }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'absolute bottom-4 right-4',
      'inline-flex items-center justify-center w-10 h-10',
      'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700',
      'text-slate-600 dark:text-slate-400 rounded-full shadow-md',
      'hover:bg-slate-50 dark:hover:bg-slate-700',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    )}
    aria-label="最下部へスクロール"
  >
    <ArrowDown className="w-5 h-5" />
  </button>
));

ScrollToBottomButton.displayName = 'ScrollToBottomButton';

/**
 * 空状態コンポーネント。
 */
interface EmptyStateProps {
  isLoading: boolean;
  error: string | null;
}

const EmptyState = memo<EmptyStateProps>(({ isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">メッセージを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="font-medium">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-slate-500 dark:text-slate-400">
        <p className="text-lg">💬</p>
        <p className="mt-2">まだメッセージはありません</p>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

/**
 * チャットメッセージリストコンポーネント。
 *
 * メッセージリストの表示とスクロール管理を行います。
 *
 * @example
 * ```tsx
 * <ChatMessageList
 *   messages={messages}
 *   selectedMessageId={selectedId}
 *   onMessageClick={handleClick}
 *   autoScroll={true}
 * />
 * ```
 */
export const ChatMessageList = memo<ChatMessageListProps>(
  ({
    messages,
    selectedMessageId,
    highlightedMessageId,
    searchQuery = '',
    onMessageClick,
    autoScroll = true,
    isLoading = false,
    error = null,
  }) => {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevMessagesLengthRef = useRef(messages.length);

    /**
     * 最下部から100px以内かどうかを判定。
     */
    const checkIsNearBottom = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return false;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // 逆スクロールの場合、scrollTopは0から始まる
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      return distanceFromBottom < 100;
    }, []);

    /**
     * 最下部へスクロール。
     */
    const scrollToBottom = useCallback((smooth = true) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      });
      setIsNearBottom(true);
      setShowNewMessageBadge(false);
      setUnreadCount(0);
    }, []);

    /**
     * スクロールイベントハンドラー。
     */
    const handleScroll = useCallback(() => {
      const nearBottom = checkIsNearBottom();
      setIsNearBottom(nearBottom);

      if (nearBottom && showNewMessageBadge) {
        setShowNewMessageBadge(false);
        setUnreadCount(0);
      }
    }, [checkIsNearBottom, showNewMessageBadge]);

    /**
     * 新着メッセージ通知クリックハンドラー。
     */
    const handleNewMessageClick = useCallback(() => {
      scrollToBottom(true);
    }, [scrollToBottom]);

    /**
     * 最下部へボタンクリックハンドラー。
     */
    const handleScrollToBottom = useCallback(() => {
      scrollToBottom(true);
    }, [scrollToBottom]);

    /**
     * メッセージ更新時の自動スクロール処理。
     */
    useEffect(() => {
      const currentLength = messages.length;
      const prevLength = prevMessagesLengthRef.current;

      // メッセージが追加された場合
      if (currentLength > prevLength) {
        if (autoScroll && isNearBottom) {
          // 自動スクロール有効かつ最下部付近の場合、即座にスクロール
          scrollToBottom(false);
        } else if (!isNearBottom) {
          // 最下部から離れている場合、新着通知を表示
          setUnreadCount((prev) => prev + (currentLength - prevLength));
          setShowNewMessageBadge(true);
        }
      }

      prevMessagesLengthRef.current = currentLength;
    }, [messages.length, autoScroll, isNearBottom, scrollToBottom]);

    /**
     * 初回マウント時に最下部へスクロール。
     */
    useEffect(() => {
      if (messages.length > 0) {
        scrollToBottom(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * 選択中メッセージが変更された場合、そのメッセージを表示。
     */
    useEffect(() => {
      if (selectedMessageId) {
        const messageElement = document.querySelector(`[data-message-id="${selectedMessageId}"]`);
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, [selectedMessageId]);

    const isEmpty = messages.length === 0;

    return (
      <div className="relative h-full">
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-auto chat-scrollarea"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label="メッセージリスト"
          tabIndex={0}
        >
          <div className="p-4 space-y-1">
            {isEmpty ? (
              <EmptyState isLoading={isLoading} error={error} />
            ) : (
              <>
                {/* スクリーンリーダー向けのメッセージ数通知 */}
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                  {messages.length}件のメッセージがあります
                </div>
                {messages.map((message, index) => {
                  const messageId = `${message.timestamp}-${message.from}`;
                  const isFirst = index === 0;
                  const isLast = index === messages.length - 1;
                  const isHighlighted = highlightedMessageId === messageId;
                  return (
                    <div
                      key={messageId}
                      data-message-id={messageId}
                      aria-setsize={messages.length}
                      aria-posinset={index + 1}
                    >
                      <ChatMessageBubble
                        message={message}
                        isSelected={selectedMessageId === messageId}
                        isHighlighted={isHighlighted}
                        searchQuery={searchQuery}
                        onClick={onMessageClick}
                      />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* 新着メッセージ通知 */}
        {showNewMessageBadge && unreadCount > 0 && (
          <NewMessageNotification count={unreadCount} onClick={handleNewMessageClick} />
        )}

        {/* 最下部へボタン（最下部から離れている場合のみ表示） */}
        <ScrollToBottomButton
          onClick={handleScrollToBottom}
          isVisible={!isNearBottom && messages.length > 0}
        />
      </div>
    );
  }
);

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList;
