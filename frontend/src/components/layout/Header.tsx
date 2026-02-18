import { ThemeToggle } from '@/components/common/ThemeToggle';

/**
 * アプリケーションのヘッダーコンポーネント。
 *
 * ロゴ、タイトル、テーマ切り替えを表示します。
 *
 * @returns ヘッダー要素
 */
export function Header() {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 transition-colors duration-300 ease-in-out">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Agent Teams Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle size="md" iconOnly />
          </div>
        </div>
      </div>
    </header>
  );
}
