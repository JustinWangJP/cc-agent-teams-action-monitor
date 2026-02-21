# フロントエンド技術スタック技術書

## 1. 技術スタック概要

### 1.1 言語・フレームワーク

| カテゴリ | 技術 | バージョン | 用途 |
|----------|------|-----------|------|
| プログラミング言語 | TypeScript | 5.3.0+ | 型安全な開発 |
| UIライブラリ | React | 18.2.0 | コンポーネントベースUI |
| バンドラー | Vite | 5.0.0+ | 高速ビルド・HMR |
| CSSフレームワーク | Tailwind CSS | 3.4.0+ | ユーティリティファーストCSS |
| E2Eテスト | Puppeteer | 24.37.3+ | ブラウザ自動化 |

## 2. プロジェクト構造

- src/components/: UIコンポーネント
- src/hooks/: カスタムフック
- src/types/: TypeScript型定義

## 3. コンポーネント一覧

- LoadingSpinner: ローディング表示
- StatusBadge: ステータスバッジ
- TeamCard: チームカード
- TaskCard: タスクカード
- ActivityFeed: アクティビティフィード
- Header: ヘッダー
- Layout: レイアウト

## 4. カスタムフック

- useTeams(): チーム一覧取得
- useTasks(): タスク一覧取得
- useWebSocket(): WebSocket接続管理

## 5. ビルド設定

- 開発サーバー: ポート5173
- APIプロキシ: /api → http://127.0.0.1:8000
- WebSocketプロキシ: /ws → ws://127.0.0.1:8000

*作成日: 2026-02-16*
