# チームステータス判定・削除機能 設計書

**作成日:** 2026-02-23

## 概要

Active Teams のステータス判定ロジックを変更し、停止状態のチームを手動削除する機能を追加する。

## 要件

### ステータス判定

| ステータス | 判定条件 | 削除ボタン |
|-----------|---------|-----------|
| **`active`** | セッションログ mtime ≤ 1時間 | 非表示 |
| **`stopped`** | セッションログ mtime > 1時間 | 表示 |
| **`unknown`** | セッションログなし | 非表示 |
| **`inactive`** | `members` 空配列 | 非表示 |

### 削除機能

- **トリガー:** 手動（削除ボタン押下）
- **対象:** `stopped` 状態のチームのみ
- **確認:** ダイアログで確認後、削除実行
- **通知:** トースト通知（react-hot-toast）

### 削除対象ファイル

```
├── teams/{team-name}/           # チーム設定全体
│   ├── config.json
│   └── inboxes/
├── tasks/{team-name}/           # タスク定義
│   └── *.json
└── projects/{project-hash}/     # セッションログ
    └── {sessionId}.jsonl
```

## 設計詳細

### 1. ステータス判定ロジック

#### 判定フロー

```
1. config.json の members 配列を確認
   ├─ 空の場合 → inactive
   └─ 要素あり → セッションログ確認へ

2. セッションログの存在確認
   ├─ なし → unknown
   └─ あり → mtime 確認へ

3. セッションログ mtime と現在時刻の差分
   ├─ ≤ 1時間 → active
   └─ > 1時間 → stopped
```

#### project-hash 生成ロジック

**現状の実装（`timeline_service.py`）:**

```python
def _cwd_to_project_hash(self, cwd: str) -> str:
    return "-" + cwd.lstrip("/").replace("/", "-")
```

**例:**
- `cwd = /Users/xxx/project`
- `project-hash = -Users-xxx-project`
- `セッションログ = ~/.claude/projects/-Users-xxx-project/{sessionId}.jsonl`

### 2. 削除 API 設計

#### エンドポイント

```
DELETE /api/teams/{team_name}
```

#### 処理フロー

```
1. チームの存在確認
   └─ なし → 404 Not Found

2. ステータス確認（stopped のみ削除可能）
   └─ stopped 以外 → 400 Bad Request

3. 削除実行
   ├─ teams/{team-name}/ ディレクトリ削除
   ├─ tasks/{team-name}/ ディレクトリ削除
   └─ projects/{project-hash}/ ディレクトリ削除

4. 成功レスポンス
   └─ 200 OK
```

#### レスポンス形式

**成功:**
```json
{
  "message": "チーム「my-team」を削除しました",
  "deletedPaths": [
    "~/.claude/teams/my-team",
    "~/.claude/tasks/my-team",
    "~/.claude/projects/-Users-xxx-project"
  ]
}
```

**エラー（ステータス不正）:**
```json
{
  "detail": "ステータスが「active」のチームは削除できません。「stopped」のチームのみ削除可能です。"
}
```

**エラー（チームなし）:**
```json
{
  "detail": "チーム「my-team」が見つかりません"
}
```

### 3. フロントエンド設計

#### 3.1 StatusBadge 更新

**ファイル:** `frontend/src/components/common/StatusBadge.tsx`

| ステータス | 色 | クラス |
|-----------|-----|-------|
| `active` | 緑 | `bg-green-500` |
| `stopped` | 灰 | `bg-gray-500` |
| `unknown` | 黄 | `bg-yellow-500` |
| `inactive` | 灰 | `bg-gray-400` |

#### 3.2 TeamCard 削除ボタン

**ファイル:** `frontend/src/components/dashboard/TeamCard.tsx`

- `stopped` 状態のみ削除ボタンを表示
- クリック時に `onDeleteClick` コールバックを呼び出し

#### 3.3 確認ダイアログ

**実装:** Radix UI Dialog（既存の `@radix-ui/react-dialog` を使用）

**表示内容:**
```
チーム削除の確認

チーム「{team-name}」を削除しますか？
以下のファイルが削除されます：
- teams/{team-name}/
- tasks/{team-name}/
- projects/{project-hash}/

[キャンセル] [削除]
```

#### 3.4 トースト通知

**ライブラリ:** `react-hot-toast`

```bash
npm install react-hot-toast
```

**使用例:**
```tsx
import toast from 'react-hot-toast';

// 削除成功時
toast.success('チーム「my-team」を削除しました');

// 削除失敗時
toast.error('削除に失敗しました: エラーメッセージ');
```

## 実装ステップ

### Step 1: バックエンド - ステータス判定ロジック変更
- `backend/app/api/routes/teams.py` の `get_team_status()` 修正
- `backend/app/models/team.py` に `unknown` ステータス追加
- テスト追加・更新

### Step 2: バックエンド - 削除 API 追加
- `backend/app/api/routes/teams.py` に `DELETE /api/teams/{team_name}` 追加
- 日本語エラーメッセージ
- テスト追加

### Step 3: フロントエンド - 型定義更新
- `frontend/src/types/team.ts` に `unknown` ステータス追加

### Step 4: フロントエンド - StatusBadge 更新
- `frontend/src/components/common/StatusBadge.tsx` に `unknown` 色追加

### Step 5: フロントエンド - react-hot-toast 導入
- `npm install react-hot-toast`
- `App.tsx` に `<Toaster />` 追加

### Step 6: フロントエンド - TeamCard 削除機能追加
- 削除ボタン（stopped のみ表示）
- 確認ダイアログ（Radix UI Dialog）
- 削除 API 呼び出し
- トースト通知

## 影響範囲

### バックエンド
- `app/api/routes/teams.py` - ステータス判定・削除 API
- `app/models/team.py` - ステータス型定義
- `tests/api/routes/test_teams.py` - テスト追加

### フロントエンド
- `src/types/team.ts` - 型定義
- `src/components/common/StatusBadge.tsx` - ステータス表示
- `src/components/dashboard/TeamCard.tsx` - 削除ボタン
- `src/App.tsx` - トーストプロバイダー
- `package.json` - react-hot-toast 追加
