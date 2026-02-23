/**
 * メッセージ詳細パネルコンポーネント。
 *
 * 右側からスライドインする詳細パネルで、メッセージの詳細情報を表示します。
 *
 * @module components/chat/MessageDetailPanel
 */

'use client';

import { useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { ParsedMessage } from '@/types/message';
import { clsx } from 'clsx';

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
 * メッセージタイプの日本語名を取得。
 */
const getMessageTypeName = (type: string): string => {
  const names: Record<string, string> = {
    message: 'メッセージ',
    idle_notification: 'アイドル通知',
    shutdown_request: 'シャットダウン要求',
    shutdown_response: 'シャットダウン応答',
    plan_approval_request: 'プラン承認要求',
    plan_approval_response: 'プラン承認応答',
    task_assignment: 'タスク割り当て',
    shutdown_approved: 'シャットダウン了承',
  };
  return names[type] || '不明';
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
    return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: ja });
  } catch {
    return '無効な日時';
  }
};

/**
 * メタ情報アイテムコンポーネント。
 */
interface MetaItemProps {
  label: string;
  value: string | React.ReactNode;
  icon?: string;
}

const MetaItem: React.FC<MetaItemProps> = ({ label, value, icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[80px]">
      {icon && <span className="mr-1">{icon}</span>}
      {label}:
    </span>
    <span className="text-sm text-slate-700 dark:text-slate-300 break-all">{value}</span>
  </div>
);

/**
 * メッセージ詳細パネルのプロパティ。
 */
export interface MessageDetailPanelProps {
  /** メッセージデータ */
  message: ParsedMessage | null;
  /** パネルが開いているかどうか */
  isOpen: boolean;
  /** 閉じる時のコールバック */
  onClose: () => void;
}

/**
 * メッセージ詳細パネルコンポーネント。
 *
 * メッセージクリック時に右側からスライドインして詳細情報を表示します。
 *
 * @example
 * ```tsx
 * <MessageDetailPanel
 *   message={selectedMessage}
 *   isOpen={isDetailOpen}
 *   onClose={() => setDetailOpen(false)}
 * />
 * ```
 */
export const MessageDetailPanel: React.FC<MessageDetailPanelProps> = ({
  message,
  isOpen,
  onClose,
}) => {
  /**
   * ESC キーで閉じる。
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * クリップボードにコピー。
   */
  const handleCopy = useCallback(async () => {
    if (!message) return;

    const textToCopy =
      message.parsedType === 'message'
        ? message.text
        : JSON.stringify(message.parsedData, null, 2);

    try {
      await navigator.clipboard.writeText(textToCopy);
      // TODO: トースト通知などを追加
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [message]);

  if (!message) return null;

  const typeIcon = getMessageTypeIcon(message.parsedType);
  const typeName = getMessageTypeName(message.parsedType);
  const isJsonMessage = message.parsedType !== 'message';
  const isPrivate = !!message.to && message.to !== 'all';

  // メッセージ本文
  const messageText =
    message.parsedType === 'message' ? message.text : message.summary || message.text;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* オーバーレイ */}
        <Dialog.Overlay className="fixed inset-0 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-40" />

        {/* パネルコンテンツ */}
        <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-900 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right flex flex-col md:max-w-md sm:max-w-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{typeIcon}</span>
                <span>メッセージ詳細</span>
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
                メッセージの詳細情報を表示します
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* コンテンツ（スクロール可能） */}
          <div
            id="message-detail-content"
            className="flex-1 overflow-y-auto px-6 py-4"
            role="region"
            aria-label="メッセージ詳細"
          >
            {/* メタ情報 */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Info className="w-3 h-3" />
                基本情報
              </h3>
              <MetaItem label="送信者" value={message.from} icon="👤" />
              {isPrivate && <MetaItem label="受信者" value={message.to} icon="📨" />}
              <MetaItem
                label="時刻"
                value={safeFormatDate(message.timestamp)}
                icon="🕐"
              />
              <MetaItem
                label="タイプ"
                value={`${typeIcon} ${typeName}`}
                icon="📋"
              />
              {message.summary && !isJsonMessage && (
                <MetaItem label="サマリー" value={message.summary} icon="📝" />
              )}
              {message.color && (
                <MetaItem
                  label="カラー"
                  value={
                    <span className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
                        style={{ backgroundColor: message.color }}
                      />
                      {message.color}
                    </span>
                  }
                  icon="🎨"
                />
              )}
              <MetaItem
                label="既読"
                value={message.read ? '✅ 既読' : '📬 未読'}
                icon={message.read ? '✓' : '📬'}
              />
            </div>

            {/* メッセージ本文 */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {isJsonMessage ? 'プロトコルデータ' : 'メッセージ本文'}
              </h3>
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                {isJsonMessage && message.parsedData ? (
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                    {JSON.stringify(message.parsedData, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {messageText}
                  </p>
                )}
              </div>
            </div>

            {/* 生データ（折りたたみ） */}
            <details className="mt-4">
              <summary className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
                <Info className="w-3 h-3" />
                生データを表示
              </summary>
              <div className="mt-2 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                  {JSON.stringify(message, null, 2)}
                </pre>
              </div>
            </details>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={handleCopy}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                'text-slate-700 dark:text-slate-300',
                'bg-white dark:bg-slate-900',
                'border border-slate-300 dark:border-slate-700',
                'rounded-md hover:bg-slate-50 dark:hover:bg-slate-800',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              <Copy className="w-4 h-4" />
              コピー
            </button>
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                'text-white bg-blue-600',
                'rounded-md hover:bg-blue-700',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              閉じる
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MessageDetailPanel;
