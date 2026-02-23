"""チーム関連の REST API エンドポイント。

チーム一覧、チーム詳細、チームインボックスの取得エンドポイントを提供します。
~/.claude/teams/ ディレクトリの config.json からデータを読み込みます。

"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
import os
from datetime import datetime, timezone

from app.config import settings
from app.models.team import Team, TeamSummary, Member

router = APIRouter()


def get_team_config(team_dir: Path) -> dict | None:
    """チーム設定ファイル（config.json）を読み込むヘルパー関数。

    指定されたチームディレクトリ内の config.json を読み込み、辞書形式で返します。
    ファイルが存在しない場合は None を返します。

    Args:
        team_dir: チームディレクトリのパス

    Returns:
        設定データの辞書、または None

    """
    config_path = team_dir / "config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def get_team_inboxes(team_dir: Path) -> dict[str, list]:
    """チームの全インボックスファイルを読み込むヘルパー関数。

    指定されたチームの inboxes/ ディレクトリ内の全 JSON ファイルを読み込み、
    エージェント名をキー、メッセージリストを値とする辞書で返します。
    読み込みエラーが発生したファイルはログに出力してスキップします。

    Args:
        team_dir: チームディレクトリのパス

    Returns:
        エージェント名をキーとするメッセージリストの辞書

    """
    import logging
    logger = logging.getLogger(__name__)

    inboxes_dir = team_dir / "inboxes"
    inboxes = {}
    if inboxes_dir.exists():
        for inbox_file in inboxes_dir.glob("*.json"):
            try:
                with open(inbox_file, "r", encoding="utf-8") as f:
                    inboxes[inbox_file.stem] = json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                # TC-023: エラーハンドリング - 読み込みエラーをログに出力
                logger.warning(
                    f"Failed to read inbox file {inbox_file}: {e}",
                    extra={"file": str(inbox_file), "error": str(e)}
                )
                continue
    return inboxes


def get_team_task_count(team_name: str) -> int:
    """チームのタスク数を取得するヘルパー関数。

    ~/.claude/tasks/{team_name}/ ディレクトリ内のタスクファイル数を返します。

    Args:
        team_name: チーム名

    Returns:
        タスクファイル数

    """
    tasks_dir = settings.tasks_dir / team_name
    if tasks_dir.exists() and tasks_dir.is_dir():
        return sum(1 for f in tasks_dir.glob("*.json") if f.is_file())
    return 0


def _cwd_to_project_hash(cwd: str) -> str:
    """作業ディレクトリから project-hash を生成する。

    Args:
        cwd: 作業ディレクトリパス

    Returns:
        project-hash 文字列

    """
    return "-" + cwd.lstrip("/").replace("/", "-")


def _find_session_file(claude_dir: Path, config: dict) -> Optional[Path]:
    """チームのセッションログファイルを特定する。

    config.json から leadSessionId と cwd を取得し、セッションログを探す。
    leadSessionId に対応するファイルが存在しない場合は None を返す。
    （フォールバックは行わない - 別チームのセッションログを誤使用しないため）

    Args:
        claude_dir: ~/.claude ディレクトリのパス
        config: チーム設定辞書

    Returns:
        セッションファイルのパス（存在しない場合は None）

    """
    members = config.get("members", [])
    if not members:
        return None

    # 最初のメンバーの cwd を使用
    cwd = members[0].get("cwd")
    if not cwd:
        return None

    # project-hash に変換
    project_hash = _cwd_to_project_hash(cwd)
    project_dir = claude_dir / "projects" / project_hash

    if not project_dir.exists():
        return None

    # leadSessionId に対応するファイルを探す
    # 注意: フォールバックは行わない。セッションファイルが存在しない場合は None を返す。
    # これにより、セッションログがないチームは 'unknown' ステータスになる。
    lead_session_id = config.get("leadSessionId")
    if lead_session_id:
        session_file = project_dir / f"{lead_session_id}.jsonl"
        if session_file.exists():
            return session_file

    return None


def get_team_status(config: dict) -> str:
    """チームのステータスを判定する。

    判定基準:
    - members が存在しない → 'inactive'
    - members が存在する場合:
      - セッションログが存在しない → 'unknown'
      - セッションログの mtime が1時間超過 → 'stopped'
      - セッションログの mtime が1時間以内 → 'active'

    Args:
        config: チーム設定辞書

    Returns:
        ステータス文字列 ('active', 'inactive', 'stopped', 'unknown')

    """
    if not config.get("members"):
        return "inactive"

    # セッションログファイルを特定
    session_file = _find_session_file(settings.claude_dir, config)

    if not session_file:
        return "unknown"

    # セッションログの mtime を取得
    mtime = os.path.getmtime(session_file)
    mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
    now = datetime.now(timezone.utc)

    # 1時間（3600秒）を超過しているか判定
    if (now - mtime_dt).total_seconds() > 60 * 60:
        return "stopped"

    return "active"


@router.get("/", response_model=list[TeamSummary])
async def list_teams():
    """全チーム一覧を取得するエンドポイント。

    ~/.claude/teams/ ディレクトリ内の全チームの config.json を読み込み、
    TeamSummary 形式で返します。

    ステータス判定基準:
    - inactive: members が空
    - unknown: セッションログが存在しない
    - stopped: セッションログ mtime が1時間超過
    - active: セッションログ mtime が1時間以内

    Returns:
        list[TeamSummary]: チーム概要情報のリスト

    """
    teams = []
    if settings.teams_dir.exists():
        for team_dir in settings.teams_dir.iterdir():
            if team_dir.is_dir() and not team_dir.name.startswith("."):
                config = get_team_config(team_dir)
                if config:
                    team_name = config.get("name", team_dir.name)
                    status = get_team_status(config)
                    teams.append(TeamSummary(
                        name=team_name,
                        description=config.get("description", ""),
                        memberCount=len(config.get("members", [])),
                        taskCount=get_team_task_count(team_name),
                        status=status,
                        leadAgentId=config.get("leadAgentId", ""),
                        createdAt=config.get("createdAt"),
                    ))
    return teams


@router.get("/{team_name}", response_model=Team)
async def get_team(team_name: str):
    """指定チームの詳細を取得するエンドポイント。

    チーム名を指定してチーム設定とメンバーリストを取得し、Team 形式で返します。
    チームまたは設定ファイルが存在しない場合は 404 エラーを返します。

    Args:
        team_name: 取得対象のチーム名

    Returns:
        Team: チーム詳細情報

    Raises:
        HTTPException: チームが存在しない場合 (404)

    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    config = get_team_config(team_dir)
    if not config:
        raise HTTPException(status_code=404, detail="Team config not found")

    members = [Member(**m) for m in config.get("members", [])]
    return Team(
        name=config.get("name", team_name),
        description=config.get("description", ""),
        createdAt=config.get("createdAt", 0),
        leadAgentId=config.get("leadAgentId", ""),
        leadSessionId=config.get("leadSessionId", ""),
        members=members,
    )


