"""タスク関連の Pydantic データモデル。

Task、TaskSummary、TaskUpdate の3つのモデルを定義し、
チーム内のタスク管理と状態追跡をサポートします。

"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Task(BaseModel):
    """タスクの完全なデータモデル。

    タスクのID、件名、説明、ステータス、担当者、依存関係（blocks/blockedBy）、
    メタデータを含みます。ステータスは pending/in_progress/completed/deleted です。


    """

    id: str
    subject: str
    description: Optional[str] = ""
    activeForm: str = ""
    status: str  # pending, in_progress, completed, deleted, stopped
    owner: Optional[str] = None
    blocks: list[str] = []
    blockedBy: list[str] = []
    metadata: dict = {}


class TaskSummary(BaseModel):
    """タスク一覧表示用のサマリーモデル。

    タスクID、件名、ステータス、担当者、依存タスク数、チーム名を含みます。
    一覧画面での高速表示に最適化された軽量モデルです。


    """

    id: str
    subject: str
    status: str
    owner: Optional[str] = None
    blockedCount: int
    teamName: Optional[str] = None


class TaskUpdate(BaseModel):
    """タスク更新イベントのデータモデル。

    タスクID、チーム名、新しいステータス、変更前ステータス、タイムスタンプを含みます。
    ポーリングによるデータ取得時に変更検知に使用します。


    """

    taskId: str
    teamName: str
    status: str
    previousStatus: Optional[str] = None
    timestamp: datetime
