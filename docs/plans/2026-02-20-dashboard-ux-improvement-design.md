# Agent Teams Dashboard UX改善設計書

作成日: 2026-02-20
ステータス: 承認済み

## 概要

Agent Teams Dashboardのユーザー体験を改善するための設計書。
8つの指摘事項を2つのフェーズに分けて対応する。

## 指摘事項まとめ

| # | 指摘内容 | カテゴリ | Phase |
|---|---------|---------|-------|
| 1 | チーム停止状態判定（24時間超過） | 機能改善 | 2 |
| 2 | タスク停止状態判定（24時間超過） | 機能改善 | 2 |
| 3-① | JSONがそのまま表示される | チャット表示 | 1 |
| 3-② | アイドル通知の表示がバラバラ | チャット表示 | 1 |
| 3-③ | 送信者・受信者が不明 | チャット表示 | 1 |
| 3-④ | シャットダウン系アイコンが同じ | チャット表示 | 1 |
| 3-⑤ | 未読表示が分かりにくい | チャット表示 | 1 → 削除 |
| 3-⑥ | タスクリストが分かりにくい | 機能改善 | 2 |
| 3-⑦ | 依存グラフ削除 | 機能削除 | 2 |
| 3-⑧ | 通信ネットワーク削除 | 機能削除 | 2 |

---

## Phase 1: チャット表示改善

### 1.1 メッセージタイプ別表示ロジック

現状、`text`フィールドにJSONがそのまま格納されており、解析されずに表示されている。

#### 対応内容

各メッセージタイプに応じた適切な表示形式を生成する。

```typescript
// types/message.ts に追加
export type MessageType =
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'shutdown_approved'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'unknown';

// メッセージタイプ別の表示データ生成
interface MessageDisplayData {
  summary: string;      // 一覧表示用の短いテキスト
  detail?: string;      // 詳細パネル用の長いテキスト
  icon: string;         // アイコン絵文字
  colorClass: string;   // Tailwind色クラス
}

const renderMessageByType = (data: Record<string, unknown>): MessageDisplayData => {
  const type = data.type as string;

  switch (type) {
    case 'task_assignment':
      return {
        summary: data.subject as string || 'タスク割り当て',
        detail: data.description as string,
        icon: '📋',
        colorClass: 'bg-blue-100 text-blue-800',
      };

    case 'idle_notification':
      const reason = data.idleReason as string;
      return {
        summary: reason === 'available' ? '指示待機中' : `アイドル: ${reason || '理由不明'}`,
        icon: '💤',
        colorClass: 'bg-gray-100 text-gray-800',
      };

    case 'shutdown_request':
      return {
        summary: `シャットダウン要求`,
        detail: data.reason as string,
        icon: '🛑',
        colorClass: 'bg-red-100 text-red-800',
      };

    case 'shutdown_response':
      return {
        summary: `シャットダウン応答: ${data.approve ? '承認' : '却下'}`,
        icon: '✅',
        colorClass: 'bg-green-100 text-green-800',
      };

    case 'shutdown_approved':
      return {
        summary: 'シャットダウン了承済み',
        icon: '✔️',
        colorClass: 'bg-green-100 text-green-800',
      };

    case 'plan_approval_request':
      return {
        summary: 'プラン承認要求',
        detail: data.reason as string,
        icon: '📄',
        colorClass: 'bg-purple-100 text-purple-800',
      };

    case 'plan_approval_response':
      return {
        summary: `プラン承認: ${data.approve ? '承認' : '修正要求'}`,
        icon: '📝',
        colorClass: 'bg-purple-100 text-purple-800',
      };

    default:
      return {
        summary: data.summary as string || data.text as string || 'メッセージ',
        icon: '💬',
        colorClass: 'bg-slate-100 text-slate-800',
      };
  }
};
```

### 1.2 送信者→受信者の明確化

#### 現状の問題
- `from`フィールドは表示されるが、`to`（受信者）が明示されていない
- インボックスのファイル名から受信者を推定する必要がある

#### 対応内容

チャットバブルのヘッダーに「from → to」を明示的に表示。

```
┌─────────────────────────────────────────────┐
│ [TL] team-lead → backend-developer          │  ← ヘッダー行
│ 14:31:39  📋                                │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ P0: バーチャルスクロール実装             │ │  ← summary表示
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 実装方法

1. バックエンドAPIで受信者情報を追加
   - `GET /api/teams/{team_name}/messages/timeline` のレスポンスに `receiver` フィールドを追加
   - インボックスファイル名から受信者を推定

2. フロントエンドで表示
   - `ChatMessageBubble.tsx` で `from → to` 形式で表示

### 1.3 アイコンの区別化

#### アイコン割り当て表

| メッセージタイプ | アイコン | 色 |
|-----------------|---------|-----|
| `message` | 💬 | gray |
| `task_assignment` | 📋 | blue |
| `idle_notification` | 💤 | gray |
| `shutdown_request` | 🛑 | red |
| `shutdown_response` | ✅ | green |
| `shutdown_approved` | ✔️ | green |
| `plan_approval_request` | 📄 | purple |
| `plan_approval_response` | 📝 | purple |

### 1.4 未読機能の削除

#### 削除内容

- `InboxMessage.read` フィールドの使用を削除
- `ChatMessageBubble` の未読インジケーター削除
- `ChatHeader` の未読カウント表示削除
- `dashboardStore` の `unreadCounts` 関連コード削除（または簡素化）

### 1.5 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `types/message.ts` | `MessageType` に `shutdown_approved` を追加 |
| `ChatMessageBubble.tsx` | タイプ別レンダリング、送信者→受信者表示、未読削除 |
| `ChatTimelinePanel.tsx` | 受信者推定ロジック改善 |
| `ChatHeader.tsx` | 未読表示削除 |
| `backend/app/api/routes/messages.py` | レスポンスに `receiver` フィールド追加 |
| `dashboardStore.ts` | `unreadCounts` 関連の簡素化 |

---

## Phase 2: 機能改善・削除

### 2.1 チーム/タスク停止判定

#### 判定基準
- ログファイルの最終更新日時（mtime）が現在時刻から24時間を超過 → 「停止」状態

#### バックエンド変更

```python
# backend/app/api/routes/teams.py

