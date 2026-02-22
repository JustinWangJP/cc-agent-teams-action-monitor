# タイムラインUI改善設計書

**作成日**: 2026-02-22
**設計対象**: Agent Teams Dashboard - タイムライン表示改善

---

## 1. 概要

### 1.1 目的

タイムライン表示の改善により、セッションログとinboxメッセージをより直感的に区別し、ユーザビリティを向上させる。

### 1.2 変更範囲

- `ChatMessageBubble.tsx` - メッセージバブルの左右配置とMarkdownテーブル対応
- `TimelineFilters.tsx` - フィルターからtool_use/file_changeを削除
- ファイル変更監視機能の削除
- `TimelinePanel.tsx` / レイアウト - デスクトップ/モバイル対応の2カラムレイアウト

---

## 2. 詳細設計

### 2.1 Markdownテーブル表示（GitHubスタイル）

**変更対象**: `ChatMessageBubble.tsx` - `MarkdownRenderer`コンポーネント

**追加スタイル**:
```typescript
'[&>table]:w-full [&>table]:border-collapse [&>table]:my-2',
'[&>table>thead>tr]:border-b [&>table>thead>tr]:border-slate-300 [&>table>thead>tr]:dark:border-slate-600',
'[&>table>thead>tr>th]:text-left [&>table>thead>tr>th]:p-2 [&>table>thead>tr>th]:bg-slate-100 [&>table>thead>tr>th]:dark:bg-slate-800 [&>table>thead>tr>th]:font-semibold',
'[&>table>tbody>tr]:border-b [&>table>tbody>tr]:border-slate-200 [&>table>tbody>tr]:dark:border-slate-700',
'[&>table>tbody>tr>td]:p-2 [&>table>tbody>tr>td]:align-top',
'[&>table>tbody>tr:nth-child(even)]:bg-slate-50 [&>table>tbody>tr:nth-child(even)]:dark:bg-slate-800/50',
```

### 2.2 左右分離チャットUI

**変更対象**: `ChatMessageBubble.tsx`

**レイアウトルール**:

| データソース | 配置 | 方向 |
|------------|------|------|
| session | 左側 | flex-row（アバター→メッセージ） |
| inbox | 右側 | flex-row-reverse（メッセージ←アバター） |

**実装**:
```typescript
const isSession = isUnifiedTimelineEntry(message) && message.source === 'session';
const layoutClass = isSession ? 'flex-row' : 'flex-row-reverse';
const justifyClass = isSession ? 'justify-start' : 'justify-end';
```

### 2.3 メッセージタイプフィルターの修正

**変更対象**: `types/message.ts`, `TimelineFilters.tsx`

**問題**: ユーザーメッセージ、AI応答、思考がフィルターとして効かない

**原因**: `ExtendedParsedType`にsession由来のタイプが含まれているが、フィルターUIで対応していない

**修正内容**:
1. `ExtendedParsedType`から`tool_use`と`file_change`を削除
2. フィルター対象のタイプを明確に定義：
   - `user_message` - ユーザーメッセージ
   - `assistant_message` - AI応答
   - `thinking` - 思考プロセス
   - inbox由来の既存タイプ（task_assignment等）

### 2.4 ファイル変更監視機能の削除

**削除対象**:
- `frontend/src/components/file/FileChangesPanel.tsx`
- `frontend/src/hooks/useFileChanges.ts`
- バックエンド: `FileChangeEntry`関連API（必要に応じて）
- `types/message.ts`から`FileChangeEntry`, `FileChangeFilter`を削除

### 2.5 2カラムレイアウト（デスクトップ/モバイル対応）

**変更対象**: `TimelinePanel.tsx` または新規レイアウトコンポーネント

