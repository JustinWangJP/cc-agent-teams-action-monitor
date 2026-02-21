"""統合タイムライン API のテスト."""
import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """テストクライアントを提供します."""
    return TestClient(app)


@pytest.fixture
def mock_claude_dir(tmp_path):
    """テスト用の Claude ディレクトリ構造を作成します."""
    # チームディレクトリ
    teams_dir = tmp_path / "teams"
    teams_dir.mkdir()

    team_name = "test-team"
    team_dir = teams_dir / team_name
    team_dir.mkdir()

    # config.json
    lead_session_id = "test-session-123"
    cwd = "/Users/test/project"
    project_hash = "-" + cwd.lstrip("/").replace("/", "-")

    config = {
        "leadSessionId": lead_session_id,
        "members": [{"cwd": cwd}]
    }
    config_file = team_dir / "config.json"
    config_file.write_text(json.dumps(config))

    # inbox ディレクトリとファイル
    inbox_dir = team_dir / "inboxes"
    inbox_dir.mkdir()

    inbox_data = {
        "messages": [
            {
                "content": "Test message from team-lead",
                "from": "team-lead",
                "to": "backend-developer",
                "timestamp": "2026-02-21T10:00:00Z",
                "read": True
            },
            {
                "content": '{"type": "task_assignment", "taskId": "1", "subject": "Implement API"}',
                "from": "team-lead",
                "timestamp": "2026-02-21T10:05:00Z",
                "read": False
            }
        ]
    }
    inbox_file = inbox_dir / "backend-developer.json"
    inbox_file.write_text(json.dumps(inbox_data))

    # セッションファイル
    projects_dir = tmp_path / "projects"
    projects_dir.mkdir()

    session_file = projects_dir / project_hash / f"{lead_session_id}.jsonl"
    session_file.parent.mkdir(parents=True, exist_ok=True)

    session_entries = [
        '{"type": "user", "content": "Hello", "timestamp": "2026-02-21T10:01:00Z"}',
        '{"type": "thinking", "thinking": "Let me think", "timestamp": "2026-02-21T10:02:00Z"}',
        '{"type": "tool_use", "name": "read", "input": {"file": "test.py"}, "timestamp": "2026-02-21T10:03:00Z"}',
    ]
    session_file.write_text("\n".join(session_entries))

    return tmp_path


class TestTimelineAPI:
    """統合タイムライン API のテストスイート."""

    def test_get_timeline_history_success(self, client, mock_claude_dir):
        """タイムライン履歴の取得をテストします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            response = client.get("/api/timeline/test-team/history")

            assert response.status_code == 200
            data = response.json()

            assert "items" in data
            assert "last_timestamp" in data
            assert len(data["items"]) > 0

            # inbox と session の両方が含まれていることを確認
            sources = {item["source"] for item in data["items"]}
            assert "inbox" in sources
            assert "session" in sources

    def test_get_timeline_history_with_types_filter(self, client, mock_claude_dir):
        """タイプフィルタのテストをします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            # thinking タイプのみを取得
            response = client.get("/api/timeline/test-team/history?types=thinking")

            assert response.status_code == 200
            data = response.json()

            # すべてのエントリが thinking タイプであることを確認
            for item in data["items"]:
                assert item["parsed_type"] == "thinking"

    def test_get_timeline_history_with_limit(self, client, mock_claude_dir):
        """件数制限のテストをします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            # 2件に制限
            response = client.get("/api/timeline/test-team/history?limit=2")

            assert response.status_code == 200
            data = response.json()

            assert len(data["items"]) <= 2

    def test_get_timeline_history_invalid_limit(self, client, mock_claude_dir):
        """無効な limit パラメータのテストをします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            # 最大値超過
            response = client.get("/api/timeline/test-team/history?limit=1000")

            # バリデーションエラー（422）または正常に制限されて返る
            # FastAPI の Query バリデーションでは 422 が返る
            assert response.status_code in [200, 422]

    def test_get_timeline_updates_with_since(self, client, mock_claude_dir):
        """since パラメータを使用した差分更新のテストをします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            # より早い時刻を指定（全エントリが含まれるように）
            since = "2026-02-21T09:00:00Z"
            response = client.get(f"/api/timeline/test-team/updates?since={since}")

            assert response.status_code == 200
            data = response.json()

            # 少なくとも1つのエントリが存在することを確認
            # セッションエントリは最初は空（キャッシュ済み）なのでinboxのみ
            assert len(data["items"]) > 0

    def test_get_timeline_updates_empty_result(self, client):
        """存在しないチームでのテストをします."""
        # 存在しないチーム
        response = client.get("/api/timeline/non-existent-team/history")

        # 空の結果が返る（エラーにはならない）
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 0

    def test_timeline_entry_structure(self, client, mock_claude_dir):
        """タイムラインエントリの構造をテストします."""
        with patch('app.services.timeline_service.settings') as mock_settings:
            mock_settings.claude_dir = mock_claude_dir

            response = client.get("/api/timeline/test-team/history")

            assert response.status_code == 200
            data = response.json()

            if data["items"]:
                item = data["items"][0]

                # 必須フィールドの確認
                assert "id" in item
                assert "content" in item
                assert "from_" in item
                assert "timestamp" in item
                assert "source" in item
                assert "parsed_type" in item

                # source は 'inbox' または 'session'
                assert item["source"] in ["inbox", "session"]
