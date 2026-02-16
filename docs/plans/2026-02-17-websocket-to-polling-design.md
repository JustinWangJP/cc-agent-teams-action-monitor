# WebSocket → HTTP Polling 移行設計書

## 1. 概要

### 1.1 目的

現在のWebSocket通信をHTTP Polling（React Query）に完全移行し、シンプルで保守性の高いリアルタイムデータ取得を実現する。

### 1.2 変更理由

- 通信方式の統一（HTTP のみ）
- 保守性の向上（WebSocket接続管理の削除）
- 設定可能なポーリング間隔による柔軟性

---

## 2. アーキテクチャ変更

### 2.1 Before（WebSocket + Polling ハイブリッド）

```
Frontend                          Backend
├── useTeams (10s poll)    ──────► /api/teams
├── useTasks (10s poll)    ──────► /api/tasks
└── useWebSocket (realtime) ──────► /ws/dashboard
                                       │
                                       ▼
                                 FileWatcher
                                       │
                                       ▼
                                 WebSocket Broadcast
```

### 2.2 After（React Query + HTTP Polling Only）

```
Frontend                          Backend
├── useTeams (RQ Query)    ──────► /api/teams
├── useTasks (RQ Query)    ──────► /api/tasks
├── useInbox (RQ Query)    ──────► /api/teams/{name}/inboxes
└── useAgentMessages (RQ)  ──────► /api/teams/{name}/inboxes/{agent}

Polling Interval: Zustand Store で管理（5s/10s/20s/30s/60s）
```

---

## 3. ポーリング設定

### 3.1 データ種別とAPI

| データ種別 | API エンドポイント | Zustand キー | デフォルト |
|-----------|------------------|-------------|-----------|
| チーム一覧 | `GET /api/teams` | `teamsInterval` | 30秒 |
| タスク一覧 | `GET /api/tasks` | `tasksInterval` | 30秒 |
| チーム全体インボックス | `GET /api/teams/{name}/inboxes` | `inboxInterval` | 30秒 |
| エージェント別メッセージ | `GET /api/teams/{name}/inboxes/{agent}` | `messagesInterval` | 30秒 |

### 3.2 選択可能な間隔

```typescript
const INTERVAL_OPTIONS = [
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 20000, label: '20秒' },
  { value: 30000, label: '30秒' },  // デフォルト
  { value: 60000, label: '60秒' },
];
```

---

## 4. React Query 設定

### 4.1 QueryClient 設定

```typescript
// lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                        // 即座にステール
      gcTime: 5 * 60 * 1000,               // 5分
      refetchOnWindowFocus: false,         // 無効
      refetchOnReconnect: true,            // 有効
      retry: 2,                            // 2回リトライ
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### 4.2 フック実装パターン

```typescript
// hooks/useTeams.ts

import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';

export function useTeams() {
  const teamsInterval = useDashboardStore((state) => state.teamsInterval);

  const { data: teams = [], isLoading, error, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      return response.json();
    },
    refetchInterval: teamsInterval,
  });

  return { teams, loading: isLoading, error: error?.message || null, refetch };
}
```

---

## 5. Zustand Store 更新

### 5.1 ポーリング間隔追加

```typescript
// stores/dashboardStore.ts

interface DashboardState {
  // 既存
  currentView: 'overview' | 'timeline' | 'tasks' | 'graphs' | 'network';
  selectedTask: TaskSummary | null;

  // 新規: ポーリング間隔
  teamsInterval: number;
  tasksInterval: number;
  inboxInterval: number;
  messagesInterval: number;

  // 新規: セッター
  setTeamsInterval: (ms: number) => void;
  setTasksInterval: (ms: number) => void;
  setInboxInterval: (ms: number) => void;
  setMessagesInterval: (ms: number) => void;
}

const DEFAULT_INTERVAL = 30000; // 30秒
```

---

## 6. 新規コンポーネント

### 6.1 PollingIntervalSelector

```typescript
// components/common/PollingIntervalSelector.tsx

