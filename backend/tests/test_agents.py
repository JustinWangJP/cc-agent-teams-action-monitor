"""エージェントステータスAPIのテスト。

エージェントステータス取得、タイピングインジケーター取得のエンドポイントをテストします。

"""
import pytest
from datetime import datetime, timedelta
from pathlib import Path
import json

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


client = TestClient(app)


@pytest.fixture
def setup_team_with_inboxes(tmp_path: Path):
    """テスト用のチームとインボックスファイルを作成するフィクスチャ。

    複数のエージェントと異なるタイムスタンプのメッセージを含む
    インボックスファイルを作成します。

    """
    teams_dir = tmp_path / "teams_agents_status"
    teams_dir.mkdir(exist_ok=True)

    team_dir = teams_dir / "test-team"
    team_dir.mkdir()

    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()

    now = datetime.now()

    # onlineエージェント（5分以内にメッセージ送信）
    online_messages = [
        {
            "from": "agent-online",
            "text": "Recent message",
            "timestamp": (now - timedelta(minutes=2)).isoformat(),
        }
    ]

    # idleエージェント（5分〜30分以内）
    idle_messages = [
        {
            "from": "agent-idle",
            "text": "Older message",
            "timestamp": (now - timedelta(minutes=15)).isoformat(),
        }
    ]

    # offlineエージェント（30分以上経過）
    offline_messages = [
        {
            "from": "agent-offline",
            "text": "Very old message",
            "timestamp": (now - timedelta(minutes=45)).isoformat(),
        }
    ]

    # インボックスファイルを作成
    (inboxes_dir / "agent-online.json").write_text(
        json.dumps(online_messages), encoding="utf-8"
    )
    (inboxes_dir / "agent-idle.json").write_text(
        json.dumps(idle_messages), encoding="utf-8"
    )
    (inboxes_dir / "agent-offline.json").write_text(
        json.dumps(offline_messages), encoding="utf-8"
    )

    # チーム設定ファイルも作成
    config = {
        "name": "test-team",
        "description": "Test team",
        "members": [
            {"name": "agent-online", "agentId": "agent-online"},
            {"name": "agent-idle", "agentId": "agent-idle"},
            {"name": "agent-offline", "agentId": "agent-offline"},
        ],
    }
    (team_dir / "config.json").write_text(
        json.dumps(config), encoding="utf-8"
    )

    return team_dir


def test_get_agents_status_returns_empty_list_for_nonexistent_team():
    """存在しないチーム名でステータス取得時、404エラーとなることを確認。"""
    response = client.get("/api/teams/nonexistent-team/agents/status")
    assert response.status_code == 404


def test_get_agents_status_returns_agent_statuses(setup_team_with_inboxes, monkeypatch):
    """エージェントステータスが正しく判定されることを確認。"""
    # テスト用ディレクトリにパスを置換
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_inboxes.parent)

    response = client.get("/api/teams/test-team/agents/status")

    assert response.status_code == 200
    data = response.json()

    assert "agents" in data
    assert isinstance(data["agents"], list)

    # ステータス確認用の辞書を作成
    status_by_agent = {
        agent["name"]: agent["status"] for agent in data["agents"]
    }

    # onlineエージェントの確認
    assert "agent-online" in status_by_agent
    assert status_by_agent["agent-online"] == "online"

    # idleエージェントの確認
    assert "agent-idle" in status_by_agent
    assert status_by_agent["agent-idle"] == "idle"

    # offlineエージェントの確認
    assert "agent-offline" in status_by_agent
    assert status_by_agent["agent-offline"] == "offline"


def test_get_agents_status_includes_last_activity(setup_team_with_inboxes, monkeypatch):
    """最終アクティビティ時刻が含まれることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_inboxes.parent)

    response = client.get("/api/teams/test-team/agents/status")

    assert response.status_code == 200
    data = response.json()

    for agent in data["agents"]:
        # lastActivityフィールドが存在するか確認（Noneでも可）
        assert "lastActivity" in agent


def test_get_typing_indicators_returns_empty_list(setup_team_with_inboxes, monkeypatch):
    """タイピングインジケーターが空リストを返すことを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_inboxes.parent)

    response = client.get("/api/teams/test-team/agents/typing")

    assert response.status_code == 200
    data = response.json()

    assert "typing" in data
    assert isinstance(data["typing"], list)
    assert len(data["typing"]) == 0


