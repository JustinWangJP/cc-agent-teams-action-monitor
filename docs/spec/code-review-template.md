# コードレビューテンプレート

**対象バージョン**: 2.1.0
**最終更新日**: 2026-02-24

---

## 設計思想（レビュー時の重要観点）

本プロジェクトの主要な設計原則を理解した上でレビューを行ってください。

### リアルタイム更新の実現方式

- **HTTPポーリング**を採用（WebSocket ではない）
- ポーリング間隔: 5秒〜60秒（デフォルト30秒）
- TanStack Query の `refetchInterval` と `staleTime` で制御

### チームステータス判定

セッションログの mtime で判定：
- `active`: mtime ≤ 1時間
- `stopped`: mtime > 1時間
- `unknown`: セッションログなし
- `inactive`: members なし

### データソース

| データ | パス |
|--------|------|
| チーム設定 | `~/.claude/teams/{team_name}/config.json` |
| ステータス判定 | `~/.claude/projects/{project-hash}/{sessionId}.jsonl` |
| インボックス | `~/.claude/teams/{team_name}/inboxes/{agent_name}.json` |
| タスク | `~/.claude/tasks/{team_name}/{task_id}.json` |

---

## レビュー対象

- **PR/コミット**: #{番号}
- **作成者**: @username
- **レビュアー**: @qa-lead
- **レビュー日時**: YYYY-MM-DD

---

## 概要

| 項目 | 評価 |
|------|------|
| 全体的評価 | [Approve / Request Changes / Comment] |
| テストカバレッジ | XX% (目標: 80%) |
| Lint エラー | 0件 / X件 |
| TypeScript エラー | 0件 / X件 |

---

## チェックリスト結果

### 機能

- [ ] 要件を満たしている
- [ ] エッジケースが考慮されている
- [ ] エラーハンドリングが適切

### コード品質

- [ ] 可読性が高い
- [ ] 重複がない
- [ ] 適切な抽象化

### テスト

- [ ] 単体テストが十分
- [ ] テストが読みやすい
- [ ] テストが独立している

### プロジェクト固有

- [ ] WebSocket 参照が含まれていない（HTTPポーリングを使用）
- [ ] チームステータス判定が mtime ベースで実装されている
- [ ] ファイルパスが `~/.claude/` 配下を正しく参照している
- [ ] ポーリング関連のフックが `staleTime` と `refetchInterval` を正しく設定している

### ドキュメント

- [ ] コメントが適切
- [ ] 変更ログが更新されている

---

## 詳細フィードバック

### 良い点 (Strengths)

- 実装されている点1
- 実装されている点2

### 改善提案 (Suggestions)

1. **ファイル**: `path/to/file.ts:XX`
   - 内容
   - 提案: 具体的な改善案

2. **ファイル**: `path/to/file.py:XX`
   - 内容
   - 提案: 具体的な改善案

### 必須修正 (Required Changes)

1. **ファイル**: `path/to/file.ts:XX`
   - 問題: 説明
   - 修正: 具体的な修正方法

---

## 結論

[Approve] / [Request Changes]

### 追加コメント

自由記述欄
