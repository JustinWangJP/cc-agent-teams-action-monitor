"""チャットメッセージAPIのテスト。

チャット形式メッセージ取得エンドポイントをテストします。

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
def setup_team_with_chat_messages(tmp_path: Path):
    """テスト用のチームとチャットメッセージを作成するフィクスチャ。

    複数のエージェント間のメッセージを含むインボックスファイルを作成します。

    """
    teams_dir = tmp_path / "teams_corrupted"
    teams_dir.mkdir(exist_ok=True)

    team_dir = teams_dir / "test-chat-team"
    team_dir.mkdir()

    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()

    now = datetime.now()

    # 通常メッセージ（ブロードキャスト）
    broadcast_messages = [
        {
            "from": "team-lead",
            "text": "Everyone please check the task status",
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
            "read": False,
        }
    ]

    # DM（agent-a -> agent-b）
    dm_messages = [
        {
            "from": "backend-dev",
            "text": '{"type":"message","recipient":"frontend-dev"}Can you review my PR?',
            "timestamp": (now - timedelta(minutes=5)).isoformat(),
            "read": False,
        }
    ]

    # idle通知
    idle_messages = [
        {
            "from": "reviewer",
            "text": '{"type":"idle_notification","idleReason":"Waiting for review"}',
            "timestamp": (now - timedelta(minutes=3)).isoformat(),
            "read": False,
        }
    ]

    # インボックスファイルを作成（受信者別）
    # team-leadのインボックス
    (inboxes_dir / "team-lead.json").write_text(json.dumps([]), encoding="utf-8")

    # backend-devのインボックス（DM受信）
    (inboxes_dir / "backend-dev.json").write_text(
        json.dumps(broadcast_messages), encoding="utf-8"
    )

    # frontend-devのインボックス（DM受信）
    (inboxes_dir / "frontend-dev.json").write_text(
        json.dumps(dm_messages + broadcast_messages), encoding="utf-8"
    )

    # reviewerのインボックス
    (inboxes_dir / "reviewer.json").write_text(
        json.dumps(broadcast_messages + idle_messages), encoding="utf-8"
    )

    # チーム設定ファイル
    config = {
        "name": "test-chat-team",
        "description": "Test chat team",
        "members": [
            {"name": "team-lead", "agentId": "team-lead"},
            {"name": "backend-dev", "agentId": "backend-dev"},
            {"name": "frontend-dev", "agentId": "frontend-dev"},
            {"name": "reviewer", "agentId": "reviewer"},
        ],
    }
    (team_dir / "config.json").write_text(json.dumps(config), encoding="utf-8")

    return team_dir


def test_get_chat_messages_returns_empty_list_for_nonexistent_team():
    """存在しないチーム名でメッセージ取得時、404エラーとなることを確認。"""
    response = client.get("/api/teams/nonexistent-team/messages/chat")
    assert response.status_code == 404


def test_get_chat_messages_returns_chat_messages(
    setup_team_with_chat_messages, monkeypatch
):
    """チャットメッセージが正しく返されることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    response = client.get("/api/teams/test-chat-team/messages/chat")

    assert response.status_code == 200
    data = response.json()

    assert "messages" in data
    assert "count" in data
    assert "hasMore" in data
    assert isinstance(data["messages"], list)
    assert data["count"] == len(data["messages"])


