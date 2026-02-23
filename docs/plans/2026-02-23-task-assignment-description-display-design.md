# タスク割り当てメッセージの description 表示修正

## 概要

メッセージバブルで `task_assignment` タイプのメッセージにおいて、現状 `subject` のみ表示され、`description` の内容が表示されていない問題を修正する。

## 問題分析

### 現状

`ChatMessageBubble.tsx` の `getMessageDisplayText` 関数は、`task_assignment` メッセージに対して以下を返している:

```tsx
{
  summary: data.subject || 'タスク割り当て',
  detail: data.description || undefined,
}
```

しかし、レンダリング部分では `summary` のみを使用:

```tsx
const { summary: messageSummary } = getMessageDisplayText(message);
const messageText = messageSummary;
```

`detail` は取得しているが、**表示していない**。

## 設計

### 方針

**サマリーの下に常時表示**

- subject の下に description を表示
- プレーンテキストまたは Markdown としてレンダリング
- 視覚的に区別できるスタイルを適用

### 変更内容

#### `ChatMessageBubble.tsx`

1. **777-778行目**: `detail` も取得するように変更

   ```tsx
   // 修正前
   const { summary: messageSummary } = getMessageDisplayText(message);
   const messageText = messageSummary;

   // 修正後
   const { summary: messageSummary, detail: messageDetail } = getMessageDisplayText(message);
   const messageText = messageSummary;
   ```

2. **888-905行目**: メッセージバブル内で `detail` を表示

   ```tsx
   {/* summary */}
   <p className="whitespace-pre-wrap">{messageText}</p>

   {/* detail（description）がある場合は表示 */}
   {messageDetail && (
     <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap border-t border-slate-200 dark:border-slate-700 pt-2">
       {messageDetail}
     </p>
   )}
   ```

### 影響範囲

- `task_assignment` タイプのメッセージ
- その他 `detail` を返すメッセージタイプ（`shutdown_request`, `plan_approval_request` など）も同様に表示されるようになる

## テスト項目

1. `task_assignment` メッセージで subject と description の両方が表示されること
2. description がない場合は subject のみ表示されること
3. ダークモードで適切に表示されること

## 作成日

2026-02-23
