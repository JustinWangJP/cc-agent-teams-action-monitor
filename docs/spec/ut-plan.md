# UT計画・テスト仕様書

**言語:** [English](./ut-plan.en.md) | [日本語](./ut-plan.md) | [中文](./ut-plan.zh.md)

## 1. テスト概要

### 1.1 テスト目的

Agent Teams Dashboardの品質を保証するため、バックエンドおよびフロントエンドのユニットテストを実施する。

### 1.2 テスト範囲

| カテゴリ | 範囲 |
|----------|------|
| バックエンド | API Routes, Services, Models |
| フロントエンド | Components, Hooks, Stores |

### 1.3 テスト環境

| 環境 | ツール |
|------|--------|
| バックエンド | pytest, pytest-asyncio, httpx |
| フロントエンド | Vitest, @testing-library/react |
| E2E | Puppeteer |

### 1.4 設計思想

#### なぜHTTPポーリングをテストするか

本システムは **HTTPポーリング** でリアルタイム更新を実現しているため、WebSocket テストは不要です。代わりに：

- ポーリング間隔の動作確認
- キャッシュの TTL 動作確認
- staleTime と refetchInterval の連携確認

#### ステータス判定ロジックのテスト

チームステータスは **セッションログの mtime** で判定するため、ファイルシステムのモックが必要：

```
セッションログ mtime ≤ 1時間 → active
セッションログ mtime > 1時間 → stopped
セッションログなし → unknown
members なし → inactive
```

---

## 2. テスト環境構築

### 2.1 バックエンド

```bash
cd backend
pip install -e ".[dev]"
pytest --version
```

### 2.2 フロントエンド

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## 3. バックエンドテスト計画

### 3.1 API Routes テスト

#### teams.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-001 | list_teams_success | チーム一覧取得（正常） | 200, チーム一覧返却 | 高 |
| T-API-002 | list_teams_empty | チーム一覧取得（データなし） | 200, 空配列返却 | 高 |
| T-API-003 | get_team_success | チーム詳細取得（正常） | 200, チーム詳細返却 | 高 |
| T-API-004 | get_team_not_found | チーム詳細取得（存在しない） | 404 | 高 |
| T-API-005 | get_team_inboxes | インボックス取得 | 200, メッセージ一覧 | 中 |
| T-API-006 | get_team_status_active | チームステータス active 判定 | セッションログ mtime ≤ 1時間 | 高 |
| T-API-007 | get_team_status_stopped | チームステータス stopped 判定 | セッションログ mtime > 1時間 | 高 |
| T-API-008 | get_team_status_unknown | チームステータス unknown 判定 | セッションログなし | 高 |
| T-API-009 | get_team_status_inactive | チームステータス inactive 判定 | members なし | 高 |
| T-API-010 | delete_team_success | チーム削除（stopped状態） | 200, 削除成功 | 高 |
| T-API-011 | delete_team_active_forbidden | チーム削除（active状態） | 400, 削除不可 | 高 |
| T-API-012 | delete_team_not_found | チーム削除（存在しない） | 404 | 高 |

#### tasks.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-013 | list_tasks_success | タスク一覧取得（正常） | 200, タスク一覧返却 | 高 |
| T-API-014 | list_tasks_empty | タスク一覧取得（データなし） | 200, 空配列返却 | 高 |
| T-API-015 | list_team_tasks | チーム別タスク取得 | 200, タスク一覧 | 高 |
| T-API-016 | get_task_success | タスク詳細取得（正常） | 200, タスク詳細 | 高 |
| T-API-017 | get_task_not_found | タスク詳細取得（存在しない） | 404 | 高 |

#### timeline.py テストケース（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-018 | get_history_success | 統合タイムライン取得 | 200, タイムラインアイテム | 高 |
| T-API-019 | get_history_with_team | チームフィルター付き取得 | フィルタ済み結果 | 高 |
| T-API-020 | get_history_with_types | タイプフィルター付き取得 | フィルタ済み結果 | 高 |
| T-API-021 | get_history_pagination | ページネーション | before_event_id 動作 | 中 |
| T-API-022 | get_updates_since | 差分更新取得 | since以降のデータ | 高 |
| T-API-023 | get_file_changes | ファイル変更一覧取得 | ファイル変更履歴 | 高 |

#### agents.py テストケース（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-024 | list_agents_success | エージェント一覧取得 | 200, エージェント一覧 | 高 |
| T-API-025 | list_agents_empty | エージェントなし | 200, 空配列 | 中 |
| T-API-026 | get_agent_status_working | エージェント状態 working | in_progress タスクあり | 高 |
| T-API-027 | get_agent_status_idle | エージェント状態 idle | 5分以上無活動 | 高 |
| T-API-028 | get_agent_status_waiting | エージェント状態 waiting | blocked タスクあり | 高 |
| T-API-029 | get_agent_status_completed | エージェント状態 completed | 全タスク完了 | 高 |

### 3.2 Services テスト

