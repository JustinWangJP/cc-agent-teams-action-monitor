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
│   ├── config.json          # チーム構成、leadSessionId
│   └── inboxes/
│       └── {agent}.json     # エージェント間メッセージ
├── tasks/{team-name}/
│   ├── 1.json               # タスク定義
│   └── ...
└── projects/{project-hash}/
    └── {session-id}.jsonl   # セッションログ（JSONL形式）
```

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
- デフォルト間隔: 2000ms
- 差分取得: `since` パラメータで前回以降の更新のみ取得

---

## 5. データモデル

### 5.1 統合タイムラインエントリ

```typescript
// frontend/src/types/timeline.ts

type TimelineSource = 'inbox' | 'session';

type TimelineEntryType =
  // inbox由来
  | 'inbox_message'
  | 'task_assignment'
  | 'task_completed'
  | 'idle_notification'
  | 'shutdown_request'
  // session由来
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'tool_use'
  | 'file_change';

interface TimelineEntry {
  id: string;
  timestamp: string;
  source: TimelineSource;
  type: TimelineEntryType;

  // 表示用フィールド
  icon: string;
  color: string;
  title: string;
  summary: string;

  // 詳細データ
  details?: {
    from?: string;
    to?: string;
    content?: string;
    thinking?: string;
    files?: FileChangeInfo[];
    taskId?: string;
    taskSubject?: string;
    toolName?: string;
  };

  isExpanded?: boolean;
}

interface FileChangeInfo {
  path: string;
  operation: 'created' | 'modified' | 'deleted';
  version: number;
}
```

### 5.2 エントリタイプ設定

```typescript
const ENTRY_TYPE_CONFIG: Record<TimelineEntryType, { icon: string; color: string }> = {
  inbox_message:        { icon: '💬', color: '#6b7280' },
  task_assignment:      { icon: '📋', color: '#3b82f6' },
  task_completed:       { icon: '✅', color: '#10b981' },
  idle_notification:    { icon: '💤', color: '#f59e0b' },
  shutdown_request:     { icon: '🔌', color: '#ef4444' },
  user_message:         { icon: '👤', color: '#3b82f6' },
  assistant_message:    { icon: '🤖', color: '#8b5cf6' },
  thinking:             { icon: '💭', color: '#9ca3af' },
  tool_use:             { icon: '🔧', color: '#06b6d4' },
  file_change:          { icon: '📁', color: '#06b6d4' },
};
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

```python
# backend/app/api/routes/timeline.py

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/timeline", tags=["timeline"])

@router.get("/{team_name}/history")
async def get_timeline_history(
    team_name: str,
    limit: int = Query(100, ge=1, le=500),
    types: Optional[str] = Query(None, description="カンマ区切りでタイプ指定")
):
    """
    タイムライン履歴を取得（初期表示用）

    inbox メッセージ + セッションログ を統合して返す
    """
    pass


@router.get("/{team_name}/updates")
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

### 6.2 TimelineService

```python
# backend/app/services/timeline_service.py

class TimelineService:
    """統合タイムラインサービス"""

    def __init__(self, claude_dir: Path = None):
        self.claude_dir = claude_dir or Path.home() / ".claude"
        self._session_cache: dict = {}  # 読み込み位置キャッシュ

    async def load_inbox_messages(self, team_name: str) -> list[dict]:
        """チームの全 inbox メッセージを読み込み"""
        pass

    async def load_session_entries(self, team_name: str) -> list[dict]:
        """チームのセッションログを読み込み（leadSessionId から特定）"""
        pass

    async def load_session_entries_since(
        self,
        team_name: str,
        since: Optional[str]
    ) -> list[dict]:
        """差分読み込み（前回位置から）"""
        pass

    def _map_inbox_message(self, msg: dict, recipient: str) -> dict:
        """inbox メッセージをタイムラインエントリ形式に変換"""
        pass

    def _map_session_entry(self, entry: dict) -> Optional[dict]:
        """セッションログエントリをタイムライン形式に変換"""
        pass

    def _parse_structured_message(self, text: str) -> Optional[dict]:
        """構造化メッセージ（JSON-in-JSON）をパース"""
        pass
```

---

## 7. フロントエンド設計

### 7.1 ポーリングフック

```typescript
// frontend/src/hooks/useTimelinePolling.ts

interface UseTimelinePollingOptions {
  teamName: string | null;
  pollInterval?: number;  // デフォルト: 2000ms
  enabled?: boolean;
}

