# タイムライン機能修正設計書

## 1. 概要

### 1.1 目的

WebSocket → HTTP Polling 移行時に未実装だったタイムライン機能を修正し、React Query によるポーリングとポーリング間隔設定UIを実装する。

### 1.2 発見された問題

| # | 問題 | 影響 |
|---|------|------|
| 1 | TimelinePanel が React Query を使用していない | 自動ポーリングなし |
| 2 | Timeline ビューに PollingIntervalSelector がない | ユーザーが間隔を変更できない |
| 3 | useInbox の戻り値型が間違っている | `Record<string, InboxMessage[]>` を `InboxMessage[]` として処理 |
| 4 | Network ビューに PollingIntervalSelector がない | ユーザーが間隔を変更できない |

---

## 2. 修正範囲

### 2.1 変更対象ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/timeline/TimelinePanel.tsx` | React Query の `useQuery` を使用、PollingIntervalSelector 追加 |
| `frontend/src/hooks/useInbox.ts` | 戻り値型を修正 `Record<string, InboxMessage[]>` |
| `frontend/src/App.tsx` | Timeline/Network ビューに PollingIntervalSelector 追加 |

### 2.2 変更しないファイル

- `useAgentMessages.ts` - そのまま（エージェント別取得用）
- バックエンド - 変更なし

---

## 3. TimelinePanel の React Query 化

### 3.1 Before（現在）

```typescript
// 手動 fetch + useState
const [data, setData] = useState<TimelineDataType | null>(null);
const [isLoading, setIsLoading] = useState(true);

const fetchTimelineData = useCallback(async () => {
  setIsLoading(true);
  const response = await fetch(`${apiBaseUrl}/teams/${teamName}/messages/timeline`);
  const result = await response.json();
  setData(result);
  setIsLoading(false);
}, [teamName, ...]);

useEffect(() => {
  fetchTimelineData(true);
}, [teamName]);
```

### 3.2 After（React Query）

```typescript
import { useQuery } from '@tanstack/react-query';

// Zustand からポーリング間隔を取得
const inboxInterval = useDashboardStore((state) => state.inboxInterval);
const setInboxInterval = useDashboardStore((state) => state.setInboxInterval);

// React Query でデータ取得
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['timeline', teamName, timeRange, messageFilter, searchQuery],
  queryFn: async () => {
    const params = new URLSearchParams();
    // フィルターパラメータ構築...
    const response = await fetch(`/api/teams/${teamName}/messages/timeline?${params}`);
    if (!response.ok) throw new Error('Failed to fetch timeline');
    return response.json() as Promise<TimelineDataType>;
  },
  refetchInterval: inboxInterval,
  enabled: !!teamName,
  staleTime: 0,
});
```

### 3.3 PollingIntervalSelector の配置

```typescript
// ヘッダー部分に追加
<div className="flex items-center justify-between mb-4">
  <h2>💬 メッセージタイムライン</h2>
  <div className="flex items-center gap-4">
    <PollingIntervalSelector
      value={inboxInterval}
      onChange={setInboxInterval}
      label="更新間隔"
    />
    <button onClick={() => refetch()}>更新</button>
  </div>
</div>
```

---

## 4. useInbox.ts の型修正

### 4.1 新しい型定義

```typescript
/**
 * チーム全体のインボックス（エージェント別）。
 */
export interface TeamInbox {
  [agentName: string]: InboxMessage[];
}
```

### 4.2 Before（現在）

```typescript
// 誤った型
const { data: messages = [], ... } = useQuery({
  queryFn: async () => {
    const response = await fetch(`/api/teams/${teamName}/inboxes`);
    return response.json() as Promise<InboxMessage[]>;  // 誤り
  },
});

return { messages, ... };  // InboxMessage[] として返す
```

### 4.3 After（修正）

```typescript
// 正しい型
import { useMemo } from 'react';

const { data: inbox = {}, ... } = useQuery({
  queryFn: async () => {
    const response = await fetch(`/api/teams/${teamName}/inboxes`);
    return response.json() as Promise<TeamInbox>;  // 正しい型
  },
});

// 便宜上、全メッセージのフラット配列も提供
const allMessages = useMemo(() => {
  return Object.values(inbox).flat();
}, [inbox]);

return {
  inbox,              // TeamInbox (Record<string, InboxMessage[]>)
  messages: allMessages,  // InboxMessage[] (フラット)
  loading: isLoading,
  error: error?.message || null,
  refetch,
};
```

### 4.4 API レスポンス形式

```json
{
  "agent-1": [
    { "from": "team-lead", "text": "...", "timestamp": "..." },
    { "from": "agent-2", "text": "...", "timestamp": "..." }
  ],
  "agent-2": [
    { "from": "agent-1", "text": "...", "timestamp": "..." }
  ]
}
```

---

## 5. App.tsx の変更

### 5.1 Timeline ビューへの PollingIntervalSelector 追加

```typescript
{currentView === 'timeline' && (
  <div className="...">
    {/* チームセレクター */}
    <div className="mb-4 flex items-center gap-4">
      <label>チームを選択:</label>
      <select ...>...</select>
    </div>

    {/* 追加: ポーリング間隔セレクター */}
    <div className="mb-4 flex items-center justify-between">
      <span className="text-sm text-gray-500">
        {selectedTeam ? `チーム: ${selectedTeam}` : ''}
      </span>
      <PollingIntervalSelector
        value={inboxInterval}
        onChange={setInboxInterval}
        label="更新間隔"
      />
    </div>

    <TimelinePanel teamName={selectedTeam} />
  </div>
)}
```

### 5.2 Network ビューへの PollingIntervalSelector 追加

```typescript
{currentView === 'network' && (
  <div className="...">
    {/* チームセレクター */}
    <div className="mb-4 flex items-center gap-4">
      <label>チームを選択:</label>
      <select ...>...</select>

      {/* 追加: ポーリング間隔セレクター */}
      <PollingIntervalSelector
        value={inboxInterval}
        onChange={setInboxInterval}
        label="更新間隔"
      />
    </div>

    <AgentNetworkGraph teamName={selectedTeam} ... />
  </div>
)}
```

---

## 6. 依存関係

### 6.1 既存リソース

- `@tanstack/react-query` - インストール済み
- `PollingIntervalSelector.tsx` - 作成済み
- `useDashboardStore` の `inboxInterval` / `setInboxInterval` - 設定済み

### 6.2 新規追加

なし（既存リソースを使用）

---

## 7. テスト計画

### 7.1 確認項目

1. **ビルド成功**
   ```bash
   cd frontend && npm run build
   ```

2. **型チェック成功**
   ```bash
   cd frontend && npx tsc --noEmit
   ```

3. **テスト実行**
   ```bash
   cd frontend && npm test
   ```

### 7.2 動作確認

1. Timeline ビューでポーリング間隔を変更できる
2. Network ビューでポーリング間隔を変更できる
3. データが指定間隔で自動更新される

---

## 8. 実装タスク

1. `useInbox.ts` の型修正
2. `TimelinePanel.tsx` の React Query 化
3. `App.tsx` に PollingIntervalSelector 追加
4. ビルド・テスト確認

---

*作成日: 2026-02-17*
*バージョン: 1.0.0*
