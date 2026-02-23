"""チーム関連の Pydantic データモデル。

Member、Team、TeamSummary の3つのモデルを定義し、
Claude Code Agent Teams のチーム構成管理をサポートします。

"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Member(BaseModel):
    """チームメンバーのデータモデル。

    エージェントID、名前、タイプ、モデル、参加日時、ステータス（active/idle）、
    色設定、tmux ペインID、作業ディレクトリ等を含みます。


    """

    agentId: str
    name: str
    agentType: str
    model: str = "unknown"
    joinedAt: int = 0
    tmuxPaneId: Optional[str] = ""
    cwd: str = ""
    subscriptions: list[str] = []
    color: Optional[str] = None
    status: str = "idle"  # active, idle
    lastActivity: Optional[datetime] = None
    prompt: Optional[str] = None  # エージェントのプロンプト
    backendType: Optional[str] = None  # バックエンドタイプ


class Team(BaseModel):
    """チームの完全なデータモデル。

    チーム名、説明、作成日時、リードエージェントID、セッションID、
    メンバーリストを含みます。Claude Code で作成されたチームの詳細情報です。


    """

    name: str
    description: Optional[str] = ""
    createdAt: int = 0
    leadAgentId: str
    leadSessionId: Optional[str] = ""
    members: list[Member] = []
    lastActivity: Optional[datetime] = None


class TeamSummary(BaseModel):
    """チーム一覧表示用のサマリーモデル。

    チーム名、説明、メンバー数、タスク数、ステータス、リードエージェントIDを含みます。
    一覧画面での高速表示に最適化された軽量モデルです。

    ステータス一覧:
    - active: セッションログ mtime ≤ 1時間
    - stopped: セッションログ mtime > 1時間
    - unknown: セッションログなし
    - inactive: members 空配列

    """

    name: str
    description: Optional[str] = ""
    memberCount: int
    taskCount: int = 0  # チームに関連するタスク数
    status: str  # active, inactive, stopped, unknown
    lastActivity: Optional[datetime] = None
    leadAgentId: str
    createdAt: Optional[int] = None  # 作成日時（Unixタイムスタンプ、ソート用）
