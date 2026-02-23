import { ReactNode } from 'react';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';

/**
 * アプリケーション全体のレイアウトを提供するコンポーネント。
 *
 * Header とメインコンテンツ領域を含み、一貫したページ構造を提供します。
 *
 * @param props.children - メインコンテンツ
 * @returns レイアウト要素
 */
interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 ease-in-out">
      <Header />
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#22c55e',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
    </div>
  );
}
