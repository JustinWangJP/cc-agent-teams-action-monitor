"""タスク関連の REST API エンドポイント。

全タスク一覧、チーム別タスク一覧、特定タスク詳細の取得エンドポイントを提供します。
~/.claude/tasks/ ディレクトリの JSON ファイルからデータを読み込みます。

"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from app.config import settings
from app.models.task import Task, TaskSummary

router = APIRouter()


def read_task_file(task_path: Path) -> dict | None:
    """タスク JSON ファイルを読み込むヘルパー関数。

    指定されたパスの JSON ファイルを読み込み、辞書形式で返します。
    ファイルが存在しない、または JSON 形式でない場合は None を返します。


    """
    if task_path.exists() and task_path.suffix == ".json":
        with open(task_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


@router.get("/", response_model=list[TaskSummary])
async def list_tasks():
    """全チームの全タスク一覧を取得するエンドポイント。

    ~/.claude/tasks/ ディレクトリ内の全チームのタスクを読み込み、
    TaskSummary 形式で返します。チーム名も各タスクに含まれます。


    """
    tasks = []
    if settings.tasks_dir.exists():
        for team_task_dir in settings.tasks_dir.iterdir():
            if team_task_dir.is_dir() and not team_task_dir.name.startswith("."):
                for task_file in team_task_dir.glob("*.json"):
                    if task_file.name != ".lock":
                        task_data = read_task_file(task_file)
                        if task_data:
                            tasks.append(TaskSummary(
                                id=task_data.get("id", task_file.stem),
                                subject=task_data.get("subject", ""),
                                status=task_data.get("status", "pending"),
                                owner=task_data.get("owner"),
                                blockedCount=len(task_data.get("blockedBy", [])),
                                teamName=team_task_dir.name,
                            ))
    return tasks


@router.get("/team/{team_name}", response_model=list[Task])
async def list_team_tasks(team_name: str):
    """指定チームのタスク一覧を取得するエンドポイント。

    指定されたチーム名のタスクディレクトリから全タスクを読み込み、
    Task 形式（詳細版）で返します。チームが存在しない場合は 404 エラー。


    """
    tasks = []
    team_task_dir = settings.tasks_dir / team_name
    if not team_task_dir.exists():
        raise HTTPException(status_code=404, detail="Team tasks not found")

    for task_file in team_task_dir.glob("*.json"):
        if task_file.name != ".lock":
            task_data = read_task_file(task_file)
            if task_data:
                tasks.append(Task(**task_data))
    return tasks


@router.get("/{task_id}")
async def get_task(task_id: str, team_name: str | None = None):
    """特定のタスク詳細を取得するエンドポイント。

    タスクIDを指定してタスク詳細を取得します。team_name が指定された場合は
    そのチーム内で検索し、未指定の場合は全チームから検索します。


    """
    if team_name:
        team_task_dir = settings.tasks_dir / team_name
        if team_task_dir.exists():
            task_path = team_task_dir / f"{task_id}.json"
            task_data = read_task_file(task_path)
            if task_data:
                return task_data
    else:
        # Search all teams
        for team_task_dir in settings.tasks_dir.iterdir():
            if team_task_dir.is_dir():
                task_path = team_task_dir / f"{task_id}.json"
                task_data = read_task_file(task_path)
                if task_data:
                    task_data["teamName"] = team_task_dir.name
                    return task_data

    raise HTTPException(status_code=404, detail="Task not found")