@router.get("/{team_name}/inboxes")
async def get_team_inboxes_api(team_name: str):
    """チームのインボックスメッセージを取得するエンドポイント。

    指定されたチームの inboxes/ ディレクトリから全エージェントのメッセージを取得し、
    エージェント名をキーとする辞書形式で返します。チーム不存在時は 404 エラー。

    Args:
        team_name: チーム名

    Returns:
        dict: エージェント名をキーとするメッセージリストの辞書

    Raises:
        HTTPException: チームが存在しない場合 (404)

    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    return get_team_inboxes(team_dir)


@router.get("/{team_name}/inboxes/{agent_name}")
async def get_agent_inbox(team_name: str, agent_name: str):
    """特定エージェントのインボックスメッセージを取得するエンドポイント。

    指定されたチーム・エージェントのインボックスファイルからメッセージを取得し、
    JSON形式で返します。チームまたはファイルが存在しない場合は404エラー。

    Args:
        team_name: チーム名
        agent_name: エージェント名

    Returns:
        エージェントのインボックスメッセージリスト

    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    inbox_path = team_dir / "inboxes" / f"{agent_name}.json"
    if not inbox_path.exists():
        raise HTTPException(status_code=404, detail="Agent inbox not found")

    with open(inbox_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.delete("/{team_name}")
async def delete_team(team_name: str):
    """チームを削除するエンドポイント。

    指定されたチームと関連ファイルを削除します。
    削除できるのは「stopped」状態のチームのみです。

    削除対象:
    - teams/{team_name}/ ディレクトリ
    - tasks/{team_name}/ ディレクトリ
    - projects/{project_hash}/ ディレクトリ

    Args:
        team_name: 削除対象のチーム名

    Returns:
        dict: 削除結果（メッセージと削除パス一覧）

    Raises:
        HTTPException:
            - 404: チームが存在しない
            - 400: ステータスが stopped 以外
            - 500: 削除処理中にエラー

    """
    import shutil
    import logging

    logger = logging.getLogger(__name__)

    # チームの存在確認
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"チーム「{team_name}」が見つかりません"
        )

    # チーム設定取得
    config = get_team_config(team_dir)
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"チーム「{team_name}」の設定ファイルが見つかりません"
        )

    # ステータス確認（active 以外は削除可能）
    status = get_team_status(config)
    deletable_statuses = ["stopped", "inactive", "unknown"]
    if status not in deletable_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"このチームは削除できません。ステータスが「{status}」です。削除できるのは stopped, inactive, unknown 状態のチームのみです。"
        )

    deleted_paths = []

    try:
        # 1. teams/{team_name}/ を削除
        shutil.rmtree(team_dir)
        deleted_paths.append(str(team_dir))
        logger.info(f"Deleted team directory: {team_dir}")

        # 2. tasks/{team_name}/ を削除
        tasks_dir = settings.tasks_dir / team_name
        if tasks_dir.exists():
            shutil.rmtree(tasks_dir)
            deleted_paths.append(str(tasks_dir))
            logger.info(f"Deleted tasks directory: {tasks_dir}")

        # 3. セッションファイルのみ削除（プロジェクトディレクトリは残す）
        session_file = _find_session_file(settings.claude_dir, config)
        if session_file and session_file.exists():
            session_file.unlink()
            deleted_paths.append(str(session_file))
            logger.info(f"Deleted session file: {session_file}")

        return {
            "message": f"チーム「{team_name}」を削除しました",
            "deletedPaths": deleted_paths
        }

    except Exception as e:
        logger.error(f"Failed to delete team {team_name}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"チーム「{team_name}」の削除中にエラーが発生しました: {str(e)}"
        )
