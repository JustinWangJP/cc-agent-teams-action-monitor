# Agent Teams Dashboard

Claude Code Agent Teams のリアルタイム監視ダッシュボード

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

---

## 言語 / Languages / 语言

- [日本語](README.md) (デフォルト)
- [English](README.en.md)
- [中文](README.zh.md)

---

## 概要

Agent Teams Dashboard は、Claude Code の Agent Teams 機能をリアルタイムに監視・管理するための Web アプリケーションです。`~/.claude/` ディレクトリを監視し、チーム構成、タスク進捗、エージェント間のメッセージングを可視化します。

### 主な特徴

- **リアルタイム更新**: HTTP Polling による自動データ更新（5秒〜60秒間隔）
- **チーム監視**: アクティブなエージェントチームの一覧表示・ステータス判定
- **タスク管理**: ステータス別のタスク可視化（カンバン形式）
- **統合タイムライン**: エージェント間メッセージ + セッションログの統合表示
- **ダークモード**: テーマ切り替え対応

---

## クイックスタート

### 前提条件

| ソフトウェア | バージョン | 確認コマンド |
|-------------|-----------|-------------|
| Python | 3.11以上 | `python --version` |
| Node.js | 18以上 | `node --version` |
| npm | 9以上 | `npm --version` |

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd cc-agent-teams-action-monitor

# バックエンド
cd backend
pip install -e ".[dev]"

# フロントエンド
cd ../frontend
npm install
```

### 起動方法

**ターミナル 1（バックエンド）:**
```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**ターミナル 2（フロントエンド）:**
```bash
cd frontend
npm run dev
```

**アクセス:** http://localhost:5173/

---

## 設計思想

### なぜ HTTP ポーリングなのか

本システムは **WebSocket ではなく HTTP ポーリング** を採用しています：

1. **シンプルなアーキテクチャ**: WebSocket 接続管理が不要
2. **キャッシュの活用**: TanStack Query のキャッシュ機能（staleTime: 10秒）により、不要なリクエストを削減
3. **スケーラビリティ**: ポーリング間隔をユーザーが調整可能

### チームステータス判定

チームのステータスは **セッションログの mtime** で判定します：

| ステータス | 判定条件 | 削除可否 |
|-----------|---------|---------|
| `active` | セッションログ mtime ≤ 1時間 | ❌ 不可 |
| `stopped` | セッションログ mtime > 1時間 | ✅ 可能 |
| `unknown` | セッションログなし | ✅ 可能 |
| `inactive` | members 配列が空 | ✅ 可能 |

> 詳細は [docs/spec/system-design.md](docs/spec/system-design.md) §2.2 を参照

---

## 📚 ドキュメント参照

詳細な情報は `docs/spec/` 内の各ドキュメントを参照してください：

| ドキュメント | 内容 |
|------------|------|
| [architecture.md](docs/spec/architecture.md) | アーキテクチャ設計、コンポーネント構成、データフロー |
| [system-design.md](docs/spec/system-design.md) | システム設計、API仕様、データモデル |
| [frontend-tech-stack.md](docs/spec/frontend-tech-stack.md) | フロントエンド技術スタック詳細 |
| [backend-tech-stack.md](docs/spec/backend-tech-stack.md) | バックエンド技術スタック詳細 |
| [feature-specification.md](docs/spec/feature-specification.md) | 機能仕様詳細 |
| [user-guide.md](docs/spec/user-guide.md) | ユーザーガイド詳細 |
| [ut-plan.md](docs/spec/ut-plan.md) | ユニットテスト計画 |
| [qa-strategy.md](docs/spec/qa-strategy.md) | QA戦略 |
| [uat-test-cases.md](docs/spec/uat-test-cases.md) | UATテストケース |
| [code-review-template.md](docs/spec/code-review-template.md) | コードレビューテンプレート |

---

## 技術スタック

### バックエンド

| カテゴリ | 技術 |
|----------|------|
| 言語 | Python 3.11+ |
| フレームワーク | FastAPI 0.109+ |
| データ検証 | Pydantic 2.5+ |
| ファイル監視 | watchdog 4.0+ |

### フロントエンド

| カテゴリ | 技術 |
|----------|------|
| 言語 | TypeScript 5.3+ |
| フレームワーク | React 18 |
| バンドラー | Vite 5+ |
| CSS | Tailwind CSS 3.4+ |
| 状態管理 | Zustand 5.0+ |
| データフェッチ | TanStack Query 5.90+ |

> 詳細なバージョン情報は [docs/spec/frontend-tech-stack.md](docs/spec/frontend-tech-stack.md) および [docs/spec/backend-tech-stack.md](docs/spec/backend-tech-stack.md) を参照

---

## API 概要

### 主要エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/teams` | GET | チーム一覧（ステータス付き） |
| `/api/teams/{name}` | GET | チーム詳細 |
| `/api/teams/{name}` | DELETE | チーム削除（active以外） |
| `/api/tasks` | GET | タスク一覧 |
| `/api/timeline/{name}/history` | GET | 統合タイムライン |
| `/api/timeline/{name}/updates` | GET | 差分更新 |

> 完全なAPI仕様は [docs/spec/system-design.md](docs/spec/system-design.md) §6 を参照

---

## 開発コマンド

### バックエンド

```bash
cd backend

# 開発サーバー起動
uvicorn app.main:app --reload

# テスト実行
pytest                    # 全テスト
pytest --cov=app          # カバレッジ付き
pytest tests/test_api_teams.py -v  # 個別テスト
```

### フロントエンド

```bash
cd frontend

# 開発サーバー起動
npm run dev

# 型チェック
npx tsc --noEmit

# テスト実行
npm run test
npm run test:coverage     # カバレッジ付き

# 本番ビルド
npm run build
```

---

## トラブルシューティング

| 問題 | 原因 | 解決方法 |
|------|------|----------|
| チームが表示されない | `~/.claude/teams/` が空 | Claude Code でチームを作成 |
| HTTP 接続エラー | バックエンド停止 | バックエンドを再起動 |
| ページが読み込めない | フロントエンド未起動 | `npm run dev` を実行 |
| リアルタイム更新が動作しない | ポートがブロック | ファイアウォール設定を確認 |

> 詳細は [docs/spec/user-guide.md](docs/spec/user-guide.md) §トラブルシューティング を参照

---

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `DASHBOARD_HOST` | `127.0.0.1` | サーバー待ち受けアドレス |
| `DASHBOARD_PORT` | `8000` | サーバー待ち受けポート |
| `DASHBOARD_DEBUG` | `True` | デバッグモード |
| `DASHBOARD_CLAUDE_DIR` | `~/.claude` | Claude データディレクトリ |

---

## ライセンス

MIT License

---

*最終更新日: 2026-02-24*
*バージョン: 2.1.0*