import os
from datetime import datetime, timezone

def get_team_status(team_dir: Path, config: dict) -> str:
    """チームのステータスを判定。
    
    - members が存在する → ファイルの mtime を確認
    - 24時間超過 → 'stopped'
    - 24時間以内 → 'active'
    - members がない → 'inactive'
    """
    if not config.get("members"):
        return "inactive"
    
    # config.json の mtime を取得
    config_path = team_dir / "config.json"
    if config_path.exists():
        mtime = os.path.getmtime(config_path)
        mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        
        if (now - mtime_dt).total_seconds() > 24 * 60 * 60:
            return "stopped"
    
    return "active"
```

#### フロントエンド変更

```typescript
// types/team.ts
export interface TeamSummary {
  // ... 既存フィールド
  status: 'active' | 'inactive' | 'stopped';  // 'stopped' を追加
  lastActivity?: string;
}

// types/task.ts
export interface TaskSummary {
  // ... 既存フィールド
  status: 'pending' | 'in_progress' | 'completed' | 'deleted' | 'stopped';  // 'stopped' を追加
}

// StatusBadge.tsx
const statusColors: Record<string, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
  stopped: 'bg-gray-500',  // 追加
  // ...
};
```

### 2.2 タスクリストの使いやすさ改善

#### 追加機能

1. **チームフィルタ**
   - ドロップダウンでチームを選択してタスクをフィルタ
   - 「全チーム」オプション付き

2. **検索機能**
   - 件名・担当者でフィルタリング

3. **機能説明**
   - ツールチップまたはヘルプテキストを追加
   - 「タスクはエージェントチームの作業単位です」等の説明

4. **タスクカードの表示改善**
   - 担当者を大きく表示
   - チーム名を目立たせる
   - 停止状態の視覚的区別

### 2.3 不要機能の削除

#### 削除対象

**フロントエンド**:
- `frontend/src/components/graph/TaskDependencyGraph.tsx`
- `frontend/src/components/graph/AgentNetworkGraph.tsx`
- `frontend/src/components/graph/networkTypes.ts`
- `frontend/src/components/graph/types.ts`
- `frontend/src/components/graph/utils.ts`
- `frontend/src/components/graph/networkUtils.ts`
- `frontend/src/components/graph/index.ts`
- `frontend/src/components/graph/__tests__/*`
- `App.tsx`: 'graphs', 'network' ビュー関連コード

**バックエンド**:
- `backend/app/api/routes/teams.py`: `/messages/network` エンドポイント
- `backend/app/models/network.py`

---

## 変更ファイル一覧（全体）

### Phase 1

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `types/message.ts` | 修正 | MessageType拡張 |
| `ChatMessageBubble.tsx` | 修正 | タイプ別表示、送信者→受信者、未読削除 |
| `ChatTimelinePanel.tsx` | 修正 | 受信者推定ロジック |
| `ChatHeader.tsx` | 修正 | 未読表示削除 |
| `dashboardStore.ts` | 修正 | unreadCounts簡素化 |
| `backend/app/api/routes/messages.py` | 修正 | receiverフィールド追加 |

### Phase 2

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `backend/app/api/routes/teams.py` | 修正 | 停止判定ロジック追加 |
| `backend/app/api/routes/tasks.py` | 修正 | 停止判定ロジック追加 |
| `types/team.ts` | 修正 | 'stopped'ステータス追加 |
| `types/task.ts` | 修正 | 'stopped'ステータス追加 |
| `StatusBadge.tsx` | 修正 | 'stopped'表示追加 |
| `TeamCard.tsx` | 修正 | 停止状態の視覚的区別 |
| `TaskCard.tsx` | 修正 | 停止状態・表示改善 |
| `App.tsx` | 修正 | タスクフィルタ追加、グラフビュー削除 |
| `frontend/src/components/graph/*` | 削除 | グラフ機能一式 |
| `backend/app/models/network.py` | 削除 | ネットワークモデル |
| `backend/app/api/routes/teams.py` | 修正 | /messages/network削除 |

---

## テスト計画

### Phase 1 テスト項目

1. **メッセージタイプ別表示**
   - task_assignment: 件名が表示されること
   - idle_notification: 復帰/アイドル理由が表示されること
   - shutdown系: 適切なアイコンとメッセージが表示されること

2. **送信者→受信者表示**
   - ヘッダーに「from → to」が表示されること
   - 受信者が正しく推定されること

3. **未読機能削除**
   - 未読バッジが表示されないこと
   - 既読マークが表示されないこと

### Phase 2 テスト項目

1. **チーム停止判定**
   - 24時間超過のチームが「停止」と表示されること
   - 24時間以内のチームが「アクティブ」と表示されること

2. **タスク停止判定**
   - 同上

3. **タスクリスト改善**
   - チームフィルタが動作すること
   - 検索が動作すること

4. **機能削除**
   - 依存グラフ・通信ネットワークが表示されないこと
   - エラーが発生しないこと

---

## 参考資料

- ユーザー指摘元: 本会話の冒頭
- 既存設計書: `docs/plans/2026-02-19-chat-timeline-improvement-analysis.md`