#### file_watcher.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-001 | start_watcher | 監視開始 | Observer起動 | 高 |
| T-SVC-002 | stop_watcher | 監視停止 | Observer停止 | 高 |
| T-SVC-003 | file_modified_config | config.json変更検知 | キャッシュ無効化 | 高 |
| T-SVC-004 | file_modified_inbox | inbox.json変更検知 | キャッシュ無効化 | 高 |
| T-SVC-005 | debounce | デバウンス処理 | 500ms遅延 | 中 |

#### cache_service.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-006 | cache_get_set | キャッシュ取得・設定 | 正常動作 | 高 |
| T-SVC-007 | cache_expiry | TTL期限切れ | 期限切れでNone返却 | 高 |
| T-SVC-008 | cache_invalidate | キャッシュ無効化 | 無効化で再取得 | 高 |
| T-SVC-009 | cache_cleanup | 自動クリーンアップ | 期限切れ削除 | 中 |

#### timeline_service.py テストケース（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-010 | get_unified_timeline | 統合タイムライン取得 | inbox + セッションログ統合 | 高 |
| T-SVC-011 | parse_session_log | セッションログ解析 | 正常パース | 高 |
| T-SVC-012 | filter_by_time_range | 時間範囲フィルター | フィルタ済み結果 | 高 |
| T-SVC-013 | filter_by_types | タイプフィルター | フィルタ済み結果 | 高 |
| T-SVC-014 | sort_by_timestamp | タイムスタンプソート | 昇順ソート | 高 |

#### agent_status_service.py テストケース（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-015 | infer_status_idle | idle状態推論 | 5分以上無活動 | 高 |
| T-SVC-016 | infer_status_working | working状態推論 | in_progress タスクあり | 高 |
| T-SVC-017 | infer_status_waiting | waiting状態推論 | blocked タスクあり | 高 |
| T-SVC-018 | infer_status_error | error状態推論 | 30分以上無活動 | 高 |
| T-SVC-019 | infer_status_completed | completed状態推論 | 全タスク完了 | 高 |
| T-SVC-020 | get_last_activity | 最終活動時刻取得 | 正常取得 | 高 |

#### message_parser.py テストケース（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-021 | parse_task_assignment | タスク割り当て解析 | parsedType='task_assignment' | 高 |
| T-SVC-022 | parse_idle_notification | アイドル通知解析 | parsedType='idle_notification' | 高 |
| T-SVC-023 | parse_shutdown_request | シャットダウン要求解析 | parsedType='shutdown_request' | 高 |
| T-SVC-024 | parse_plan_approval | プラン承認解析 | parsedType='plan_approval_request' | 高 |
| T-SVC-025 | parse_unknown | 不明タイプ解析 | parsedType='unknown' | 中 |

### 3.3 Models テスト

#### Pydanticモデル テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-MOD-001 | team_validation | Team バリデーション | 正常作成 | 高 |
| T-MOD-002 | task_validation | Task バリデーション | 正常作成 | 高 |
| T-MOD-003 | timeline_item_validation | TimelineItem バリデーション | 正常作成 | 高 |
| T-MOD-004 | invalid_data | 不正データ | ValidationError | 高 |

---

## 4. フロントエンドテスト計画

### 4.1 Components テスト

#### 共通コンポーネント

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-CMP-001 | LoadingSpinner_render | ローディング表示 | スピナー表示 | 中 |
| T-CMP-002 | StatusBadge_active | active ステータス | 緑色バッジ | 高 |
| T-CMP-003 | StatusBadge_stopped | stopped ステータス | 濃い灰色バッジ | 高 |
| T-CMP-004 | ThemeToggle_click | テーマ切替 | テーマ変更 | 高 |
| T-CMP-005 | PollingIntervalSelector | ポーリング間隔選択 | 間隔変更 | 中 |

#### チャット関連コンポーネント（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-CMP-006 | ChatMessageBubble_render | メッセージバブル表示 | 正常レンダリング | 高 |
| T-CMP-007 | ChatMessageBubble_markdown | Markdown表示 | 整形表示 | 高 |
| T-CMP-008 | ChatMessageBubble_type_icon | タイプ別アイコン | 適切なアイコン | 高 |
| T-CMP-009 | ChatMessageBubble_click | クリックイベント | onClick呼び出し | 高 |
| T-CMP-010 | ChatHeader_search | 検索機能 | フィルター動作 | 高 |
| T-CMP-011 | ChatHeader_filters | フィルター機能 | フィルター適用 | 高 |
| T-CMP-012 | ChatTimelinePanel_empty | 空状態表示 | ガイド表示 | 中 |
| T-CMP-013 | BookmarkButton_toggle | ブックマーク切替 | 保存・削除 | 中 |
| T-CMP-014 | AgentStatusIndicator_online | オンライン状態 | 緑色表示 | 中 |
| T-CMP-015 | MessageDetailPanel_render | 詳細パネル表示 | スライドイン | 高 |

