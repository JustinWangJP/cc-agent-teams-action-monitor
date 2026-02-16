import { ReactNode } from 'react';
import { Header } from './Header';

/**
 * アプリケーション全体のレイアウトを提供するコンポーネント。
 *
 * Header とメインコンテンツ領域を含み、一貫したページ構造を提供します。
 * WebSocket 接続状態を Header に渡します。
 *
 * @param props.children - メインコンテンツ
 * @param props.connectionStatus - WebSocket 接続状態
 * @returns レイアウト要素
 *
 * @
 */
interface LayoutProps {
  children: ReactNode;
  connectionStatus: 'connecting' | 'open' | 'closed';
}

export function Layout({ children, connectionStatus }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      <Header connectionStatus={connectionStatus} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
