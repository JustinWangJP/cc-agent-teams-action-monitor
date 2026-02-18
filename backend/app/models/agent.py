"""エージェント関連の Pydantic データモデル。

AgentStatus、AgentStatusList、TypingIndicators のモデルを定義し、
エージェントのオンライン状態判定とタイピングインジケーターをサポートします。

"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class AgentStatus(BaseModel):
    """個別エージェントのステータスモデル。

    エージェント名、オンライン状態、最終アクティビティ時刻を含みます。
    ステータスは最終アクティビティ時刻から自動判定されます。

    Attributes:
        name: エージェント名
        status: オンライン状態 (online/idle/offline)
        lastActivity: 最終アクティビティ時刻 (ISO 8601形式)

    """

    name: str
    status: str = Field(..., description="online | idle | offline")
    lastActivity: Optional[datetime] = None


class AgentStatusList(BaseModel):
    """チーム内の全エージェントステータスリスト。

    複数のエージェントステータスを含むレスポンスモデルです。

    Attributes:
        agents: エージェントステータスのリスト

    """

    agents: list[AgentStatus] = []


class TypingIndicators(BaseModel):
    """タイピングインジケーターのレスポンスモデル。

    現在入力中のエージェント名のリストを含みます。

    Attributes:
        typing: 入力中のエージェント名のリスト

    """

    typing: list[str] = []
