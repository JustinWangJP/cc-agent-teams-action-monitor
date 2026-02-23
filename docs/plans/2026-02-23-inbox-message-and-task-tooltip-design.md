# 設計書: Inbox メッセージレイアウト修正 & タスク監視ツールチップ

## 作成日
2026-02-23

## 概要

1. Inbox メッセージの表示レイアウトを修正（アバターとの間隔縮小、横幅固定）
2. タスク監視パネルにステータス説明ツールチップを追加

---

## 1. Inbox メッセージレイアウト修正

### 変更ファイル
`frontend/src/components/chat/ChatMessageBubble.tsx`

### 変更内容

#### 1.1 間隔の調整

**変更前:**
```tsx
'group relative flex gap-4 p-4 rounded-lg transition-all duration-200',
```

**変更後:**
```tsx
'group relative flex p-4 rounded-lg transition-all duration-200',
isSession ? 'gap-4' : 'gap-2',
```

- Session メッセージ: `gap-4`（16px）を維持
- Inbox メッセージ: `gap-2`（8px）に縮小

#### 1.2 横幅の固定と横スクロール対応

**変更前:**
```tsx
<div className="flex-1 min-w-0 max-w-[80%]">
```

**変更後:**
```tsx
<div className={clsx(
  "min-w-0",
  isSession
    ? "flex-1 max-w-[80%]"
    : "w-auto max-w-[400px] overflow-x-auto"
)}>
```

- Session メッセージ: 可変幅（最大80%）
- Inbox メッセージ: 固定幅（最大400px）、横スクロール可

---

## 2. タスク監視パネル ツールチップ

### 変更ファイル
`frontend/src/components/tasks/TaskMonitorPanel.tsx`

### ツールチップ内容

| アイコン | ステータス | ツールチップ説明 |
|---------|-----------|-----------------|
| LayoutList | 全タスク | チームに割り当てられた全てのタスク |
| Clock | 未着手 | まだ着手していないタスク |
| RefreshCw | 進行中 | 現在作業中のタスク |
| PauseCircle | 待機中 | 他のタスクにブロックされている |
| CheckCircle2 | 完了 | 完了したタスク |

### ツールチップスタイル

StatusBadge と同様のカスタムツールチップを実装：

```tsx
<span className="relative group cursor-help">
  {/* アイコンとカウント */}
  <div>...</div>

  {/* ツールチップ */}
  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
    {description}
    {/* 矢印 */}
    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
  </span>
</span>
```

### 実装箇所

1. **最小化表示（48px幅の縦列）** - 統計アイコン縦列
2. **展開表示（300px幅）** - 統計情報セクション

---

## 3. 実装順序

1. `ChatMessageBubble.tsx` のレイアウト修正
2. `TaskMonitorPanel.tsx` のツールチップ追加
3. 型チェックで動作確認

---

## 4. タスク監視パネルの追加UI修正

### 4.1 サマリーカードのテキスト縦方向問題（最重要）

**問題:** 統計セクション（grid-cols-4）の幅が狭く、テキストが縦に折り返される

**変更ファイル:** `frontend/src/components/tasks/TaskMonitorPanel.tsx`

**変更前:**
```tsx
<div className="grid grid-cols-4 gap-2 p-4 border-b ...">
```

**変更後:**
```tsx
<div className="grid grid-cols-2 gap-2 p-4 border-b ...">
```

- 2列レイアウトに変更し、各カードの幅を十分に確保
- テキストが横に表示されるように改善

### 4.2 サマリーカードの幅バランス不均一

**問題:** 各カードのコンテンツ量により幅が不均一

**解決策:**
```tsx
<div className="grid grid-cols-2 gap-2 p-4 border-b ...">
  <div className="flex items-center gap-2 p-3 bg-... rounded min-h-[60px]">
    {/* 全タスク */}
  </div>
  <div className="flex items-center gap-2 p-3 bg-... rounded min-h-[60px]">
    {/* 未着手 */}
  </div>
  {/* ... */}
</div>
```

- `min-h-[60px]` で統一した高さ
- `p-3` で余裕あるパディング

### 4.3 スクロールバーの位置修正

**問題:** スクロールバーがコンテンツと重なっている

**変更前:**
```tsx
<div className="flex-1 overflow-y-auto p-4 space-y-4">
```

**変更後:**
```tsx
<div className="flex-1 overflow-y-auto p-4 pr-2 space-y-4">
```

- `pr-2` を追加してスクロールバー用のスペース確保

### 4.4 「Blocked by」バッジの視認性改善

**変更ファイル:** `frontend/src/components/tasks/ExpandedTaskCard.tsx`

**変更前:** (line 198-203)
```tsx
{task.blockedCount > 0 && (
  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
    <Lock className="w-3 h-3" />
    Blocked by {task.blockedCount}
  </span>
)}
```

**変更後:**
```tsx
{task.blockedCount > 0 && (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
    <Lock className="w-3 h-3" />
    Blocked by {task.blockedCount}
  </span>
)}
```

- バッジスタイルを追加して視認性を向上

---

## 5. 期待される結果

### Inbox メッセージ
- アバターとの間隔が狭くなる
- 横幅が固定され、レイアウトが安定する
- 長いコードブロックは横スクロール可能

### タスク監視パネル
- 各統計アイコンにホバーすると、ステータスの意味が表示される
- StatusBadge と統一されたツールチップデザイン
- サマリーカードのテキストが横方向に表示される
- スクロールバーがコンテンツと重ならない
- 「Blocked by」バッジが見やすくなる