**Desktopレイアウト**（画面幅 >= 1024px）:
```
┌──────────────────────────────┬──────────────────────────────┐
│                              │                              │
│   左: タイムラインパネル      │   右: タスク監視パネル        │
│   (メッセージ一覧)            │   (選択中タスクの状態)        │
│                              │                              │
│   ┌──────────────────────┐   │   ┌──────────────────────┐   │
│   │ 🤖 AI                │   │   │ 📋 タスク詳細         │   │
│   │ 思考中...            │   │   │ 進捗: 75%            │   │
│   └──────────────────────┘   │   │ ステータス: working   │   │
│                              │   └──────────────────────┘   │
│   ┌──────────────────────┐   │                              │
│   │         👤 User      │   │   ┌──────────────────────┐   │
│   │         メッセージ    │   │   │ 👤 エージェント状態   │   │
│   └──────────────────────┘   │   │ ・dev-lead: working  │   │
│                              │   │ ・frontend-dev: idle │   │
└──────────────────────────────┴──────────────────────────────┘
```

**Mobileレイアウト**（画面幅 < 1024px）:
```
┌──────────────────────────────────────┐
│                                      │
│   上: タイムラインパネル              │
│   (メッセージ一覧)                    │
│                                      │
│   ┌──────────────────────────────┐   │
│   │ 🤖 AI                        │   │
│   │ 思考中...                    │   │
│   └──────────────────────────────┘   │
│   ┌──────────────────────────────┐   │
│   │         👤 User              │   │
│   │         メッセージ            │   │
│   └──────────────────────────────┘   │
│                                      │
├──────────────────────────────────────┤  ← スクロール境界
│                                      │
│   下: タスク監視パネル                │
│   (選択中タスクの状態)                │
│                                      │
│   ┌──────────────────────────────┐   │
│   │ 📋 タスク詳細                 │   │
│   │ 進捗: 75%                    │   │
│   └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

**実装方針**:
```typescript
// Tailwind responsive classes
const containerClass = 'flex flex-col lg:flex-row lg:h-full';
const timelineClass = 'w-full lg:w-1/2 lg:h-full overflow-y-auto';
const taskPanelClass = 'w-full lg:w-1/2 lg:h-full overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700';
```

### 2.6 UserとAI Assistantメッセージの視覚的区別

**変更対象**: `ChatMessageBubble.tsx`

**Userメッセージ（session: user_message）**:
- アバター: 👤 またはユーザーアイコン
- 背景色: `bg-blue-100 dark:bg-blue-900/30`（青系）
- ボーダー: `border-blue-200 dark:border-blue-800`
- 表示名: "User" または実際のユーザー名

**AI Assistantメッセージ（session: assistant_message）**:
- アバター: 🤖 またはAIアイコン
- 背景色: `bg-purple-100 dark:bg-purple-900/30`（紫系）
- ボーダー: `border-purple-200 dark:border-purple-800`
- 表示名: エージェント名（例: "claude", "assistant"）

**区別要素**:
```typescript
const getMessageStyle = (parsedType: string, source: string) => {
  if (parsedType === 'user_message') {
    return {
      icon: '👤',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      borderClass: 'border-blue-200 dark:border-blue-800',
      label: 'User',
    };
  }
  if (parsedType === 'assistant_message') {
    return {
      icon: '🤖',
      bgClass: 'bg-purple-100 dark:bg-purple-900/30',
      borderClass: 'border-purple-200 dark:border-purple-800',
      label: message.from || 'AI',
    };
  }
  // ... other types
};
```

---

## 3. 実装計画

### 3.1 タスク一覧

#### タスク1: Markdownテーブルスタイル追加
**優先度**: 高 | **見積時間**: 30分

```markdown
- [ ] `ChatMessageBubble.tsx` の `MarkdownRenderer` にテーブルスタイルを追加
  - ヘッダー背景色 (bg-slate-100 dark:bg-slate-800)
  - セル枠線 (border-slate-300 dark:border-slate-600)
  - 交互行背景色 (偶数行: bg-slate-50)
  - パディング調整 (th, td: p-2)
```

#### タスク2: 左右分離チャットUI実装
**優先度**: 高 | **見積時間**: 1時間

```markdown
- [ ] `ChatMessageBubble.tsx` のレイアウト変更
  - sessionメッセージ: 左寄せ (flex-row)
  - inboxメッセージ: 右寄せ (flex-row-reverse)
  - アバター位置の自動調整
  - メッセージバブルの最大幅調整 (max-w-[80%])
