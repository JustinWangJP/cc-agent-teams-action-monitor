# Agent Teams Dashboard 機能拡張設計書

## 1. 概要

### 1.1 目的

Claude Code Agent Teams Dashboard に以下の機能を統合し、チーム活動の可視性を向上させる：

- **セッションログ統合**: `projects/{hash}/{sessionId}.jsonl` をタイムラインに統合
- **エージェント状態詳細化**: リアルタイム状態追跡・プログレス表示
- **タスク管理強化**: 進捗トラッキング・ファイル紐付け
- **ファイル変更監視**: プロジェクトファイルのリアルタイム監視

### 1.2 参照リソース

- [技術ブログ](https://zenn.dev/acntechjp/articles/b89a0445ec7d49)
- [ターミナル版ダッシュボード](https://github.com/sinjorjob/claude-code-agent-teams-dashboard)

---

## 2. データソース分析

### 2.1 Claude Code ディレクトリ構造

```
~/.claude/
├── teams/{team-name}/
│   ├── config.json          # チーム構成、leadSessionId、members[].cwd
│   └── inboxes/
│       └── {agent}.json     # エージェント間メッセージ
├── tasks/{team-name}/
│   ├── 1.json               # タスク定義
│   └── ...
└── projects/{project-hash}/
    └── {session-id}.jsonl   # セッションログ（JSONL形式）
```

### 2.2 project-hash と leadSessionId の関係

**重要**: `project-hash` はチームの `cwd`（作業ディレクトリ）から生成されます。

```python
# 変換ルール
cwd = "/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor"
project_hash = "-" + cwd.lstrip("/").replace("/", "-")
# → "-Users-aegeanwang-Coding-workspaces-python-working-cc-agent-teams-action-monitor"
```

**セッションファイル特定フロー**:
```
1. config.json から leadSessionId と cwd を取得
2. cwd → project-hash に変換
3. ~/.claude/projects/{project-hash}/{leadSessionId}.jsonl を直接特定
```

| config.json フィールド | 例 |
|----------------------|-----|
| `leadSessionId` | `117efa76-5ffd-495c-aad1-e11d0b309ccb` |
| `members[0].cwd` | `/Users/aegeanwang/.../cc-agent-teams-action-monitor` |
| `project-hash` | `-Users-aegeanwang-...-cc-agent-teams-action-monitor` |
| セッションファイル | `{project-hash}/{leadSessionId}.jsonl` |

### 2.2 データ活用状況

| データソース | 現在の活用 | 未活用データ |
|-------------|-----------|-------------|
| `config.json` | チーム構成表示 | leadSessionId |
| `inboxes/*.json` | タイムライン表示 | 構造化メッセージ詳細 |
| `tasks/*.json` | タスク一覧・グラフ | activeForm, blocks詳細 |
| `projects/**/*.jsonl` | **未活用** | user/assistant/thinking/file-history |

### 2.3 セッションログのエントリタイプ

| タイプ | 件数例 | 説明 |
|--------|--------|------|
| `user` | 42 | ユーザーメッセージ |
| `assistant` | 82 | AI応答（内訳: text/thinking/tool_use） |
| `file-history-snapshot` | 16 | ファイル変更履歴 |
| `system` | 5 | システムイベント |
| `progress` | 9 | 進捗イベント |

---

## 3. 機能一覧

### 3.1 優先度マトリックス

| 優先度 | 機能 | 説明 | 工数 |
|--------|------|------|------|
| **P0** | セッションログ統合 | .jsonl をタイムラインに統合 | 中 |
| **P1** | エージェント状態詳細化 | 状態追跡・プログレス表示 | 中 |
| **P1** | 構造化メッセージ解析強化 | タイプ別アイコン・色分け | 小 |
| **P1** | タスク管理強化 | 進捗トラッキング | 中 |
| **P2** | ファイル変更監視パネル | リアルタイムファイル監視 | 中 |
| **P3** | セッション履歴ブラウザ | 過去セッション参照 | 大 |

---

## 4. アーキテクチャ

### 4.1 概要図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Timeline    │ │ Agent Status│ │ Task Panel  │ │ File Changes    │   │
│  │ (Enhanced)  │ │ (Enhanced)  │ │ (Enhanced)  │ │ Panel           │   │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └────────┬────────┘   │
└─────────┼───────────────┼───────────────┼─────────────────┼────────────┘
          │ HTTP Polling  │               │                 │
          ▼               ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                                   │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      TimelineService (新規)                         │ │
│  │  • ~/.claude/teams/*/inboxes/     (既存: inbox メッセージ)          │ │
│  │  • ~/.claude/tasks/*/             (既存: タスク定義)                 │ │
│  │  • ~/.claude/projects/**/*.jsonl  (新規: セッションログ)             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐ │
│  │ /api/timeline    │ │ /api/agents      │ │ /api/tasks               │ │
│  │ /history         │ │ /status          │ │ /progress                │ │
│  │ /updates         │ │                  │ │                          │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 通信方式

- **HTTPポーリング**（WebSocket不使用）
- デフォルト間隔: 30000ms（既存の `INTERVAL_OPTIONS` に準拠）
- 選択可能な間隔: 5秒、10秒、20秒、30秒、60秒、2分、5分
- 実装方式: React Query `refetchInterval` + `PollingIntervalSelector` コンポーネント
- 差分取得: `since` パラメータで前回以降の更新のみ取得

> **注**: 既存の `frontend/src/components/common/pollingConstants.ts` と `PollingIntervalSelector.tsx` を再利用し、設計の一貫性を保つ。

---

## 5. データモデル

### 5.1 統合タイムラインエントリ（ChatTimelinePanel パターン）

> **注**: 既存の `ChatTimelinePanel.tsx` / `ChatMessageList.tsx` のパターンに従い、`ParsedMessage` 型を拡張して session 由来のエントリを追加する。

```typescript
// frontend/src/types/message.ts（既存への追加）

// 既存: ParsedMessage を拡張
type TimelineSource = 'inbox' | 'session';

// 既存の parsedType に追加
type ExtendedParsedType =
  // 既存の inbox 由来
  | 'message'
  | 'idle_notification'
  | 'shutdown_request'
  | 'shutdown_response'
  | 'plan_approval_request'
  | 'plan_approval_response'
  | 'task_assignment'
  | 'task_completed'  // 新規追加
  // session 由来（新規追加）
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'tool_use'
  | 'file_change';

// 統合タイムラインエントリ
interface UnifiedTimelineEntry {
  id: string;
  content: string;
  from: string;
  to?: string;
  timestamp: string;
  color?: string;
  read?: boolean;
  summary?: string;

  // 拡張フィールド
  source: TimelineSource;
  parsedType: ExtendedParsedType;
  parsedData?: any;

  // session 由来の詳細情報
  details?: {
    thinking?: string;
    files?: FileChangeInfo[];
    taskId?: string;
    taskSubject?: string;
    toolName?: string;
    toolInput?: any;
  };
}

interface FileChangeInfo {
  path: string;
  operation: 'created' | 'modified' | 'deleted' | 'read';
  version?: number;
}

// API レスポンス形式
interface UnifiedTimelineResponse {
  items: UnifiedTimelineEntry[];
  lastTimestamp: string;
}
```

### 5.2 エントリタイプ設定（既存パターンの拡張）

> **注**: 既存の `ChatMessageBubble.tsx` のパターンに従い、タイプ別のアイコン・色を定義する。

```typescript
// frontend/src/types/message.ts または constants.ts

// メッセージタイプ別の設定
const MESSAGE_TYPE_CONFIG: Record<ExtendedParsedType, { icon: string; color: string; label: string }> = {
  // inbox 由来
  message:              { icon: '💬', color: '#6b7280', label: 'メッセージ' },
  task_assignment:      { icon: '📋', color: '#3b82f6', label: 'タスク割り当て' },
  task_completed:       { icon: '✅', color: '#10b981', label: 'タスク完了' },
  idle_notification:    { icon: '💤', color: '#f59e0b', label: 'アイドル通知' },
  shutdown_request:     { icon: '🔌', color: '#ef4444', label: 'シャットダウン要求' },
  shutdown_response:    { icon: '✓', color: '#22c55e', label: 'シャットダウン応答' },
  plan_approval_request: { icon: '📝', color: '#8b5cf6', label: 'プラン承認要求' },
  plan_approval_response: { icon: '✅', color: '#22c55e', label: 'プラン承認応答' },
  // session 由来
  user_message:         { icon: '👤', color: '#3b82f6', label: 'ユーザーメッセージ' },
  assistant_message:    { icon: '🤖', color: '#8b5cf6', label: 'AI応答' },
  thinking:             { icon: '💭', color: '#9ca3af', label: '思考' },
  tool_use:             { icon: '🔧', color: '#06b6d4', label: 'ツール使用' },
  file_change:          { icon: '📁', color: '#06b6d4', label: 'ファイル変更' },
};

// ヘルパー関数
function getMessageTypeConfig(type: ExtendedParsedType) {
  return MESSAGE_TYPE_CONFIG[type] || { icon: '❓', color: '#6b7280', label: '不明' };
}
```

### 5.3 拡張エージェント状態

```typescript
// frontend/src/types/agent.ts (拡張)

interface AgentStatus {
  agentId: string;
  name: string;

  // 状態
  status: 'idle' | 'active' | 'working' | 'completed' | 'error';
  progress: number;  // 0-100

  // 詳細情報
  model: string;
  color: string;
  lastActivityAt: string;

  // タスク情報
  currentTaskId: string | null;
  currentTaskSubject: string | null;
  assignedTasks: string[];
  completedTasks: string[];

  // ファイル情報
  touchedFiles: string[];
}
```

---

## 6. バックエンドAPI設計

### 6.1 統合タイムラインAPI

> **注**: レスポンス形式は `ChatTimelinePanel` のパターンに従い、`items` 配列 + `lastTimestamp` の形式とする。

```python
# backend/app/api/routes/timeline.py

from fastapi import APIRouter, Query
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

# レスポンスモデル
class UnifiedTimelineEntry(BaseModel):
    id: str
    content: str
    from_: str  # Pythonの予約語回避
    to: Optional[str] = None
    timestamp: str
    color: Optional[str] = None
    read: bool = True
    summary: Optional[str] = None
    source: str  # 'inbox' | 'session'
    parsed_type: str
    parsed_data: Optional[dict] = None
    details: Optional[dict] = None

class UnifiedTimelineResponse(BaseModel):
    items: list[UnifiedTimelineEntry]
    last_timestamp: str

@router.get("/{team_name}/history", response_model=UnifiedTimelineResponse)
async def get_timeline_history(
    team_name: str,
    limit: int = Query(100, ge=1, le=500),
    types: Optional[str] = Query(None, description="カンマ区切りでタイプ指定")
):
    """
    統合タイムライン履歴を取得（初期表示用）

    inbox メッセージ + セッションログ を統合して返す
    ChatTimelinePanel パターンに準拠したレスポンス形式
    """
    pass


@router.get("/{team_name}/updates", response_model=UnifiedTimelineResponse)
async def get_timeline_updates(
    team_name: str,
    since: Optional[str] = Query(None, description="このタイムスタンプ以降のエントリ"),
    limit: int = Query(50, ge=1, le=200)
):
    """
    差分更新用エンドポイント（ポーリング用）

    since 以降の新規エントリのみ返す
    """
    pass
```

### 6.2 レスポンス例

```json
{
  "items": [
    {
      "id": "inbox-2026-02-21T14:32:05Z-team-lead",
      "content": "タスク #6 を開始してください",
      "from_": "team-lead",
      "to": "backend-developer",
      "timestamp": "2026-02-21T14:32:05Z",
      "color": "#3b82f6",
      "read": true,
      "summary": "タスク割り当て",
      "source": "inbox",
      "parsed_type": "task_assignment",
      "parsed_data": {
        "type": "task_assignment",
        "taskId": "6",
        "subject": "差分更新API追加"
      }
    },
    {
      "id": "session-2026-02-21T14:32:10Z-team-lead",
      "content": "バックエンドAPIを確認中...",
      "from_": "team-lead",
      "timestamp": "2026-02-21T14:32:10Z",
      "source": "session",
      "parsed_type": "thinking",
      "details": {
        "thinking": "まず、messages.py の現在の実装を確認します...",
        "files": [
          { "path": "backend/app/api/routes/messages.py", "operation": "read" }
        ]
      }
    }
  ],
  "last_timestamp": "2026-02-21T14:33:00Z"
}
```

### 6.3 TimelineService

```python
# backend/app/services/timeline_service.py

from pathlib import Path
from typing import Optional
import json
import orjson

class TimelineService:
    """統合タイムラインサービス"""

    def __init__(self, claude_dir: Path = None):
        self.claude_dir = claude_dir or Path.home() / ".claude"
        self._session_cache: dict = {}  # 読み込み位置キャッシュ

    def _cwd_to_project_hash(self, cwd: str) -> str:
        """
        cwd から project-hash を生成

        例:
          cwd = "/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor"
          → "-Users-aegeanwang-Coding-workspaces-python-working-cc-agent-teams-action-monitor"
        """
        return "-" + cwd.lstrip("/").replace("/", "-")

    def _find_session_file(self, team_name: str) -> Optional[Path]:
        """
        チームのリードセッションファイルを特定

        フロー:
          1. config.json から leadSessionId と cwd を取得
          2. cwd → project-hash に変換
          3. ~/.claude/projects/{project-hash}/{leadSessionId}.jsonl を返す

        Args:
            team_name: チーム名

        Returns:
            セッションファイルのパス（存在しない場合は None）
        """
        config_path = self.claude_dir / "teams" / team_name / "config.json"

        if not config_path.exists():
            return None

        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

        lead_session_id = config.get("leadSessionId")
        members = config.get("members", [])

        if not lead_session_id or not members:
            return None

        # 最初のメンバーの cwd を使用（リードセッションの基準）
        cwd = members[0].get("cwd")
        if not cwd:
            return None

        # project-hash に変換
        project_hash = self._cwd_to_project_hash(cwd)

        # セッションファイルのパスを構築
        session_file = self.claude_dir / "projects" / project_hash / f"{lead_session_id}.jsonl"

        if session_file.exists():
            return session_file

        return None

    async def load_inbox_messages(self, team_name: str) -> list[dict]:
        """チームの全 inbox メッセージを読み込み"""
        inbox_dir = self.claude_dir / "teams" / team_name / "inboxes"
        messages = []

        if not inbox_dir.exists():
            return messages

        for inbox_file in inbox_dir.glob("*.json"):
            recipient = inbox_file.stem
            with open(inbox_file, "r", encoding="utf-8") as f:
                inbox_data = json.load(f)
                for msg in inbox_data.get("messages", []):
                    messages.append(self._map_inbox_message(msg, recipient))

        return messages

    async def load_session_entries(self, team_name: str) -> list[dict]:
        """チームのセッションログを読み込み（leadSessionId から特定）"""
        session_file = self._find_session_file(team_name)

        if not session_file:
            return []

        entries = []
        with open(session_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = orjson.loads(line)
                    mapped = self._map_session_entry(entry)
                    if mapped:
                        entries.append(mapped)
                except Exception:
                    continue  # パースエラーはスキップ

        return entries

    async def load_session_entries_since(
        self,
        team_name: str,
        since: Optional[str]
    ) -> list[dict]:
        """差分読み込み（前回位置から）"""
        # キャッシュから前回の読み込み位置を取得
        cache_key = f"session_{team_name}"
        cached_pos = self._session_cache.get(cache_key, 0)

        session_file = self._find_session_file(team_name)
        if not session_file:
            return []

        entries = []
        with open(session_file, "r", encoding="utf-8") as f:
            # 前回位置までスキップ
            for _ in range(cached_pos):
                next(f)

            # 新規エントリを読み込み
            line_num = cached_pos
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = orjson.loads(line)
                    mapped = self._map_session_entry(entry)
                    if mapped:
                        entries.append(mapped)
                    line_num += 1
                except Exception:
                    line_num += 1
                    continue

            # キャッシュを更新
            self._session_cache[cache_key] = line_num

        return entries

    def _map_inbox_message(self, msg: dict, recipient: str) -> dict:
        """inbox メッセージをタイムラインエントリ形式に変換"""
        # TODO: 実装（タスク #1 で対応）
        pass

    def _map_session_entry(self, entry: dict) -> Optional[dict]:
        """セッションログエントリをタイムライン形式に変換"""
        entry_type = entry.get("type")

        type_mapping = {
            "user": "user_message",
            "assistant": "assistant_message",
            "thinking": "thinking",
            "tool_use": "tool_use",
            "file_change": "file_change",
        }

        parsed_type = type_mapping.get(entry_type, "unknown")

        # TODO: 各タイプに応じた詳細情報の抽出（タスク #1 で対応）
        pass

    def _parse_structured_message(self, text: str) -> Optional[dict]:
        """構造化メッセージ（JSON-in-JSON）をパース"""
        # TODO: 実装（タスク #6 で対応）
        pass
```

---

## 7. フロントエンド設計

### 7.1 既存コンポーネントの再利用

既存の `ChatTimelinePanel` / `ChatMessageList` パターンに従い、設計の一貫性を保つ：

```typescript
// 既存: frontend/src/components/common/pollingConstants.ts
export const INTERVAL_OPTIONS: PollingIntervalOption[] = [
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 20000, label: '20秒' },
  { value: 30000, label: '30秒' },  // デフォルト
  { value: 60000, label: '60秒' },
  { value: 120000, label: '2分' },
  { value: 300000, label: '5分' },
];
```

### 7.2 ポーリングフック（React Queryパターン）

既存の `ChatTimelinePanel.tsx` のパターンに従い、React Query `useQuery` の `refetchInterval` を使用：

```typescript
// frontend/src/hooks/useUnifiedTimeline.ts

import { useQuery } from '@tanstack/react-query';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { UnifiedTimelineEntry } from '@/types/message';

interface UseUnifiedTimelineOptions {
  teamName: string | null;
  enabled?: boolean;
}

export function useUnifiedTimeline({
  teamName,
  enabled = true
}: UseUnifiedTimelineOptions) {
  // 既存のストアからポーリング間隔を取得
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['unified-timeline', teamName],
    queryFn: async () => {
      if (!teamName) {
        throw new Error('Team name is required');
      }

      const response = await fetch(`/api/timeline/${teamName}/history?limit=100`);

      if (!response.ok) {
        throw new Error(`API エラー: ${response.status}`);
      }

      return response.json();
    },
    refetchInterval: inboxInterval,  // 既存のストア値を使用
    enabled: !!teamName && enabled,
    staleTime: 0,
  });

  return {
    entries: (data?.items ?? []) as UnifiedTimelineEntry[],
    lastTimestamp: data?.last_timestamp,
    isLoading,
    error,
    refetch,
    dataUpdatedAt
  };
}
```

### 7.3 統合タイムラインパネル（ChatTimelinePanel 拡張）

既存の `ChatTimelinePanel.tsx` を拡張して session 由来のエントリも表示可能にする：

```tsx
// frontend/src/components/chat/UnifiedTimelinePanel.tsx
// ※ 既存の ChatTimelinePanel.tsx をベースに拡張

'use client';

import { useUnifiedTimeline } from '@/hooks/useUnifiedTimeline';
import { ChatHeader } from './ChatHeader';
import { ChatMessageList } from './ChatMessageList';
import { useDashboardStore } from '@/stores/dashboardStore';

export const UnifiedTimelinePanel = ({ teamName }: { teamName: string }) => {
  const inboxInterval = useDashboardStore((state) => state.inboxInterval);
  const setInboxInterval = useDashboardStore((state) => state.setInboxInterval);

  const { entries, isLoading, error, refetch, dataUpdatedAt } = useUnifiedTimeline({
    teamName,
    enabled: true
  });

  // 既存の ChatTimelinePanel と同様のUI構造
  return (
    <div className="flex flex-col h-full gap-4">
      <ChatHeader
        title="💬 統合タイムライン"
        messageCount={entries.length}
        pollingInterval={inboxInterval}
        onPollingIntervalChange={setInboxInterval}
        lastUpdateTimestamp={dataUpdatedAt}
        onRefresh={() => refetch()}
        isLoading={isLoading}
      />
      <ChatMessageList
        messages={entries}
        isLoading={isLoading}
        error={error?.message ?? null}
        // session 由来の詳細表示をサポート
        showSessionDetails={true}
      />
    </div>
  );
};
```

### 7.4 メッセージバブル拡張（ChatMessageBubble 拡張）

既存の `ChatMessageBubble.tsx` を拡張して session 由来の詳細情報を表示：

```tsx
// frontend/src/components/chat/ChatMessageBubble.tsx
// ※ 既存コンポーネントに追加

// session 由来の詳細表示コンポーネント
const SessionDetails: React.FC<{ entry: UnifiedTimelineEntry }> = ({ entry }) => {
  if (!entry.details) return null;

  return (
    <div className="mt-2 space-y-2 text-sm">
      {/* thinking ブロック */}
      {entry.details.thinking && (
        <details className="bg-slate-100 dark:bg-slate-800 rounded p-2">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400">
            💭 思考プロセス
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">
            {entry.details.thinking}
          </pre>
        </details>
      )}

      {/* ファイル変更 */}
      {entry.details.files && entry.details.files.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.details.files.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
              {file.operation === 'read' && '📖'}
              {file.operation === 'created' && '✨'}
              {file.operation === 'modified' && '✏️'}
              {file.operation === 'deleted' && '🗑️'}
              {file.path}
            </span>
          ))}
        </div>
      )}

      {/* ツール使用 */}
      {entry.details.toolName && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          🔧 {entry.details.toolName}
        </div>
      )}
    </div>
  );
};
```

---

## 8. UIデザイン

### 8.1 統合タイムラインイメージ

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Timeline                                    [🔍 Search] [⚙️ Filter] │
├─────────────────────────────────────────────────────────────────────────┤
│  14:32:05  💬  team-lead → backend-developer                           │
│            「タスク #6 を開始してください」                               │
│                                                                         │
│  14:32:10  🤖  Assistant (team-lead)                                   │
│            バックエンドAPIの実装を確認します...                          │
│            ▶ 💭 Thinking...                                             │
│            ▶ 🔧 Tool: Read (messages.py)                                │
│            ▶ 📁 3 files changed                                         │
│                                                                         │
│  14:32:15  📋  Task Assignment                                         │
│            Task #6: 差分更新API追加 → backend-developer                 │
│                                                                         │
│  14:32:20  💤  Idle Notification                                       │
│            backend-developer が待機中                                   │
│                                                                         │
│  14:33:00  ✅  Task Completed                                          │
│            Task #6 が完了しました                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 エージェント状態パネル

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 Agents                                       [🔄 Refresh]           │
├─────────────────────────────────────────────────────────────────────────┤
│  🟢 team-lead                                                           │
│     ████████████████████░░░░  80% working                              │
│     Task: #5 UX改善実装中                                               │
│     Last: 14:32:10 | Model: glm-5                                      │
│                                                                         │
│  💤 backend-developer                                                   │
│     ████████████████████████  100% idle                                │
│     Waiting for new task...                                             │
│     Last: 14:32:20 | Model: claude-opus-4-6                            │
│                                                                         │
│  🟢 frontend-developer-b                                                │
│     ████████████░░░░░░░░░░░░  50% working                              │
│     Task: #8 日付セパレーター実装中                                     │
│     Last: 14:31:55 | Model: sonnet                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. 実装ロードマップ

### Phase 1: セッションログ統合（P0）

**期間**: 1-2日

- [ ] `TimelineService` 実装
- [ ] 統合タイムラインAPI実装
- [ ] `useTimelinePolling` フック実装
- [ ] `TimelineEntry` コンポーネント実装
- [ ] タイプ別マッピング関数実装

### Phase 2: 構造化メッセージ解析（P1）

**期間**: 0.5日

- [ ] 構造化メッセージパーサー実装
- [ ] タイプ別アイコン・色適用
- [ ] タスク紐付け（taskId → taskSubject）

### Phase 3: エージェント状態詳細化（P1）

**期間**: 1日

- [ ] 状態推論ロジック実装
- [ ] プログレス計算ロジック
- [ ] 拡張エージェントカード実装
- [ ] 現在タスク表示

### Phase 4: タスク管理強化（P1）

**期間**: 1日

- [ ] タスク進捗トラッキング
- [ ] activeForm 活用
- [ ] ファイル紐付け
- [ ] 依存関係パスハイライト

### Phase 5: ファイル変更監視（P2）

**期間**: 1日

- [ ] ファイル変更パネル実装
- [ ] エージェント紐付け
- [ ] フィルター機能

---

## 10. 技術的考慮事項

### 10.1 パフォーマンス対策

- **差分読み込み**: `since` パラメータで新規エントリのみ取得
- **キャッシュ**: セッションログの読み込み位置をキャッシュ
- **件数制限**: 最大500件まで保持、それ以降は破棄
- **仮想スクロール**: 大量エントリ対応（将来）
- **React Query**: キャッシュとrefetchIntervalでポーリング実現

### 10.2 エラー処理

- **ファイル不存在**: チーム・セッションが存在しない場合のグレースフル処理
- **パースエラー**: 不正な JSON のスキップ
- **ネットワークエラー**: ポーリング継続、リトライ

### 10.3 設定可能性

- **ポーリング間隔**: `useDashboardStore` の `inboxInterval` で管理
  - 既存の `PollingIntervalSelector` コンポーネントを使用
  - デフォルト: 30000ms (30秒)
  - 選択肢: 5秒、10秒、20秒、30秒、60秒、2分、5分
- **監視対象タイプ**: タイプ別フィルター
- **件数制限**: 設定で変更可能

### 10.4 既存コンポーネントとの整合性

以下の既存コンポーネント・パターンとの整合性を維持：

| 既存リソース | パス | 活用方法 |
|-------------|------|----------|
| `pollingConstants.ts` | `components/common/` | `INTERVAL_OPTIONS` を再利用 |
| `PollingIntervalSelector` | `components/common/` | ポーリング間隔UIを再利用 |
| `dashboardStore` | `stores/` | `inboxInterval`, `searchQuery` 等を共有 |
| `ChatTimelinePanel` | `components/chat/` | React Queryパターン・UI構造を踏襲 |
| `ChatMessageList` | `components/chat/` | メッセージリスト表示を再利用 |
| `ChatMessageBubble` | `components/chat/` | メッセージバブル表示を拡張 |
| `ParsedMessage` | `types/message.ts` | 型定義を拡張して session 由来を追加 |

> **注**: vis-timeline は廃止予定のため、新規実装では使用しない。

---

## 11. タスク一覧

### 11.1 依存関係図

```
Phase 1: セッションログ統合
├── #1 TimelineService 実装（バックエンド）
│   ├── #2 統合タイムラインAPI実装 [blocked by #1]
│   └── #6 構造化メッセージパーサー強化 [blocked by #1]
│
├── #3 タイムライン型定義追加（フロントエンド）
│   └── #5 TimelineEntry コンポーネント実装 [blocked by #3, #4]
│
└── #4 useTimelinePolling フック実装
    └── #5 TimelineEntry コンポーネント実装 [blocked by #3, #4]

Phase 3: エージェント状態詳細化
└── #7 エージェント状態推論ロジック実装 [blocked by #6]
    ├── #8 拡張エージェントカード実装 [blocked by #3, #7]
    └── #9 タスク進捗トラッキング実装 [blocked by #1, #7]

Phase 5: ファイル変更監視
└── #10 ファイル変更監視パネル実装 [blocked by #1, #2]
```

### 11.2 タスク詳細

#### #1: Phase 1 - TimelineService 実装（バックエンド）

**優先度**: P0
**状態**: pending

**概要**:
`backend/app/services/timeline_service.py` を新規作成し、統合タイムラインサービスを実装する。

**タスク内容**:
1. `TimelineService` クラスを作成
2. 以下のメソッドを実装:
   - `_cwd_to_project_hash(cwd)` - cwd → project-hash 変換（セクション2.2参照）
   - `_find_session_file(team_name)` - config.json からセッションファイル特定
   - `load_inbox_messages(team_name)` - inbox メッセージ読み込み
   - `load_session_entries(team_name)` - セッションログ読み込み
   - `load_session_entries_since(team_name, since)` - 差分読み込み
   - `_map_inbox_message(msg, recipient)` - inbox → タイムライン形式変換
   - `_map_session_entry(entry)` - セッション → タイムライン形式変換
   - `_parse_structured_message(text)` - 構造化メッセージパース

**セッションファイル特定フロー**:
```
1. ~/.claude/teams/{team_name}/config.json を読み込み
2. leadSessionId と members[0].cwd を取得
3. cwd → project-hash に変換（例: "/Users/..." → "-Users-..."）
4. ~/.claude/projects/{project-hash}/{leadSessionId}.jsonl を返す
```

**完了条件**:
- 全メソッドが実装されている
- セッションファイルが正しく特定できる
- ユニットテストが通る

---

#### #2: Phase 1 - 統合タイムラインAPI実装（バックエンド）

**優先度**: P0
**状態**: pending
**依存**: #1

**概要**:
`backend/app/api/routes/timeline.py` を新規作成し、統合タイムラインAPIを実装する。

**タスク内容**:
1. `/api/timeline/{team_name}/history` エンドポイント実装
   - inbox + セッションログを統合
   - タイプフィルタ対応
   - 件数制限対応

2. `/api/timeline/{team_name}/updates` エンドポイント実装
   - since パラメータで差分取得
   - lastTimestamp 返却

3. ルーターを main.py に登録

**完了条件**:
- 両エンドポイントが動作する
- curl で動作確認できる

---

#### #3: Phase 1 - タイムライン型定義追加（フロントエンド）

**優先度**: P0
**状態**: pending

**概要**:
フロントエンドに統合タイムライン用の型定義を追加する。

**タスク内容**:
1. `frontend/src/types/message.ts` を更新:
   - 既存の `ParsedMessage` を拡張して session 由来のタイプを追加
   - `TimelineSource` 型定義（'inbox' | 'session'）
   - `ExtendedParsedType` 型定義（既存タイプ + session タイプ）
   - `UnifiedTimelineEntry` インターフェース
   - `FileChangeInfo` インターフェース
   - `MESSAGE_TYPE_CONFIG` 設定オブジェクト

2. ヘルパー関数の追加:
   - `getMessageTypeConfig(type)` - アイコン・色・ラベルを取得

**完了条件**:
- 型定義がエラーなくコンパイルできる
- TypeScript の型チェックが通る
- 既存の `ChatMessageBubble` コンポーネントとの互換性が保たれる

---

#### #4: Phase 1 - useUnifiedTimeline フック実装（フロントエンド）

**優先度**: P0
**状態**: pending

**概要**:
`frontend/src/hooks/useUnifiedTimeline.ts` を新規作成し、統合タイムライン用ポーリングフックを実装する。

**タスク内容**:
1. React Query `useQuery` パターンで実装（既存の `ChatTimelinePanel.tsx` と同様）
2. `useDashboardStore` から `inboxInterval` を取得して使用
3. 状態管理（entries, lastTimestamp, isLoading, error, refetch, dataUpdatedAt）
4. API レスポンスを `UnifiedTimelineEntry[]` に変換

**設定**:
- ポーリング間隔: `useDashboardStore` の `inboxInterval` を使用（デフォルト 30000ms）
- 最大エントリ数: 100件（API側で制限）
- 既存の `PollingIntervalSelector` コンポーネントと連携

**完了条件**:
- フックが正常に動作する
- 既存のポーリング間隔設定と連携する
- `UnifiedTimelineEntry` 型でエントリが返される

---

#### #5: Phase 1 - ChatMessageBubble 拡張（フロントエンド）

**優先度**: P0
**状態**: pending
**依存**: #3, #4

**概要**:
既存の `ChatMessageBubble.tsx` を拡張して、session 由来の詳細情報を表示可能にする。

**タスク内容**:
1. `frontend/src/components/chat/ChatMessageBubble.tsx` を更新:
   - `UnifiedTimelineEntry` 型に対応
   - session 由来のタイプ（thinking, tool_use, file_change）のアイコン・色対応
   - `MESSAGE_TYPE_CONFIG` から設定を取得

2. `SessionDetails` サブコンポーネント追加:
   - thinking 内容の折りたたみ表示
   - ファイル変更一覧表示（操作種別アイコン付き）
   - ツール使用情報表示

**完了条件**:
- 各タイプが正しく表示される
- thinking ブロックの折りたたみが動作する
- ファイル変更が操作種別付きで表示される
- 既存のスタイルとの整合性が保たれる

---

#### #6: Phase 2 - 構造化メッセージパーサー強化（バックエンド）

**優先度**: P1
**状態**: pending
**依存**: #1

**概要**:
構造化メッセージ（JSON-in-JSON）のパーサーを強化し、タイプ別の解析を実装する。

**タスク内容**:
1. `_parse_structured_message` メソッドを強化:
   - task_assignment: taskId, subject 抽出
   - task_completed: taskId 抽出
   - idle_notification: idleReason, summary 抽出
   - shutdown_request/approved: 判定

2. マッピング関数の更新:
   - 各タイプに応じた title, summary 生成
   - taskId → taskSubject 解決

**完了条件**:
- 全メッセージタイプが正しくパースされる
- テストケースが通る

---

#### #7: Phase 3 - エージェント状態推論ロジック実装（バックエンド）

**優先度**: P1
**状態**: pending
**依存**: #6

**概要**:
エージェントの状態を inbox メッセージとタスクから推論するロジックを実装する。

**タスク内容**:
1. `AgentStatusService` クラスを新規作成:
   - `infer_agent_status(agent, messages, tasks)` メソッド
   - 状態遷移: idle → active → working → completed

2. 状態推論ルール:
   - idle_notification 受信 → idle
   - タスク in_progress → working
   - 全タスク completed → completed
   - メッセージ送信 → active

3. プログレス計算:
   - 完了タスク数 / 担当タスク数

**完了条件**:
- 状態が正しく推論される
- プログレスが計算される

---

#### #8: Phase 3 - 拡張エージェントカード実装（フロントエンド）

**優先度**: P1
**状態**: pending
**依存**: #3, #7

**概要**:
既存の `TeamCard.tsx` を拡張して、エージェントの詳細情報を表示する。

**タスク内容**:
1. `frontend/src/components/dashboard/TeamCard.tsx` を更新:
   - プログレスバー表示（0-100%）
   - 現在タスク表示
   - 最終活動時刻表示
   - 使用モデル表示
   - 関連ファイル一覧

2. ステータスアイコン/色:
   - idle: 💤 黄色
   - active: 🟢 緑色
   - working: 🔵 青色
   - completed: ✅ 緑色
   - error: ❌ 赤色

**完了条件**:
- 拡張情報が表示される
- ステータスに応じたアイコン/色が表示される
- 既存のダッシュボードUIとの整合性が保たれる

---

#### #9: Phase 4 - タスク進捗トラッキング実装

**優先度**: P1
**状態**: pending
**依存**: #1, #7

**概要**:
タスクの進捗を追跡し、詳細情報を表示する機能を実装する。

**タスク内容**:
1. バックエンド:
   - タスク API に進捗情報を追加
   - activeForm フィールド活用
   - 関連ファイル情報の追加

2. フロントエンド:
   - タスクカードにプログレスバー表示
   - activeForm 表示（「今何をしているか」）
   - 担当者へのリンク
   - 依存関係のパスハイライト

**完了条件**:
- タスク進捗が表示される
- activeForm が表示される

---

#### #10: Phase 5 - ファイル変更監視パネル実装

**優先度**: P2
**状態**: pending
**依存**: #1, #2

**概要**:
プロジェクトファイルの変更をリアルタイム監視・表示するパネルを実装する。

**タスク内容**:
1. バックエンド:
   - `file-history-snapshot` からのファイル抽出
   - エージェント紐付け（セッションから推論）
   - `/api/file-changes/{team_name}` エンドポイント

2. フロントエンド:
   - `FileChangesPanel` コンポーネント作成
   - ファイルパス・操作種別（作成/編集/削除）表示
   - フィルター機能（ディレクトリ/拡張子）

**完了条件**:
- ファイル変更がリアルタイム表示される
- フィルターが動作する

---

## 12. 変更履歴

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-02-21 | 1.0 | 初版作成 |
| 2026-02-21 | 1.1 | タスク一覧セクション追加 |
| 2026-02-21 | 1.2 | 現状実装との整合性を確保（ポーリング間隔、型定義、コンポーネントパターン） |
| 2026-02-21 | 1.3 | vis-timeline 廃止に伴い ChatTimelinePanel パターンに全面移行、API レスポンス形式をハイブリッド形式に更新 |
| 2026-02-21 | 1.4 | セクション2.2 に project-hash 変換ロジック追加、セクション6.3 TimelineService に `_find_session_file` / `_cwd_to_project_hash` メソッドの実装詳細追加、タスク #1 にセッションファイル特定フロー追加 |
