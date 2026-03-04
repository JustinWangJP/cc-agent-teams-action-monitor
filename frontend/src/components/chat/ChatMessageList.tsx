/**
 * チャットメッセージリストコンポーネント（バーチャルスクロール対応版）。
 *
 * メッセージリストの表示とスクロール管理を担当します。
 * @tanstack/react-virtual を使用して、大量メッセージでも高速に描画します。
 *
 * スマートスクロール機能：最下部から100px以内の場合のみ自動スクロール。
 *
 * @module components/chat/ChatMessageList
 */

'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ChevronDown } from 'lucide-react';
import { ChatMessageBubble, type TimelineMessage } from './ChatMessageBubble';
import { DateSeparator, isSameDate } from './DateSeparator';
import { clsx } from 'clsx';

/**
 * チャットメッセージリストのプロパティ。
 */
export interface ChatMessageListProps {
  /** メッセージ配列（時刻昇順） */
  messages: TimelineMessage[];
  /** 選択中のメッセージID */
  selectedMessageId?: string;
  /** ハイライト中のメッセージID（検索結果） */
  highlightedMessageId?: string;
  /** 検索クエリ（ハイライト用） */
  searchQuery?: string;
  /** メッセージクリックハンドラー */
  onMessageClick?: (message: TimelineMessage) => void;
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
  t: (key: string, options?: Record<string, unknown>) => string;
}