interface PollingIntervalSelectorProps {
  value: number;           // 現在の間隔（ミリ秒）
  onChange: (ms: number) => void;
  label?: string;          // ラベル
}
```

**配置場所:** 各パネル（Overview/Tasks/Timeline）のヘッダー

```
┌─────────────────────────────────────────────────────────────┐
│  📋 Tasks                              [更新間隔: 30秒 ▼]   │
├─────────────────────────────────────────────────────────────┤
```

---

## 7. バックエンド変更

### 7.1 新規API: エージェント別メッセージ

```python
# backend/app/api/routes/teams.py

@router.get("/{team_name}/inboxes/{agent_name}")
async def get_agent_inbox(team_name: str, agent_name: str):
    """特定エージェントのインボックスメッセージを取得"""
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    inbox_path = team_dir / "inboxes" / f"{agent_name}.json"
    if not inbox_path.exists():
        raise HTTPException(status_code=404, detail="Agent inbox not found")

    with open(inbox_path, "r", encoding="utf-8") as f:
        return json.load(f)
```

### 7.2 FileWatcherService 変更

WebSocketブロードキャストを削除し、ログ出力のみに変更。

```python
# backend/app/services/file_watcher.py

async def _handle_file_change(self, path: str, event_type: str):
    """ファイル変更を処理（ログ出力のみ）"""
    # WebSocket ブロードキャストを削除
    # logger.info() のみ残す
```

### 7.3 削除: WebSocketルーター

```python
# backend/app/main.py
# WebSocketルーターを削除
```

---

## 8. ファイル変更一覧

### 8.1 新規作成

| ファイル | 説明 |
|---------|------|
| `frontend/src/lib/queryClient.ts` | React Query 設定 |
| `frontend/src/hooks/useInbox.ts` | インボックス取得フック |
| `frontend/src/hooks/useAgentMessages.ts` | エージェント別メッセージフック |
| `frontend/src/components/common/PollingIntervalSelector.tsx` | 間隔選択コンポーネント |

### 8.2 変更

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/main.tsx` | QueryClientProvider 追加 |
| `frontend/src/App.tsx` | useWebSocket 削除 |
| `frontend/src/hooks/useTeams.ts` | React Query 化 |
| `frontend/src/hooks/useTasks.ts` | React Query 化 |
| `frontend/src/stores/dashboardStore.ts` | ポーリング間隔追加 |
| `frontend/src/components/layout/Header.tsx` | 接続状態表示削除 |
| `backend/app/api/routes/teams.py` | エージェント別API追加 |
| `backend/app/main.py` | WebSocketルーター削除 |
| `backend/app/services/file_watcher.py` | ログ出力のみに変更 |

### 8.3 削除

| ファイル |
|---------|
| `frontend/src/hooks/useWebSocket.ts` |
| `frontend/src/hooks/__tests__/useWebSocket.test.tsx` |
| `backend/tests/test_websocket.py` |

---

## 9. 依存関係

### 9.1 追加パッケージ

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x"
  },
  "devDependencies": {
    "@tanstack/eslint-plugin-query": "^5.x"
  }
}
```

---

## 10. テスト計画

### 10.1 ユニットテスト

- `useTeams` フックのポーリング動作確認
- `useTasks` フックのポーリング動作確認
- `PollingIntervalSelector` コンポーネント
- Zustand ストアのポーリング間隔設定

### 10.2 統合テスト

- ポーリング間隔変更時の再取得確認
- React Query キャッシュ動作確認
- エラー時のリトライ動作確認

### 10.3 E2Eテスト

- 各パネルでのポーリング間隔変更
- データ自動更新の確認

---

## 11. 移行ステップ

1. **Phase 1: React Query セットアップ**
   - `@tanstack/react-query` インストール
   - `queryClient.ts` 作成
   - `main.tsx` に Provider 設定

2. **Phase 2: フック移行**
   - `useTeams.ts` React Query 化
   - `useTasks.ts` React Query 化
   - `useInbox.ts` 新規作成
   - `useAgentMessages.ts` 新規作成

3. **Phase 3: UI変更**
   - `PollingIntervalSelector` 作成
   - 各パネルに配置
   - Header から接続状態削除

4. **Phase 4: バックエンド変更**
   - エージェント別API追加
   - WebSocketルーター削除
   - FileWatcher 変更

5. **Phase 5: クリーンアップ**
   - useWebSocket 削除
   - テストファイル削除
   - ドキュメント更新

---

*作成日: 2026-02-17*
*バージョン: 1.0.0*
