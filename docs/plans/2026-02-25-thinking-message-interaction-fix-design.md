# 思考型メッセージ操作改善設計書

作成日: 2026-02-25

## 概要

タイムラインのメッセージバブルにおける AI Assistant 思考型メッセージの操作不具合を修正する設計書。

## 問題点

1. **イベントバブリング問題**: 「思考プロセス」トグルをクリックすると、メッセージ詳細パネルが表示されてしまう
2. **詳細ボタンの不在**: 思考型メッセージに専用の「詳細表示」ボタンがない
3. **タイプ表示の不備**: 思考型メッセージの詳細パネルでタイプが「❓ 不明」と表示される

## 対象範囲

「思考型メッセージ」の定義:
- `parsedType === 'thinking'` のメッセージ
- `parsedType === 'assistant_message'` かつ `details.thinking` を持つメッセージ

## 設計詳細

### 1. 思考型メッセージ判定ロジック

**ファイル**: `frontend/src/components/chat/ChatMessageBubble.tsx`

```typescript
/**
 * 思考型メッセージかどうかを判定するヘルパー関数。
 *
 * thinking タイプ、または assistant_message で details.thinking を持つメッセージを思考型とみなす。
 */
const isThinkingMessage = (message: TimelineMessage): boolean => {
  if (!isUnifiedTimelineEntry(message) || message.source !== 'session') {
    return false;
  }
  if (message.parsedType === 'thinking') {
    return true;
  }
  if (message.parsedType === 'assistant_message' && message.details?.thinking) {
    return true;
  }
  return false;
};
```

### 2. イベント伝播の制御

**ファイル**: `frontend/src/components/chat/ChatMessageBubble.tsx`

**SessionDetails コンポーネント**:
- `<details>` と `<summary>` に `onClick={(e) => e.stopPropagation()}` を追加
- 親要素のクリックイベントへの伝播を防止

### 3. 思考型メッセージのクリック動作制御

**ファイル**: `frontend/src/components/chat/ChatMessageBubble.tsx`

**変更内容**:
- 思考型メッセージの場合: `<article>` のクリックハンドラを無効化
- 思考型以外のメッセージ: 現状通り `<article>` 全体クリックで詳細パネルを開く

```typescript
const handleClick = useCallback(() => {
  // 思考型メッセージの場合はクリックを無視
  if (isThinkingMessage(message)) {
    return;
  }
  onClick?.(message);
}, [message, onClick]);
```

### 4. 詳細表示ボタンの追加

**ファイル**: `frontend/src/components/chat/ChatMessageBubble.tsx`

**DetailButton コンポーネント**:

```typescript
import { Info } from 'lucide-react';

interface DetailButtonProps {
  onClick: () => void;
}

const DetailButton: React.FC<DetailButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-1 text-xs',
      'text-slate-600 dark:text-slate-400',
      'hover:text-blue-600 dark:hover:text-blue-400',
      'hover:bg-slate-100 dark:hover:bg-slate-800',
      'rounded transition-colors'
    )}
    aria-label="メッセージ詳細を表示"
  >
    <Info className="w-3 h-3" />
    <span>詳細</span>
  </button>
);
```

**配置場所**: メッセージバブル内の右下（SessionDetails の下）

### 5. MessageDetailPanel のタイプ表示修正

**ファイル**: `frontend/src/components/chat/MessageDetailPanel.tsx`

**getMessageTypeIcon 関数 (22-34行目)**:

```typescript
const getMessageTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    message: '💬',
    idle_notification: '💤',
    shutdown_request: '🛑',
    shutdown_response: '✅',
    plan_approval_request: '📋',
    plan_approval_response: '✅',
    task_assignment: '📝',
    shutdown_approved: '✅',
    // session 由来のタイプを追加
    user_message: '👤',
    assistant_message: '🤖',
    thinking: '💭',
  };
  return icons[type] || '❓';
};
```

**getMessageTypeName 関数 (39-51行目)**:

```typescript
const getMessageTypeName = (type: string): string => {
  const names: Record<string, string> = {
    message: 'メッセージ',
    idle_notification: 'アイドル通知',
    shutdown_request: 'シャットダウン要求',
    shutdown_response: 'シャットダウン応答',
    plan_approval_request: 'プラン承認要求',
    plan_approval_response: 'プラン承認応答',
    task_assignment: 'タスク割り当て',
    shutdown_approved: 'シャットダウン了承',
    // session 由来のタイプを追加
    user_message: 'ユーザーメッセージ',
    assistant_message: 'AIアシスタント応答',
    thinking: '思考プロセス',
  };
  return names[type] || '不明';
};
```

### 6. props 型の拡張

**ファイル**: `frontend/src/components/chat/MessageDetailPanel.tsx`

```typescript
import type { ParsedMessage, UnifiedTimelineEntry } from '@/types/message';

type TimelineMessage = ParsedMessage | UnifiedTimelineEntry;

export interface MessageDetailPanelProps {
  message: TimelineMessage | null;
  isOpen: boolean;
  onClose: () => void;
}
```

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/chat/ChatMessageBubble.tsx` | isThinkingMessage 追加、SessionDetails に stopPropagation 追加、DetailButton 追加、クリックハンドラ条件分岐 |
| `frontend/src/components/chat/MessageDetailPanel.tsx` | タイプマッピング追加、props 型拡張 |

## UI レイアウト

```
┌──────────────────────────────────┐
│ 🤖 AI Assistant    💭 12:34:56   │
├──────────────────────────────────┤
│ 思考中...                         │
│                                  │
│ ┌────────────────────────────┐   │
│ │ 💭 思考プロセス        ▶  │   │  ← トグル（開閉のみ）
│ └────────────────────────────┘   │
│                                  │
│                    [ℹ 詳細]      │  ← 詳細ボタン
└──────────────────────────────────┘
```

## テスト項目

1. 思考型メッセージのトグルをクリック → メッセージ詳細パネルが開かない
2. 思考型メッセージのトグル → 思考プロセスが展開/折りたたみできる
3. 思考型メッセージの「詳細」ボタンクリック → メッセージ詳細パネルが開く
4. 思考型以外のメッセージクリック → メッセージ詳細パネルが開く（現状通り）
5. 思考型メッセージの詳細パネル → タイプが「💭 思考プロセス」と表示される