export function useTimelinePolling({
  teamName,
  pollInterval = 2000,
  enabled = true
}: UseTimelinePollingOptions) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初期読み込み + ポーリング
  useEffect(() => {
    if (!teamName || !enabled) return;

    // 初期読み込み
    const loadInitial = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/timeline/${teamName}/history?limit=100`);
        const data = await response.json();
        const mappedEntries = data.entries.map(mapToTimelineEntry);
        setEntries(mappedEntries);
        if (mappedEntries.length > 0) {
          setLastTimestamp(mappedEntries[mappedEntries.length - 1].timestamp);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();

    // ポーリング
    const pollTimer = setInterval(async () => {
      try {
        const url = lastTimestamp
          ? `/api/timeline/${teamName}/updates?since=${encodeURIComponent(lastTimestamp)}`
          : `/api/timeline/${teamName}/updates?limit=20`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.entries.length > 0) {
          const newEntries = data.entries.map(mapToTimelineEntry);
          setEntries(prev => {
            const combined = [...prev, ...newEntries];
            const unique = combined.filter((entry, index, self) =>
              index === self.findIndex(e => e.id === entry.id)
            );
            return unique.slice(-500);
          });
          setLastTimestamp(data.lastTimestamp);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, pollInterval);

    return () => clearInterval(pollTimer);
  }, [teamName, pollInterval, enabled, lastTimestamp]);

  return { entries, isLoading, error };
}
```

### 7.2 タイムラインエントリコンポーネント

```tsx
// frontend/src/components/timeline/TimelineEntry.tsx

interface TimelineEntryProps {
  entry: TimelineEntry;
  onToggleExpand: (id: string) => void;
}

export function TimelineEntry({ entry, onToggleExpand }: TimelineEntryProps) {
  const config = ENTRY_TYPE_CONFIG[entry.type];

  return (
    <div className="timeline-entry flex gap-3 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800">
      {/* アイコン */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <span>{config.icon}</span>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {formatTime(entry.timestamp)}
          </span>
          <span className="font-medium text-sm" style={{ color: config.color }}>
            {entry.title}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {entry.summary}
        </p>

        {/* 展開時の詳細 */}
        {entry.isExpanded && <EntryDetails entry={entry} />}
      </div>

      {/* 展開ボタン */}
      {hasDetails(entry) && (
        <button onClick={() => onToggleExpand(entry.id)}>
          {entry.isExpanded ? '▼' : '▶'}
        </button>
      )}
    </div>
  );
}
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

### 10.2 エラー処理

- **ファイル不存在**: チーム・セッションが存在しない場合のグレースフル処理
- **パースエラー**: 不正な JSON のスキップ
- **ネットワークエラー**: ポーリング継続、リトライ

### 10.3 設定可能性

- **ポーリング間隔**: 設定で変更可能
- **監視対象タイプ**: タイプ別フィルター
- **件数制限**: 設定で変更可能

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
   - `load_inbox_messages(team_name)` - inbox メッセージ読み込み
   - `load_session_entries(team_name)` - セッションログ読み込み
   - `load_session_entries_since(team_name, since)` - 差分読み込み
   - `_map_inbox_message(msg, recipient)` - inbox → タイムライン形式変換
   - `_map_session_entry(entry)` - セッション → タイムライン形式変換
   - `_parse_structured_message(text)` - 構造化メッセージパース

**完了条件**:
- 全メソッドが実装されている
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
1. `frontend/src/types/timeline.ts` を更新:
   - `TimelineSource` 型定義
   - `TimelineEntryType` 型定義
   - `TimelineEntry` インターフェース
   - `FileChangeInfo` インターフェース
   - `ENTRY_TYPE_CONFIG` 設定オブジェクト

**完了条件**:
- 型定義がエラーなくコンパイルできる
- TypeScript の型チェックが通る

---

#### #4: Phase 1 - useTimelinePolling フック実装（フロントエンド）

**優先度**: P0
**状態**: pending

**概要**:
`frontend/src/hooks/useTimelinePolling.ts` を新規作成し、ポーリングフックを実装する。

**タスク内容**:
1. 初期履歴読み込み機能
2. ポーリングによる差分更新機能
3. 状態管理（entries, isLoading, error）
4. lastTimestamp による差分取得

**設定**:
- デフォルトポーリング間隔: 2000ms
- 最大エントリ数: 500件

**完了条件**:
- フックが正常に動作する
- エントリが正しくマージされる

---

#### #5: Phase 1 - TimelineEntry コンポーネント実装（フロントエンド）

**優先度**: P0
**状態**: pending
**依存**: #3, #4

**概要**:
統合タイムライン用のエントリコンポーネントを実装する。

**タスク内容**:
1. `frontend/src/components/timeline/TimelineEntry.tsx` を更新:
   - アイコン表示（タイプ別）
   - タイムスタンプ表示
   - タイトル・サマリー表示
   - 展開/折りたたみ機能

2. EntryDetails サブコンポーネント:
   - thinking 内容表示
   - ファイル変更一覧表示
   - ツール使用情報表示

**完了条件**:
- 各タイプが正しく表示される
- 展開/折りたたみが動作する

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
エージェントカードに詳細情報を表示するコンポーネントを実装する。

**タスク内容**:
1. `frontend/src/components/dashboard/AgentStatusCard.tsx` を更新:
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
