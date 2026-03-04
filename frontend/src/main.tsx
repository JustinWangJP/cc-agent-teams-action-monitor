import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
// vis-timeline CSS - タイムライン表示に必須
import 'vis-timeline/styles/vis-timeline-graph2d.css'
import { queryClient } from './lib/queryClient'
// i18n 初期化
import { initI18n } from './i18n'

// ============================================
// ダークモード初期設定（ハイドレーション防止）
// ============================================

// ブラウザ環境のみ実行
if (typeof window !== 'undefined') {
  const root = document.documentElement;

  // localStorageからテーマ設定を取得
  const storedTheme = localStorage.getItem('theme');

  if (storedTheme === 'dark') {
    root.classList.add('dark');
  } else if (storedTheme === 'light') {
    root.classList.remove('dark');
  } else {
    // 設定がない場合はシステム設定に従う
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // システムテーマ変更を監視
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // localStorageに明示的な設定がない場合のみシステム設定に従う
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  });
}

// ============================================
// アプリケーション初期化
// ============================================

// i18n初期化後にアプリケーションをマウント
const initApp = async () => {
  await initI18n();

  // 診断: CSSが読み込まれたか確認
  console.log('[DIAG] main.tsx loaded')
  console.log('[DIAG] vis-timeline CSS should be loaded')
  console.log('[DIAG] Dark mode initialized:', document.documentElement.classList.contains('dark'))

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

initApp().catch((error) => {
  console.error('Failed to initialize app:', error);
});
