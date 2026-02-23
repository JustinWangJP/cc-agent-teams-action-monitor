# QA戦略ドキュメント

## 1. 品質目標

| メトリクス | 目標値 | 現状 |
|-----------|--------|------|
| テストカバレッジ (Backend) | 80%以上 | 70%+ (pyproject.toml で要求) |
| テストカバレッジ (Frontend) | 80%以上 | 準備中 |
| TypeScript strict mode エラー | 0件 | 0件 (達成) |
| Lint エラー | 0件 | 未測定 |
| E2E テストパス率 | 100% | 未実装 |

### 1.1 設計思想

#### テスト戦略の基本方針

本システムは **HTTPポーリング** でリアルタイム更新を実現しているため、WebSocket テストは不要です。代わりに以下を重視：

1. **ポーリング動作のテスト**: TanStack Query の `refetchInterval` と `staleTime` の連携
2. **キャッシュ無効化のテスト**: FileWatcher によるキャッシュ無効化の動作確認
3. **ステータス判定のテスト**: セッションログ mtime による判定ロジックの検証

#### テストすべき重要なロジック

| ロジック | テスト観点 | 優先度 |
|---------|-----------|--------|
| チームステータス判定 | mtime ≤ 1時間 → active, mtime > 1時間 → stopped | 高 |
| エージェント状態推論 | タスク状態・活動時刻からの状態推論 | 高 |
| 統合タイムライン | inbox + セッションログの統合 | 高 |
| チーム削除 | stopped 状態のみ削除可能 | 高 |
| メッセージパース | JSON-in-JSON の正確な解析 | 中 |

---

## 2. テスト環境

### 2.1 バックエンド

```bash
cd backend
pip install -e ".[dev]"

# テスト実行
pytest

# カバレッジ付き
pytest --cov=app --cov-report=html

# 特定テスト
pytest tests/test_api_teams.py -v
```

### 2.2 フロントエンド

```bash
cd frontend
npm install

# テスト実行
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage

# UI
npm run test:ui
```

---

## 3. テスト実装状況

### 3.1 フロントエンド

| コンポーネント/フック | テストファイル | ステータス |
|----------------------|---------------|----------|
| StatusBadge | `__tests__/StatusBadge.test.tsx` | ✅ 完了 |
| TeamCard | `__tests__/TeamCard.test.tsx` | ✅ 完了 |
| TaskCard | `__tests__/TaskCard.test.tsx` | ✅ 完了 |
| LoadingSpinner | `__tests__/LoadingSpinner.test.tsx` | ✅ 完了 |
| ActivityFeed | `__tests__/ActivityFeed.test.tsx` | ✅ 完了 |
| ThemeToggle | `__tests__/ThemeToggle.test.tsx` | ✅ 完了 |
| useTeams | `__tests__/useTeams.test.tsx` | ✅ 完了（ポーリング動作含む） |
| useTasks | `__tests__/useTasks.test.tsx` | ✅ 完了 |
| useInbox | `__tests__/useInbox.test.tsx` | ✅ 完了 |
| useUnifiedTimeline | `__tests__/useUnifiedTimeline.test.tsx` | 📝 計画中 |
| useAgentMessages | `__tests__/useAgentMessages.test.tsx` | 📝 計画中 |
| dashboardStore | `__tests__/dashboardStore.test.ts` | 📝 計画中 |

### 3.2 バックエンド

| モジュール | テストファイル | ステータス |
|-----------|---------------|----------|
| Teams API | `test_api_teams.py` | ✅ 基本完了 |
| Teams Delete API | `test_api_teams.py` | 📝 計画中 |
| Tasks API | `test_api_tasks.py` | ✅ 基本完了 |
| Timeline API | `test_api_timeline.py` | 📝 計画中 |
| Agents API | `test_api_agents.py` | 📝 計画中 |
| Models | `test_models.py` | 📝 計画中 |
| FileWatcher | `test_file_watcher.py` | 📝 計画中 |
| CacheService | `test_cache_service.py` | 📝 計画中 |
| TimelineService | `test_timeline_service.py` | 📝 計画中 |
| AgentStatusService | `test_agent_status_service.py` | 📝 計画中 |
| MessageParser | `test_message_parser.py` | 📝 計画中 |

---

## 4. コードレビューチェックリスト

### 4.1 共通

- [ ] コードが一貫したスタイルで書かれている
- [ ] 適切なエラーハンドリングが実装されている
- [ ] マジックナンバーが定数として定義されている
- [ ] 適切な命名規則が使用されている
- [ ] 不要なコメントやコードが削除されている

### 4.2 フロントエンド (TypeScript/React)

- [ ] TypeScript strict mode エラーがない
- [ ] Props に適切な型定義がある
- [ ] useCallback/useMemo が適切に使用されている
- [ ] レンダリングパフォーマンスの問題がない
- [ ] アクセシビリティ（ARIA）が考慮されている

### 4.3 バックエンド (Python/FastAPI)

- [ ] 型ヒントが適切に使用されている
- [ ] 非同期処理（async/await）が正しく使用されている
- [ ] Pydantic モデルのバリデーションが適切
- [ ] ログ出力が適切に行われている
- [ ] セキュリティ（入力検証、認可）が考慮されている

---

## 5. 品質ゲート

### 5.1 PRマージ条件

1. 全テストがパスすること
2. カバレッジが目標値以上であること
3. Lint エラーがないこと
4. レビューアの承認が1件以上あること

### 5.2 リリース条件

1. 全ての Critical/High バグが修正されている
2. E2E テストが全件パスしている
3. パフォーマンス要件を満たしている

---

## 6. 次のアクション

1. [x] テストライブラリのインストール（Vitest, pytest）
2. [x] 既存コードの単体テスト実装（基本コンポーネント）
3. [ ] 新規サービスのテスト実装
   - [ ] TimelineService テスト
   - [ ] AgentStatusService テスト
   - [ ] MessageParser テスト
   - [ ] チーム削除 API テスト
4. [ ] 統合タイムライン関連テスト
   - [ ] useUnifiedTimeline フックテスト
   - [ ] Timeline API テスト
5. [ ] E2Eテストの実装
6. [ ] CI/CD パイプラインへの統合

---

## 7. テストカテゴリ優先度

### P0: 必須テスト（リリースブロッカー）

| カテゴリ | テスト項目 | 理由 |
|---------|-----------|------|
| チームステータス判定 | mtime基準の判定ロジック | コア機能 |
| チーム削除 | 権限チェック・ファイル削除 | データ損失防止 |
| 統合タイムライン | データソース統合 | 主要機能 |
| エージェント状態推論 | 状態遷移ロジック | 主要機能 |

### P1: 重要テスト

| カテゴリ | テスト項目 |
|---------|-----------|
| HTTPポーリング | refetchInterval 動作 |
| キャッシュ無効化 | FileWatcher 連携 |
| メッセージパース | 全メッセージタイプ |
| エラーハンドリング | API エラーレスポンス |

### P2: 推奨テスト

| カテゴリ | テスト項目 |
|---------|-----------|
| UI コンポーネント | 表示・インタラクション |
| テーマ切替 | ダークモード |
| パフォーマンス | 大量データ時の動作 |

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-24*
*バージョン: 2.1.0*
