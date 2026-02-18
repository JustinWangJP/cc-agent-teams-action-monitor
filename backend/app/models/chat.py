"""チャット形式メッセージ関連の Pydantic データモデル。

チャットタイムライン表示用のメッセージモデルを定義します。

"""
from datetime import datetime
from typing import Optional, Any, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """チャット形式メッセージのデータモデル。

    送信者、受信者、メッセージ本文、タイムスタンプ、メッセージタイプ、
    秘密メッセージフラグ等を含みます。

    Attributes:
        id: メッセージ一意ID
        from: 送信者エージェント名
        to: 受信者エージェント名（特定受信者がいる場合）
        text: メッセージ本文
        summary: メッセージ要約
        timestamp: タイムスタンプ (ISO 8601形式)
        type: メッセージタイプ
        isPrivate: 秘密メッセージ（DM）かどうか
        visibleTo: 閲覧可能なエージェント名リスト
        read: 既読フラグ

    """

    id: str
    from_: str = Field(alias="from")
    to: Optional[str] = None
    text: str
    summary: Optional[str] = None
    timestamp: str
    type: str = "message"
    isPrivate: bool = False
    visibleTo: list[str] = []
    read: bool = False
    color: Optional[str] = None

    model_config = {"populate_by_name": True}


class ChatMessageList(BaseModel):
    """チャットメッセージリストのレスポンスモデル。

    複数のチャットメッセージとメタ情報を含みます。

    Attributes:
        messages: チャットメッセージのリスト
        count: メッセージ数
        hasMore: さらにメッセージがあるかどうか

    """

    messages: list[ChatMessage] = []
    count: int = 0
    hasMore: bool = False
