"""チーム関連の REST API エンドポイント。

チーム一覧、チーム詳細、チームインボックスの取得エンドポイントを提供します。
~/.claude/teams/ ディレクトリの config.json からデータを読み込みます。

"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

from app.config import settings
from app.models.team import Team, TeamSummary, Member

router = APIRouter()


def get_team_config(team_dir: Path) -> dict | None:
    """チーム設定ファイル（config.json）を読み込むヘルパー関数。

    指定されたチームディレクトリ内の config.json を読み込み、辞書形式で返します。
    ファイルが存在しない場合は None を返します。


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


    """
    inboxes_dir = team_dir / "inboxes"
    inboxes = {}
    if inboxes_dir.exists():
        for inbox_file in inboxes_dir.glob("*.json"):
            with open(inbox_file, "r", encoding="utf-8") as f:
                inboxes[inbox_file.stem] = json.load(f)
    return inboxes


@router.get("/", response_model=list[TeamSummary])
async def list_teams():
    """全チーム一覧を取得するエンドポイント。

    ~/.claude/teams/ ディレクトリ内の全チームの config.json を読み込み、
    TeamSummary 形式で返します。メンバーがいれば active、いなければ inactive。


    """
    teams = []
    if settings.teams_dir.exists():
        for team_dir in settings.teams_dir.iterdir():
            if team_dir.is_dir() and not team_dir.name.startswith("."):
                config = get_team_config(team_dir)
                if config:
                    teams.append(TeamSummary(
                        name=config.get("name", team_dir.name),
                        description=config.get("description", ""),
                        memberCount=len(config.get("members", [])),
                        status="active" if config.get("members") else "inactive",
                        leadAgentId=config.get("leadAgentId", ""),
                    ))
    return teams


@router.get("/{team_name}", response_model=Team)
async def get_team(team_name: str):
    """指定チームの詳細を取得するエンドポイント。

    チーム名を指定してチーム設定とメンバーリストを取得し、Team 形式で返します。
    チームまたは設定ファイルが存在しない場合は 404 エラーを返します。


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


    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    return get_team_inboxes(team_dir)