const NewMessageNotification = memo<NewMessageNotificationProps>(({ count, onClick, t }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'absolute bottom-4 left-1/2 -translate-x-1/2 z-20',
      'inline-flex items-center gap-2 px-4 py-2',
      'bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium',
      'rounded-full shadow-lg transition-all duration-200',
      'animate-bounce cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    )}
    aria-label={t('message_list.new_messages_aria', { count })}
  >
    <span>{t('message_list.new_messages', { count })}</span>
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
  ariaLabel: string;
}

const ScrollToBottomButton = memo<ScrollToBottomButtonProps>(({ onClick, isVisible, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'absolute bottom-4 right-4 z-20',
      'inline-flex items-center justify-center w-10 h-10',
      'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700',
      'text-slate-600 dark:text-slate-400 rounded-full shadow-md',
      'hover:bg-slate-50 dark:hover:bg-slate-700',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    )}
    aria-label={ariaLabel}
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
  t: (key: string) => string;
}

const EmptyState = memo<EmptyStateProps>(({ isLoading, error, t }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('message_list.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600 dark:text-red-400">
          <p className="font-medium">{t('message_list.error_title')}</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-slate-500 dark:text-slate-400">
        <p className="text-lg">💬</p>
        <p className="mt-2">{t('message_list.no_messages')}</p>
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

/**
 * 仮想化されたメッセージアイテムコンポーネント。
 */
interface VirtualMessageItemProps {
  message: TimelineMessage;
  previousMessage?: TimelineMessage;
  isSelected: boolean;
  isHighlighted: boolean;
  searchQuery: string;
  onMessageClick?: (message: TimelineMessage) => void;
  index: number;
  total: number;
}

const VirtualMessageItem = memo<VirtualMessageItemProps>(
  ({ message, previousMessage, isSelected, isHighlighted, searchQuery, onMessageClick, index, total }) => {
    const messageId = `${message.timestamp}-${message.from}`;

    // 前のメッセージと日付が異なる場合はセパレーターを表示
    const showDateSeparator = !previousMessage || !isSameDate(previousMessage.timestamp, message.timestamp);

    return (
      <>
        {showDateSeparator && (
          <DateSeparator date={new Date(message.timestamp)} />
        )}
        <div
          data-message-id={messageId}
          aria-setsize={total}
          aria-posinset={index + 1}
          className="will-change-transform"
        >
          <ChatMessageBubble
            message={message}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            searchQuery={searchQuery}
            onClick={onMessageClick}
          />
        </div>
      </>
    );
  }
);

VirtualMessageItem.displayName = 'VirtualMessageItem';

/**
 * チャットメッセージリストコンポーネント（バーチャルスクロール対応）。
 *
 * @tanstack/react-virtual を使用して、表示されるメッセージのみをレンダリングします。
 * これにより、1000件以上のメッセージでもスムーズにスクロールできます。
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
    const { t } = useTranslation('timeline');
    const viewportRef = useRef<HTMLDivElement>(null);
    const [isNearBottom, setIsNearBottom] = useState(true);
    const [showNewMessageBadge, setShowNewMessageBadge] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevMessagesLengthRef = useRef(messages.length);

    /**
     * バーチャルスクロールの設定。
     *
     * - estimateSize: 各メッセージの推定高さ（動的に調整されます）
     * - overscan: スクロール方向に先読みするアイテム数
     */
    const virtualizer = useVirtualizer({
      count: messages.length,
      getScrollElement: () => viewportRef.current,
      estimateSize: useCallback(() => 100, []),
      overscan: 5,
    });

    /**
     * 仮想アイテムの高さを取得・キャッシュするコールバック。
     */
    const measureElement = useCallback((element: HTMLDivElement | null) => {
      if (element) {
        virtualizer.measureElement(element);
      }
    }, [virtualizer]);

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
      if (messages.length === 0) return;

      // バーチャライザーを使用して最下部へスクロール
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: smooth ? 'smooth' : 'auto',
      });

      setIsNearBottom(true);
      setShowNewMessageBadge(false);
      setUnreadCount(0);
    }, [virtualizer, messages.length]);

    /**
     * 指定したインデックスへスクロール。
     */
    const scrollToIndex = useCallback((index: number, smooth = true) => {
      virtualizer.scrollToIndex(index, {
        align: 'center',
        behavior: smooth ? 'smooth' : 'auto',
      });
    }, [virtualizer]);

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
        const index = messages.findIndex(
          (m) => `${m.timestamp}-${m.from}` === selectedMessageId
        );
        if (index !== -1) {
          scrollToIndex(index, true);
        }
      }
    }, [selectedMessageId, messages, scrollToIndex]);

    const isEmpty = messages.length === 0;
    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div className="relative h-full">
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className="h-full w-full overflow-y-auto chat-scrollarea"
          role="log"
          aria-live="polite"
          aria-atomic="false"
          aria-label={t('message_list.aria_label')}
          tabIndex={0}
        >
          {isEmpty ? (
            <EmptyState isLoading={isLoading} error={error} t={t} />
          ) : (
            <>
              {/* スクリーンリーダー向けのメッセージ数通知 */}
              <div className="sr-only" aria-live="polite" aria-atomic="true">
                {t('message_list.message_count_sr', { count: messages.length })}
              </div>

              {/* バーチャルスクロールコンテナ */}
              <div
                className="relative w-full"
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                }}
              >
                {virtualItems.map((virtualItem) => {
                  const message = messages[virtualItem.index];
                  const previousMessage = virtualItem.index > 0 ? messages[virtualItem.index - 1] : undefined;
                  if (!message) return null;

                  const messageId = `${message.timestamp}-${message.from}`;
                  const isSelected = selectedMessageId === messageId;
                  const isHighlighted = highlightedMessageId === messageId;

                  return (
                    <div
                      key={virtualItem.key}
                      data-index={virtualItem.index}
                      ref={measureElement}
                      className="absolute w-full top-0 left-0"
                      style={{
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <VirtualMessageItem
                        message={message}
                        previousMessage={previousMessage}
                        isSelected={isSelected}
                        isHighlighted={isHighlighted}
                        searchQuery={searchQuery}
                        onMessageClick={onMessageClick}
                        index={virtualItem.index}
                        total={messages.length}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 新着メッセージ通知 */}
        {showNewMessageBadge && unreadCount > 0 && (
          <NewMessageNotification count={unreadCount} onClick={handleNewMessageClick} t={t} />
        )}

        {/* 最下部へボタン（最下部から離れている場合のみ表示） */}
        <ScrollToBottomButton
          onClick={handleScrollToBottom}
          isVisible={!isNearBottom && messages.length > 0}
          ariaLabel={t('message_list.scroll_to_bottom_aria')}
        />
      </div>
    );
  }
);

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList;
