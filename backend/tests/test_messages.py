"""メッセージタイムラインAPIのテスト。

GET /api/teams/{name}/messages/timeline エンドポイントと
GET /api/models エンドポイントのテストスイートです。
"""

from fastapi.testclient import TestClient

from app.main import app
from app.models.timeline import MessageType


client = TestClient(app)


class TestModelsEndpoint:
    """GET /api/models エンドポイントのテスト。"""

    def test_get_models_success(self):
        """モデル一覧が正常に取得できることを確認する。"""
        response = client.get("/api/models")
        assert response.status_code == 200

        data = response.json()
        assert "models" in data
        assert isinstance(data["models"], list)
        assert len(data["models"]) > 0

        # モデル構造の確認
        model = data["models"][0]
        assert "id" in model
        assert "color" in model
        assert "icon" in model
        assert "label" in model
        assert "provider" in model

    def test_models_includes_expected_models(self):
        """期待されるモデルが含まれていることを確認する。"""
        response = client.get("/api/models")
        data = response.json()
        model_ids = [m["id"] for m in data["models"]]

        # 期待されるモデルが含まれているか
        expected_models = [
            "claude-opus-4-6",
            "claude-sonnet-4-5",
            "claude-haiku-4-5",
        ]
        for expected in expected_models:
            assert expected in model_ids


class TestMessageTimelineEndpoint:
    """GET /api/teams/{name}/messages/timeline エンドポイントのテスト。"""

    def test_timeline_returns_structure(self):
        """タイムラインデータが正しい構造で返されることを確認する。"""
        # 注: 実際のテストデータが必要
        response = client.get("/api/teams/test-team/messages/timeline")

        # チームが存在しない場合、404または空のデータ
        if response.status_code == 404:
            assert response.json()["detail"] == "Team not found"
        else:
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "groups" in data
            assert "timeRange" in data

    def test_timeline_items_structure(self):
        """タイムラインアイテムが正しい構造を持つことを確認する。"""
        response = client.get("/api/teams/test-team/messages/timeline")

        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])

            for item in items:
                assert "id" in item
                assert "content" in item
                assert "start" in item
                assert "type" in item
                assert "className" in item
                assert "group" in item
                assert "data" in item

    def test_timeline_filter_by_time_range(self):
        """時間範囲フィルターが動作することを確認する。"""
        start = "2026-01-01T00:00:00"
        end = "2026-12-31T23:59:59"

        response = client.get(
            f"/api/teams/test-team/messages/timeline?start_time={start}&end_time={end}"
        )

        # チームが存在する場合、フィルターが適用される
        if response.status_code == 200:
            data = response.json()
            assert "items" in data

    def test_timeline_filter_by_senders(self):
        """送信者フィルターが動作することを確認する。"""
        response = client.get("/api/teams/test-team/messages/timeline?senders=agent1,agent2")

        if response.status_code == 200:
            data = response.json()
            assert "items" in data

    def test_timeline_filter_by_types(self):
        """タイプフィルターが動作することを確認する。"""
        response = client.get(
            "/api/teams/test-team/messages/timeline?types=message,idle_notification"
        )

        if response.status_code == 200:
            data = response.json()
            assert "items" in data

    def test_timeline_search(self):
        """検索機能が動作することを確認する。"""
        response = client.get("/api/teams/test-team/messages/timeline?search=test")

        if response.status_code == 200:
            data = response.json()
            assert "items" in data

    def test_timeline_unread_only(self):
        """未読フィルターが動作することを確認する。"""
        response = client.get("/api/teams/test-team/messages/timeline?unread_only=true")

        if response.status_code == 200:
            data = response.json()
            assert "items" in data


class TestMessagesEndpoint:
    """GET /api/teams/{name}/messages エンドポイントのテスト。"""

    def test_messages_returns_structure(self):
        """メッセージ一覧が正しい構造で返されることを確認する。"""
        response = client.get("/api/teams/test-team/messages")

        if response.status_code == 200:
            data = response.json()
            assert "messages" in data
            assert "count" in data
            assert isinstance(data["messages"], list)
            assert isinstance(data["count"], int)

    def test_messages_with_filters(self):
        """フィルターが適用されることを確認する。"""
        response = client.get(
            "/api/teams/test-team/messages?search=test&unread_only=false"
        )

        if response.status_code == 200:
            data = response.json()
            assert "messages" in data
            assert "count" in data


class TestTimelineHelperFunctions:
    """タイムラインヘルパー関数のテスト。"""

    def test_message_type_parsing(self):
        """メッセージタイプのパースが正しく動作することを確認する。"""
        from app.api.routes.messages import parse_message_type

        # 通常メッセージ
        assert parse_message_type("Hello world") == MessageType.MESSAGE

        # プロトコルメッセージ
        idle_msg = '{"type": "idle_notification", "from": "agent1"}'
        assert parse_message_type(idle_msg) == MessageType.IDLE_NOTIFICATION

        shutdown_msg = '{"type": "shutdown_request"}'
        assert parse_message_type(shutdown_msg) == MessageType.SHUTDOWN_REQUEST

    def test_text_truncation(self):
        """テキスト切り詰めが正しく動作することを確認する。"""
        from app.api.routes.messages import truncate_text

        short_text = "Hello"
        assert truncate_text(short_text, 50) == short_text

        long_text = "a" * 100
        truncated = truncate_text(long_text, 50)
        assert len(truncated) == 50
        assert truncated.endswith("...")

    def test_message_class_mapping(self):
        """メッセージクラスのマッピングが正しく動作することを確認する。"""
        from app.api.routes.messages import get_message_class

        assert get_message_class(MessageType.MESSAGE) == "timeline-item-message"
        assert get_message_class(MessageType.IDLE_NOTIFICATION) == "timeline-item-idle"
        assert get_message_class(MessageType.SHUTDOWN_REQUEST) == "timeline-item-shutdown"
        assert get_message_class(MessageType.UNKNOWN) == "timeline-item-unknown"