```

#### タスク3: メッセージタイプフィルター修正
**優先度**: 高 | **見積時間**: 1時間

```markdown
- [ ] `types/message.ts` の `ExtendedParsedType` から削除:
  - `tool_use`
  - `file_change`

- [ ] `types/message.ts` の `MESSAGE_TYPE_CONFIG` から削除:
  - `tool_use`
  - `file_change`

- [ ] `ChatMessageBubble.tsx` の `getMessageDisplayText` から削除:
  - `tool_use` ケース
  - `file_change` ケース

- [ ] `ChatMessageBubble.tsx` の `SessionDetails` コンポーネントから削除:
  - ファイル変更表示ブロック
  - ツール使用表示ブロック
```

#### タスク4: ファイル変更監視機能削除
**優先度**: 中 | **見積時間**: 1時間

```markdown
- [ ] バックエンド削除:
  - `backend/app/api/routes/timeline.py` の `/file-changes/{team}` エンドポイント
  - `backend/app/services/timeline_service.py` のファイル変更関連メソッド

- [ ] フロントエンド削除:
  - `frontend/src/components/file/FileChangesPanel.tsx`
  - `frontend/src/hooks/useFileChanges.ts`
  - `frontend/src/types/message.ts` の `FileChangeEntry`, `FileChangeFilter`

- [ ] 親コンポーネントからの参照削除:
  - `TimelinePanel.tsx` からのFileChangesPanel参照
```

#### タスク5: タイムライン画面レイアウト変更
**優先度**: 高 | **見積時間**: 2時間

```markdown
- [ ] 新しいレイアウトコンポーネント作成:
  - Desktop: 左右2カラム (左: 60%, 右: 40%)
  - Mobile: 上下配置 (タイムライン固定高さ + タスクパネルスクロール)

- [ ] `TimelinePanel.tsx` の改修:
  - グリッドレイアウト導入
  - レスポンシブ対応

- [ ] タスク状態監視パネル作成/改修:
  - 選択されたタスクの詳細表示
  - タスク進捗バー
  - activeForm表示
  - 依存関係表示
```

#### タスク6: User/AIメッセージ視覚的区別改善
**優先度**: 中 | **見積時間**: 30分

```markdown
- [ ] `types/message.ts` の色定義更新:
  - `user_message`: ユーザー向け色 (青系: bg-blue-50, border-blue-300)
  - `assistant_message`: AI向け色 (紫系: bg-purple-50, border-purple-300)

- [ ] `ChatMessageBubble.tsx` のスタイル適用:
  - Userメッセージ: 右側配置 + 青系ボーダー
  - AIメッセージ: 左側配置 + 紫系ボーダー
```

### 3.2 実装順序

1. **タスク3** → タイプ定義の修正（他のタスクに影響）
2. **タスク4** → 不要機能の削除（コード整理）
3. **タスク1** → Markdownテーブル（独立した修正）
4. **タスク2** → 左右UI（レイアウト変更）
5. **タスク6** → 色分け（スタイル調整）
6. **タスク5** → レイアウト変更（大きな変更）

### 3.3 依存関係

```
タスク3 → タスク1, タスク2, タスク6
タスク4 → タスク5（FileChangesPanel削除後のレイアウト調整）
タスク2 → タスク6（左右配置後の色分け）
```

---

## 4. テスト計画

### 4.1 ユニットテスト
- `ChatMessageBubble.test.tsx`: 左右配置、色分けのテスト
- `types/message.test.ts`: タイプ定義のテスト

### 4.2 E2Eテスト
- フィルター機能の動作確認
- レスポンシブレイアウトの確認
- タスク選択時の表示確認

---

## 5. 技術的注意点

### 5.1 破壊的変更
`ExtendedParsedType` から `tool_use`, `file_change` を削除すると、既存データとの互換性が失われる可能性があります。マイグレーションが必要か確認してください。

### 5.2 レイアウト変更
Desktop/Mobileの切り替えは `useMediaQuery` またはTailwindのブレークポイントを使用します。

### 5.3 パフォーマンス
タイムラインとタスクパネルの同時表示により、レンダリング負荷が増加する可能性があります。適切なメモ化を行ってください。

---
