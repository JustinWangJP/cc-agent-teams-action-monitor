import { StatusBadge } from '@/components/common/StatusBadge';

/**
 * アプリケーションのヘッダーコンポーネント。
 *
 * ロゴ、タイトル、WebSocket 接続状態を表示します。接続状態は
 * StatusBadge で視覚的に表現されます。
 *
 * @param props.connectionStatus - WebSocket 接続状態
 * @returns ヘッダー要素
 *
 * @
 */
interface HeaderProps {
  connectionStatus: 'connecting' | 'open' | 'closed';
}

export function Header({ connectionStatus }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Agent Teams Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">WebSocket:</span>
              <StatusBadge status={connectionStatus} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
