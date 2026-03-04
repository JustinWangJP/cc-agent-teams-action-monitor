/**
 * ブックマークボタンコンポーネント。
 *
 * メッセージにスター（ブックマーク）を付与します。
 * ローカルストレージに保存して永続化します。
 *
 * @module components/chat/BookmarkButton
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * ローカルストレージキー。
 */
const STORAGE_KEY = 'chat-bookmarks';

/**
 * ブックマークしたメッセージIDの集合をローカルストレージから取得します。
 *
 * @returns ブックマークされたメッセージIDの集合
 *
 *
 */
function getStoredBookmarks(): Set<string> {
  if (typeof window === 'undefined') return new Set();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

/**
 * ブックマークをローカルストレージに保存します。
 *
 * @param bookmarks - 保存するブックマークの集合
 *
 *
 */
function saveBookmarks(bookmarks: Set<string>) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...bookmarks]));
  } catch {
    // ストレージが利用できない場合は無視
  }
}

/**
 * ブックマークボタンのプロパティ。
 */
export interface BookmarkButtonProps {
  /** メッセージID（タイムスタンプ+送信者など一意なID） */
  messageId: string;
  /** ブックマーク状態が変更された時のコールバック */
  onToggle?: (messageId: string, isBookmarked: boolean) => void;
  /** サイズ */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ブックマークボタンコンポーネント。
 *
 * メッセージにスター（ブックマーク）を付与します。
 * ローカルストレージに保存して永続化し、ページをまたいで状態を維持します。
 *
 * @param props.messageId - メッセージの一意なID
 * @param props.onToggle - ブックマーク状態変更時のコールバック
 * @param props.size - ボタンのサイズ（sm/md/lg）
 * @returns ブックマークボタン要素
 *
 * @example
 * ```tsx
 * <BookmarkButton
 *   messageId={`${message.timestamp}-${message.from}`}
 *   onToggle={(id, bookmarked) => console.log(id, bookmarked)}
 *   size="sm"
 * />
 * ```
 *
 *
 */
export const BookmarkButton = memo<BookmarkButtonProps>(
  ({ messageId, onToggle, size = 'md' }) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarks, setBookmarks] = useState<Set<string>>(getStoredBookmarks());

    /**
     * 初期マウント時にブックマーク状態を復元。
     */
    useEffect(() => {
      setIsBookmarked(bookmarks.has(messageId));
    }, [messageId, bookmarks]);

    /**
     * トグルハンドラー。
     */
    const handleToggle = useCallback(() => {
      const newBookmarks = new Set(bookmarks);
      const newIsBookmarked = !newBookmarks.has(messageId);

      if (newIsBookmarked) {
        newBookmarks.add(messageId);
      } else {
        newBookmarks.delete(messageId);
      }

      setBookmarks(newBookmarks);
      setIsBookmarked(newIsBookmarked);
      saveBookmarks(newBookmarks);

      onToggle?.(messageId, newIsBookmarked);
    }, [bookmarks, messageId, onToggle]);

    const sizeMap = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <button
        type="button"
        onClick={handleToggle}
        className={clsx(
          'inline-flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2',
          isBookmarked
            ? 'text-yellow-500 hover:text-yellow-600'
            : 'text-slate-300 dark:text-slate-600 hover:text-yellow-400 dark:hover:text-yellow-500'
        )}
        aria-label={isBookmarked ? 'ブックマークを解除' : 'ブックマークに追加'}
        aria-pressed={isBookmarked}
      >
        <Star
          className={clsx(
            sizeMap[size],
            isBookmarked ? 'fill-current' : 'fill-none'
          )}
        />
      </button>
    );
  }
);

BookmarkButton.displayName = 'BookmarkButton';

/**
 * 全ブックマークを取得するカスタムフック。
 *
 * ローカルストレージからブックマークを読み込み、ストレージ変更イベントを
 * リッスンして複数タブ間での同期をサポートします。
 *
 * @returns ブックマークされたメッセージIDの集合
 *
 *
 */
export function useBookmarks(): Set<string> {
  const [bookmarks, setBookmarks] = useState<Set<string>>(getStoredBookmarks());

  useEffect(() => {
    // ストレージ変更イベントをリッスン
    const handleStorageChange = () => {
      setBookmarks(getStoredBookmarks());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return bookmarks;
}

export default BookmarkButton;
