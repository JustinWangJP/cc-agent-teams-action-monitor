/**
 * メッセージ詳細モーダルコンポーネント。
 *
 * Radix UI Dialog を使用して、メッセージの詳細情報を表示します。
 *
 * @module components/timeline/MessageDetailModal
 */

'use client';

import { useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, X } from 'lucide-react';
import type { ParsedMessage } from '@/types/message';
import { getMessageTypeIcon } from '@/types/timeline';
import { useDashboardStore } from '@/stores/dashboardStore';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';

/**
 * メッセージ詳細モーダルのプロパティ。
 */
interface MessageDetailModalProps {
  /** メッセージデータ（省略時はストアから取得） */
  message?: ParsedMessage | null;
  /** モーダルが開いているかどうか（省略時はストアから取得） */
  isOpen?: boolean;
  /** 閉じる時のコールバック */
  onClose?: () => void;
}

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
 * メッセージ詳細モーダルコンポーネント。
 *
 * メッセージクリック時に詳細情報をモーダルで表示します。
 * JSON-in-JSON 形式のプロトコルメッセージも整形して表示します。
 *
 * @example
 * ```tsx
 * <MessageDetailModal
 *   message={selectedMessage}
 *   isOpen={isDetailModalOpen}
 *   onClose={() => setDetailModalOpen(false)}
 * />
 * ```
 */
export const MessageDetailModal: React.FC<MessageDetailModalProps> = ({
  message: propsMessage,
  isOpen: propsIsOpen,
  onClose: propsOnClose,
}) => {
  // 個別セレクターを使用して無限ループを防止
  const storeMessage = useDashboardStore((state) => state.selectedMessage);
  const storeIsOpen = useDashboardStore((state) => state.isDetailModalOpen);
  const setDetailModalOpen = useDashboardStore((state) => state.setDetailModalOpen);

  const message = propsMessage ?? storeMessage;
  const isOpen = propsIsOpen ?? storeIsOpen;

  const handleClose = useCallback(() => {
    if (propsOnClose) {
      propsOnClose();
    } else {
      setDetailModalOpen(false);
    }
  }, [propsOnClose, setDetailModalOpen]);

  // ESC キーで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // クリップボードにコピー
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

  const typeIcon = getMessageTypeIcon(message.parsedType as any);
  const isJsonMessage = message.parsedType !== 'message';

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 rounded-lg shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{typeIcon}</span>
              <span>メッセージ詳細</span>
            </Dialog.Title>
            <Dialog.Close
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              onClick={handleClose}
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* コンテンツ */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* メタ情報 */}
            <div className="mb-6">
              <MetaItem label="送信者" value={message.from} />
              {message.to && <MetaItem label="受信者" value={message.to} />}
              <MetaItem
                label="時刻"
                value={format(new Date(message.timestamp), 'yyyy-MM-dd HH:mm:ss', { locale: ja })}
                icon="🕐"
              />
              <MetaItem
                label="タイプ"
                value={`${typeIcon} ${message.parsedType}`}
                icon="📋"
              />
              {message.summary && <MetaItem label="サマリー" value={message.summary} />}
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
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {isJsonMessage ? 'プロトコルデータ' : 'メッセージ本文'}
              </h4>
              <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                {isJsonMessage && message.parsedData ? (
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                    {JSON.stringify(message.parsedData, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {message.text}
                  </p>
                )}
              </div>
            </div>

            {/* 追加メタデータ（生データ） */}
            {Object.keys(message).length > 0 && (
              <details className="mt-4">
                <summary className="text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  生データを表示
                </summary>
                <div className="mt-2 bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* フッター */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Copy className="w-4 h-4" />
              コピー
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              閉じる
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default MessageDetailModal;
