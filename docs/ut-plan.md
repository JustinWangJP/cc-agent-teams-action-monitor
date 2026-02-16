# UT計画・テスト仕様書

## 1. テスト概要

### 1.1 テスト目的

Agent Teams Dashboardの品質を保証するため、バックエンドおよびフロントエンドのユニットテストを実施する。

### 1.2 テスト範囲

| カテゴリ | 範囲 |
|----------|------|
| バックエンド | API Routes, Services, Models |
| フロントエンド | Components, Hooks |

### 1.3 テスト環境

| 環境 | ツール |
|------|--------|
| バックエンド | pytest, pytest-asyncio, httpx |
| フロントエンド | Vitest (推奨) / Jest |
| E2E | Puppeteer |

---

## 2. テスト環境構築

### 2.1 バックエンド

```bash
cd backend
pip install -e ".[dev]"
pytest --version
```

### 2.2 フロントエンド（推奨設定）

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom
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

#### tasks.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-006 | list_tasks_success | タスク一覧取得（正常） | 200, タスク一覧返却 | 高 |
| T-API-007 | list_tasks_empty | タスク一覧取得（データなし） | 200, 空配列返却 | 高 |
| T-API-008 | list_team_tasks | チーム別タスク取得 | 200, タスク一覧 | 高 |
| T-API-009 | get_task_success | タスク詳細取得（正常） | 200, タスク詳細 | 高 |
| T-API-010 | get_task_not_found | タスク詳細取得（存在しない） | 404 | 高 |

#### websocket.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-API-011 | ws_connect | WebSocket接続 | 接続成功 | 高 |
| T-API-012 | ws_ping_pong | ping/pong通信 | pong返却 | 高 |
| T-API-013 | ws_disconnect | 切断処理 | 接続リストから削除 | 高 |
| T-API-014 | ws_broadcast | ブロードキャスト | 全クライアント受信 | 中 |

### 3.2 Services テスト

#### file_watcher.py テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-SVC-001 | start_watcher | 監視開始 | Observer起動 | 高 |
| T-SVC-002 | stop_watcher | 監視停止 | Observer停止 | 高 |
| T-SVC-003 | file_modified | ファイル変更検知 | イベント発火 | 高 |
| T-SVC-004 | debounce | デバウンス処理 | 500ms遅延 | 中 |

### 3.3 Models テスト

#### Pydanticモデル テストケース

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-MOD-001 | team_validation | Team バリデーション | 正常作成 | 高 |
| T-MOD-002 | task_validation | Task バリデーション | 正常作成 | 高 |
| T-MOD-003 | invalid_data | 不正データ | ValidationError | 高 |

---

## 4. フロントエンドテスト計画

### 4.1 Components テスト

#### テストケース一覧

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-CMP-001 | LoadingSpinner_render | ローディング表示 | スピナー表示 | 中 |
| T-CMP-002 | StatusBadge_active | active ステータス | 緑色バッジ | 高 |
| T-CMP-003 | StatusBadge_pending | pending ステータス | 灰色バッジ | 高 |
| T-CMP-004 | TeamCard_render | チームカード表示 | 正常レンダリング | 高 |
| T-CMP-005 | TeamCard_click | クリックイベント | onClick呼び出し | 高 |
| T-CMP-006 | TaskCard_render | タスクカード表示 | 正常レンダリング | 高 |
| T-CMP-007 | ActivityFeed_render | フィード表示 | 正常レンダリング | 中 |

### 4.2 Hooks テスト

#### テストケース一覧

| テストID | テスト名 | テスト内容 | 期待結果 | 優先度 |
|----------|----------|-----------|----------|--------|
| T-HK-001 | useTeams_fetch | データ取得 | teams更新 | 高 |
| T-HK-002 | useTeams_loading | ローディング状態 | loading=true → false | 高 |
| T-HK-003 | useTasks_fetch | データ取得 | tasks更新 | 高 |
| T-HK-004 | useWebSocket_connect | 接続確立 | connected | 高 |
| T-HK-005 | useWebSocket_message | メッセージ受信 | lastMessage更新 | 高 |
| T-HK-006 | useWebSocket_reconnect | 再接続 | 自動再接続 | 中 |

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
// src/components/common/__tests__/StatusBadge.test.tsx
import { render } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('T-CMP-002: active status', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.firstChild).toHaveClass('bg-green-100');
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

---

## 8. テスト実行スケジュール

### フェーズ1: 基本テスト（1週間）
- バックエンド API Routes テスト
- Pydantic Models テスト

### フェーズ2: 機能テスト（1週間）
- File Watcher テスト
- WebSocket テスト

### フェーズ3: UI テスト（1週間）
- フロントエンド Components テスト
- フロントエンド Hooks テスト

### フェーズ4: 統合テスト（1週間）
- E2Eテスト拡充
- パフォーマンステスト

---

*作成日: 2026-02-16*
*バージョン: 1.0.0*