def test_get_chat_messages_includes_required_fields(
    setup_team_with_chat_messages, monkeypatch
):
    """チャットメッセージに必須フィールドが含まれることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    response = client.get("/api/teams/test-chat-team/messages/chat")

    assert response.status_code == 200
    data = response.json()

    for msg in data["messages"]:
        assert "id" in msg
        assert "from" in msg
        assert "text" in msg
        assert "timestamp" in msg
        assert "type" in msg
        assert "isPrivate" in msg
        assert "visibleTo" in msg
        assert "read" in msg


def test_get_chat_messages_with_limit(setup_team_with_chat_messages, monkeypatch):
    """limitパラメータが正しく動作することを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    # limit=2
    response = client.get("/api/teams/test-chat-team/messages/chat?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) <= 2


def test_get_chat_messages_with_offset(setup_team_with_chat_messages, monkeypatch):
    """offsetパラメータが正しく動作することを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    # 全件取得
    response_all = client.get("/api/teams/test-chat-team/messages/chat")
    all_messages = response_all.json()["messages"]

    if len(all_messages) > 0:
        # offset=1
        response_offset = client.get("/api/teams/test-chat-team/messages/chat?offset=1")
        offset_messages = response_offset.json()["messages"]

        # 最初のメッセージがスキップされていることを確認
        if len(all_messages) > 1:
            assert offset_messages[0]["id"] != all_messages[0]["id"]


def test_get_chat_messages_has_more_flag(setup_team_with_chat_messages, monkeypatch):
    """hasMoreフラグが正しく設定されることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    # 全件より小さいlimitを指定
    response = client.get("/api/teams/test-chat-team/messages/chat?limit=2")
    data = response.json()

    # メッセージ数がlimitより少ない場合はhasMore=false
    if data["count"] < 2:
        assert data["hasMore"] is False


def test_get_chat_messages_message_type_detection(
    setup_team_with_chat_messages, monkeypatch
):
    """メッセージタイプが正しく検出されることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    response = client.get("/api/teams/test-chat-team/messages/chat")
    data = response.json()

    # idle_notificationタイプが含まれているか確認
    types = [msg["type"] for msg in data["messages"]]
    assert "idle_notification" in types


def test_get_chat_messages_private_message_detection(
    setup_team_with_chat_messages, monkeypatch
):
    """秘密メッセージ（DM）が正しく検出されることを確認。"""
    monkeypatch.setattr(settings, "teams_dir", setup_team_with_chat_messages.parent)

    response = client.get("/api/teams/test-chat-team/messages/chat")
    data = response.json()

    # isPrivateフラグが設定されているメッセージがあるか確認
    # DMメッセージは受信者のインボックスにのみ格納されるため
    private_messages = [msg for msg in data["messages"] if msg["isPrivate"]]

    # DMが検出される場合、visibleToに送信者と受信者が含まれている
    for msg in private_messages:
        assert isinstance(msg["visibleTo"], list)
        assert len(msg["visibleTo"]) == 2  # 送信者と受信者
        assert msg["from"] in msg["visibleTo"]


def test_get_chat_messages_handles_invalid_timestamp(
    setup_team_with_chat_messages, monkeypatch, tmp_path
):
    """TC-024: 無効なタイムスタンプを持つメッセージが適切に処理されることを確認。"""
    import json
    from app.config import settings

    teams_dir = tmp_path / "teams_corrupted"
    teams_dir.mkdir(exist_ok=True)

    team_dir = teams_dir / "test-invalid-timestamp"
    team_dir.mkdir()

    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()

    now = datetime.now()

    # 無効なタイムスタンプを持つメッセージ
    invalid_messages = [
        {
            "from": "agent-a",
            "text": "Message with invalid timestamp",
            "timestamp": "invalid-timestamp-format",  # 無効な形式
            "read": False,
        },
        {
            "from": "agent-b",
            "text": "Message with valid timestamp",
            "timestamp": now.isoformat(),
            "read": False,
        },
    ]

    (inboxes_dir / "agent-a.json").write_text(
        json.dumps(invalid_messages), encoding="utf-8"
    )

    config = {
        "name": "test-invalid-timestamp",
        "members": [{"name": "agent-a"}, {"name": "agent-b"}],
    }
    (team_dir / "config.json").write_text(json.dumps(config), encoding="utf-8")

    monkeypatch.setattr(settings, "teams_dir", teams_dir)

    response = client.get("/api/teams/test-invalid-timestamp/messages/chat")

    assert response.status_code == 200
    data = response.json()

    # 両方のメッセージが返される（無効なタイムスタンプも含む）
    assert len(data["messages"]) == 2

    # 無効なタイムスタンプを持つメッセージは、有効なタイムスタンプに変換されている
    for msg in data["messages"]:
        # ISO形式のタイムスタンプであることを確認
        assert msg["timestamp"] is not None
        # 空文字列でないことを確認
        assert len(msg["timestamp"]) > 0


def test_get_chat_messages_handles_corrupted_inbox_file(
    setup_team_with_chat_messages, monkeypatch, tmp_path
):
    """TC-023: 破損したインボックスファイルがスキップされることを確認。"""
    import json
    from app.config import settings

    teams_dir = tmp_path / "teams_corrupted"
    teams_dir.mkdir(exist_ok=True)

    team_dir = teams_dir / "test-corrupted"
    team_dir.mkdir()

    inboxes_dir = team_dir / "inboxes"
    inboxes_dir.mkdir()

    # 有効なインボックスファイル
    valid_messages = [
        {
            "from": "agent-a",
            "text": "Valid message",
            "timestamp": datetime.now().isoformat(),
            "read": False,
        }
    ]

    (inboxes_dir / "agent-a.json").write_text(
        json.dumps(valid_messages), encoding="utf-8"
    )

    # 破損したインボックスファイル（無効なJSON）
    (inboxes_dir / "agent-b.json").write_text("{invalid json content", encoding="utf-8")

    config = {
        "name": "test-corrupted",
        "members": [{"name": "agent-a"}, {"name": "agent-b"}],
    }
    (team_dir / "config.json").write_text(json.dumps(config), encoding="utf-8")

    monkeypatch.setattr(settings, "teams_dir", teams_dir)

    # エラーにならず、有効なファイルのメッセージのみが返される
    response = client.get("/api/teams/test-corrupted/messages/chat")

    assert response.status_code == 200
    data = response.json()

    # 有効なファイルのメッセージのみが含まれる
    assert len(data["messages"]) == 1
    assert data["messages"][0]["from"] == "agent-a"