def test_get_typing_indicators_returns_404_for_nonexistent_team():
    """存在しないチーム名でタイピング取得時、404エラーとなることを確認。"""
    response = client.get("/api/teams/nonexistent-team/agents/typing")
    assert response.status_code == 404


def test_get_agents_status_handles_corrupted_inbox_files(tmp_path, monkeypatch):
    """TC-023: 破損したインボックスファイルがあってもステータス取得が成功することを確認。"""
    import json
    from app.config import settings
    
    teams_dir = tmp_path / "teams_agents_status"
    teams_dir.mkdir(exist_ok=True)
    
    team_dir = teams_dir / "test-corrupted-status"
    team_dir.mkdir()
    
    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()
    
    now = datetime.now()
    
    # 有効なインボックスファイル
    valid_messages = [
        {
            "from": "agent-valid",
            "text": "Valid message",
            "timestamp": (now - timedelta(minutes=2)).isoformat(),
        }
    ]
    
    (inboxes_dir / "agent-valid.json").write_text(
        json.dumps(valid_messages), encoding="utf-8"
    )
    
    # 破損したインボックスファイル（無効なJSON）
    (inboxes_dir / "agent-corrupted.json").write_text(
        "{invalid json content", encoding="utf-8"
    )
    
    config = {
        "name": "test-corrupted-status",
        "members": [{"name": "agent-valid"}, {"name": "agent-corrupted"}],
    }
    (team_dir / "config.json").write_text(
        json.dumps(config), encoding="utf-8"
    )
    
    monkeypatch.setattr(settings, "teams_dir", teams_dir)
    
    response = client.get("/api/teams/test-corrupted-status/agents/status")
    
    assert response.status_code == 200
    data = response.json()
    
    # 有効なエージェントのステータスが含まれる
    agent_statuses = {agent["name"]: agent["status"] for agent in data["agents"]}
    
    # 有効なメッセージを持つエージェントはonline
    assert "agent-valid" in agent_statuses
    assert agent_statuses["agent-valid"] == "online"


def test_get_agents_status_handles_messages_with_invalid_timestamp(tmp_path, monkeypatch):
    """TC-024: 無効なタイムスタンプを持つメッセージが適切に処理されることを確認。"""
    import json
    from app.config import settings
    
    teams_dir = tmp_path / "teams_agents_status"
    teams_dir.mkdir(exist_ok=True)
    
    team_dir = teams_dir / "test-invalid-timestamp-status"
    team_dir.mkdir()
    
    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()
    
    # 無効なタイムスタンプを持つメッセージ
    invalid_messages = [
        {
            "from": "agent-invalid",
            "text": "Message with invalid timestamp",
            "timestamp": "not-a-valid-timestamp",
        }
    ]
    
    (inboxes_dir / "agent-invalid.json").write_text(
        json.dumps(invalid_messages), encoding="utf-8"
    )
    
    config = {
        "name": "test-invalid-timestamp-status",
        "members": [{"name": "agent-invalid"}],
    }
    (team_dir / "config.json").write_text(
        json.dumps(config), encoding="utf-8"
    )
    
    monkeypatch.setattr(settings, "teams_dir", teams_dir)
    
    response = client.get("/api/teams/test-invalid-timestamp-status/agents/status")
    
    assert response.status_code == 200
    data = response.json()
    
    # 無効なタイムスタンプのエージェントはofflineとして扱われる
    assert len(data["agents"]) == 1
    assert data["agents"][0]["name"] == "agent-invalid"
    assert data["agents"][0]["status"] == "offline"  # 無効なタイムスタンプ = offline
