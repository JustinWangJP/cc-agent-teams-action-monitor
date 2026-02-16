"""メッセージ関連の Pydantic データモデル。

InboxMessage、ProtocolMessage、ActivityEvent の3つのモデルを定義し、
エージェント間通信とアクティビティフィードをサポートします。

"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class InboxMessage(BaseModel):
        """インボックスメッセージのデータモデル。

        送信者（from）、メッセージ本文、要約、タイムスタンプ、色設定、
        既読フラグを含みます。エージェント間のメッセージ通信に使用します。


        """

        from_: str = Field(alias="from")
        text: str
        summary: Optional[str] = None
        timestamp: str
        color: Optional[str] = None
        read: bool = False

        model_config = {"populate_by_name": True}


class ProtocolMessage(BaseModel):
        """プロトコルメッセージのデータモデル。

        メッセージタイプ、送信者、タイムスタンプ、リクエストID、アイドル理由等を含みます。
        Claude Code エージェント間の JSON-in-JSON 通信に使用します。


        """

        type: str
        from_: Optional[str] = Field(None, alias="from")
        timestamp: Optional[str] = None
        requestId: Optional[str] = None
        idleReason: Optional[str] = None
        reason: Optional[str] = None

        model_config = {"populate_by_name": True}


class ActivityEvent(BaseModel):
    """アクティビティイベントのデータモデル。

    イベントID、タイプ（message/task_update/member_join/member_leave）、チーム名、
    エージェント名、コンテンツ、タイムスタンプ、メタデータを含みます。


    """

    id: str
    type: str  # message, task_update, member_join, member_leave
    teamName: str
    agentName: str
    content: str
    timestamp: datetime
    metadata: dict[str, Any] = {}
