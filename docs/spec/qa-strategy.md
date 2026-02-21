# QA戦略ドキュメント

## 1. 品質目標

| メトリクス | 目標値 | 現状 |
|-----------|--------|------|
| テストカバレッジ (Backend) | 80%以上 | 0% -> 準備中 |
| テストカバレッジ (Frontend) | 80%以上 | 0% -> 準備中 |
| TypeScript strict mode エラー | 0件 | 0件 (達成) |
| Lint エラー | 0件 | 未測定 |
| E2E テストパス率 | 100% | 未実装 |

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
| StatusBadge | `__tests__/StatusBadge.test.tsx` | 完了 |
| TeamCard | `__tests__/TeamCard.test.tsx` | 完了 |
| TaskCard | `__tests__/TaskCard.test.tsx` | 完了 |
| LoadingSpinner | `__tests__/LoadingSpinner.test.tsx` | 完了 |
| ActivityFeed | `__tests__/ActivityFeed.test.tsx` | 完了 |
| useTeams | `__tests__/useTeams.test.tsx` | 完了 |
| useTasks | `__tests__/useTasks.test.tsx` | 完了 |
| useWebSocket | `__tests__/useWebSocket.test.tsx` | 構造のみ |

### 3.2 バックエンド

| モジュール | テストファイル | ステータス |
|-----------|---------------|----------|
| Teams API | `test_api_teams.py` | 基本構造完了 |
| Tasks API | `test_api_tasks.py` | 基本構造完了 |
| WebSocket | `test_websocket.py` | 構造のみ |
| Models | 未実装 | - |
| FileWatcher | 未実装 | - |

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

1. [ ] テストライブラリのインストール
2. [ ] 既存コードの単体テスト実装
3. [ ] 新規機能のテスト実装（他タスク完了後）
4. [ ] E2Eテストの実装
5. [ ] CI/CD パイプラインへの統合

---

*作成日: 2026-02-16*
*バージョン: 1.0.0*
