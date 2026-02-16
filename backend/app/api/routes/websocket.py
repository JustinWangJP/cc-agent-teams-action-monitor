"""リアルタイム更新用の WebSocket エンドポイント。

ConnectionManager クラスで WebSocket 接続を管理し、チャンネル別のブロードキャスト機能を提供します。
dashboard チャンネルと tasks チャンネルでそれぞれチーム更新とタスク更新を配信します。

"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 接続を管理するマネージャークラス。

    チャンネル別に WebSocket 接続を管理し、接続の追加・削除、メッセージのブロードキャスト機能を提供します。
    dashboard チャンネルと tasks チャンネルがデフォルトで用意されています。


    """

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {
            "dashboard": [],
            "tasks": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """新しい WebSocket 接続を受け入れて登録します。

        指定されたチャンネルに WebSocket 接続を追加し、接続ログを出力します。
        チャンネルが存在しない場合は新規作成します。


        """
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
        client_host = websocket.client.host if websocket.client else "unknown"
        logger.info(f"WebSocket connected to channel: {channel} from {client_host}")

    def disconnect(self, websocket: WebSocket, channel: str):
        """指定されたチャンネルから WebSocket 接続を削除します。

        接続リストから WebSocket を削除し、切断ログを出力します。
        接続がリストに存在しない場合は何もしません。


        """
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
                logger.info(f"WebSocket disconnected from channel: {channel}")

    async def broadcast(self, channel: str, message: dict):
        """指定されたチャンネルの全接続にメッセージをブロードキャストします。

        チャンネル内の全 WebSocket に JSON メッセージを送信します。接続状態を確認し、
        切断された接続は自動的に削除します。エラー時も切断リストに追加されます。


        """
        if channel not in self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections[channel]:
            try:
                # 接続状態を確認してから送信
                if connection.application_state.CONNECTED:
                    await connection.send_json(message)
            except RuntimeError as e:
                # 接続が閉じている場合
                logger.debug(f"WebSocket already closed in channel {channel}: {e}")
                disconnected.append(connection)
            except Exception as e:
                # その他のエラー
                logger.warning(f"Error sending message to channel {channel}: {e}")
                disconnected.append(connection)

        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn, channel)

    async def broadcast_team_update(self, team_name: str, data: dict):
        """チーム更新メッセージを dashboard チャンネルにブロードキャストします。

        チーム名と更新データを含む team_update タイプのメッセージを送信します。
        FileWatcher がチーム設定の変更を検知した際に呼び出されます。


        """
        await self.broadcast("dashboard", {
            "type": "team_update",
            "team": team_name,
            "data": data
        })

    async def broadcast_task_update(self, team_name: str, task_id: str, data: dict):
        """タスク更新メッセージを tasks チャンネルにブロードキャストします。

        チーム名、タスクID、更新データを含む task_update タイプのメッセージを送信します。
        FileWatcher がタスクファイルの変更を検知した際に呼び出されます。


        """
        await self.broadcast("tasks", {
            "type": "task_update",
            "team": team_name,
            "task_id": task_id,
            "data": data
        })


# Global connection manager
manager = ConnectionManager()


@router.websocket("/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """リアルタイム更新を受け取る WebSocket エンドポイント。

        指定されたチャンネルに接続し、クライアントからのメッセージを待機します。
        ping メッセージには pong で応答し、切断時は自動的にクリーンアップします。


        """
    client_host = websocket.client.host if websocket.client else "unknown"

    try:
        await manager.connect(websocket, channel)
    except RuntimeError as e:
        # 接続が既に閉じている場合
        logger.warning(f"Failed to accept WebSocket connection from {client_host}: {e}")
        return

    try:
        while True:
            # Wait for any message (ping/pong or subscription)
            try:
                data = await websocket.receive_text()
            except WebSocketDisconnect:
                # 正常な切断
                logger.info(f"WebSocket client disconnected from channel: {channel}")
                break
            except RuntimeError as e:
                # 接続が閉じられた場合
                logger.debug(f"WebSocket connection closed unexpectedly: {e}")
                break

            try:
                message = json.loads(data)
                # Handle ping/pong for keepalive
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
            except json.JSONDecodeError:
                logger.debug(f"Received invalid JSON from client: {data[:100]}")
                pass
    except Exception as e:
        # 予期しないエラー
        logger.error(f"Unexpected WebSocket error in channel {channel}: {e}")
    finally:
        # 確実に切断処理を実行
        manager.disconnect(websocket, channel)


def get_manager() -> ConnectionManager:
    """グローバルな ConnectionManager インスタンスを取得します。

    アプリケーション全体で共有される単一の ConnectionManager インスタンスを返します。
    FileWatcher サービス等からブロードキャストする際に使用します。


    """
    return manager