#### ダッシュボードコンポーネント

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-CMP-016 | TeamCard_render | チームカード表示 | 正常レンダリング | 高 |
| T-CMP-017 | TeamCard_click | クリックイベント | onClick呼び出し | 高 |
| T-CMP-018 | TeamCard_stopped | stopped状態表示 | 適切な表示 | 高 |
| T-CMP-019 | TaskCard_render | タスクカード表示 | 正常レンダリング | 高 |
| T-CMP-020 | ActivityFeed_render | フィード表示 | 正常レンダリング | 中 |

### 4.2 Hooks テスト

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-HK-001 | useTeams_fetch | データ取得 | teams更新 | 高 |
| T-HK-002 | useTeams_loading | ローディング状態 | loading=true → false | 高 |
| T-HK-003 | useTeams_polling | ポーリング動作 | 定期更新（refetchInterval） | 高 |
| T-HK-004 | useTeams_stale_time | staleTime動作 | 10秒間キャッシュ使用 | 高 |
| T-HK-005 | useTasks_fetch | データ取得 | tasks更新 | 高 |
| T-HK-006 | useTasks_polling | ポーリング動作 | 定期更新 | 高 |
| T-HK-007 | useInbox_fetch | インボックス取得 | メッセージ取得 | 高 |
| T-HK-008 | useUnifiedTimeline_fetch | 統合タイムライン取得 | タイムラインアイテム | 高 |
| T-HK-009 | useUnifiedTimeline_polling | ポーリング動作 | 定期更新 | 高 |
| T-HK-010 | useAgentMessages_fetch | エージェント別メッセージ取得 | メッセージ取得 | 高 |

### 4.3 Store テスト（新規）

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-STR-001 | dashboardStore_selection | 選択状態管理 | 正常動作 | 高 |
| T-STR-002 | dashboardStore_filters | フィルター管理 | 正常動作 | 高 |
| T-STR-003 | dashboardStore_polling | ポーリング制御 | 正常動作 | 高 |
| T-STR-004 | dashboardStore_theme | テーマ管理 | 正常動作 | 中 |

---

## 5. テスト実装サンプル

### 5.1 バックエンド (pytest)

```python
# tests/test_api_teams.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_list_teams_success(client):
    """T-API-001: チーム一覧取得（正常）"""
    response = await client.get("/api/teams")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_team_not_found(client):
    """T-API-004: チーム詳細取得（存在しない）"""
    response = await client.get("/api/teams/nonexistent")
    assert response.status_code == 404
```

### 5.2 フロントエンド (Vitest)

```typescript
// src/components/chat/__tests__/ChatMessageBubble.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessageBubble } from '../ChatMessageBubble';
import type { ParsedMessage } from '@/types/message';

describe('ChatMessageBubble', () => {
  const mockMessage: ParsedMessage = {
    from: 'test-agent',
    text: 'Hello World',
    timestamp: '2026-02-21T12:00:00Z',
    read: true,
    parsedType: 'message',
  };

  it('T-CMP-006: メッセージバブル表示', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('test-agent')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('T-CMP-008: タイプ別アイコン - message', () => {
    render(<ChatMessageBubble message={mockMessage} />);
    expect(screen.getByText('💬')).toBeInTheDocument();
  });
});
```

---

## 6. テスト実行コマンド

### 6.1 バックエンド

```bash
cd backend

# 全テスト実行
pytest

# 詳細出力
pytest -v

# カバレッジ付き
pytest --cov=app --cov-report=html

# 特定テスト
pytest tests/test_api_teams.py -v
```

### 6.2 フロントエンド

```bash
cd frontend

# 全テスト実行
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# UI モード
npm run test:ui
```

---

## 7. カバレッジ目標

| カテゴリ | 目標カバレッジ |
|----------|---------------|
| バックエンド API | 80%以上 |
| バックエンド Services | 70%以上 |
| バックエンド Models | 90%以上 |
| フロントエンド Components | 70%以上 |
| フロントエンド Hooks | 80%以上 |
| フロントエンド Stores | 85%以上 |

---

## 8. テスト実行スケジュール

### フェーズ1: 基本テスト（1週間）
- バックエンド API Routes テスト
- Pydantic Models テスト
- フロントエンド共通コンポーネント テスト

### フェーズ2: 機能テスト（1週間）
- File Watcher テスト
- Cache Service テスト
- Timeline Service テスト
- Agent Status Service テスト
- Message Parser テスト
- チャットコンポーネント テスト

### フェーズ3: UI テスト（1週間）
- フロントエンド Components テスト
- フロントエンド Hooks テスト（ポーリング動作含む）
- フロントエンド Stores テスト

### フェーズ4: 統合テスト（1週間）
- E2Eテスト拡充
- パフォーマンステスト（ポーリング負荷）
- クロスブラウザテスト

---

*作成日: 2026-02-16*
*最終更新日: 2026-02-24*
*バージョン: 2.1.0*
