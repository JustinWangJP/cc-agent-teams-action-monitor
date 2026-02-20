"""タイムライン用 Pydantic データモデル。

メッセージタイムライン表示のためのモデルを定義します。
vis-timeline と連携するためのデータ構造を提供します。
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum


class MessageType(str, Enum):
    """メッセージタイプの列挙型。

    Agent Teams で使用されるプロトコルメッセージの種類を定義します。
    """

    MESSAGE = "message"
    IDLE_NOTIFICATION = "idle_notification"
    SHUTDOWN_REQUEST = "shutdown_request"
    SHUTDOWN_APPROVED = "shutdown_approved"
    SHUTDOWN_RESPONSE = "shutdown_response"
    PLAN_APPROVAL_REQUEST = "plan_approval_request"
    PLAN_APPROVAL_RESPONSE = "plan_approval_response"
    TASK_ASSIGNMENT = "task_assignment"
    UNKNOWN = "unknown"


class TimelineItem(BaseModel):
    """タイムラインアイテムのデータモデル。

    vis-timeline で表示する各メッセージのデータを表します。
    グループ（送信者）ごとに時系列表示されます。
    """

    id: str
    content: str
    start: str  # ISO 8601形式のタイムスタンプ
    type: Literal["box", "point"] = "box"
    className: str = "timeline-item"
    group: str  # 送信者名
    data: dict  # 元メッセージデータ


class TimelineGroup(BaseModel):
    """タイムライングループのデータモデル。

    送信者（エージェント）ごとのグループ情報を表します。
    """

    id: str
    content: str
    className: Optional[str] = "timeline-group"


class TimelineData(BaseModel):
    """タイムラインデータのレスポンスモデル。

    アイテムリスト、グループリスト、時間範囲を含む完全なタイムラインデータです。
    ページネーション情報も含みます。
    """

    items: list[TimelineItem]
    groups: list[TimelineGroup]
    timeRange: dict[str, str]  # {"min": "ISO", "max": "ISO"}
    count: int = Field(default=0, description="現在のページのアイテム数")
    total: int = Field(default=0, description="フィルタ後の総アイテム数")
    hasMore: bool = Field(default=False, description="さらにアイテムがあるか")


class MessageFilter(BaseModel):
    """メッセージフィルターのデータモデル。

    タイムライン表示時のフィルター条件を表します。
    クエリパラメータからの変換に使用します。
    """

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    senders: Optional[list[str]] = None
    types: Optional[list[MessageType]] = None
    search: Optional[str] = None
    unread_only: bool = False
