"""エージェント関連の REST API エンドポイント。

エージェントステータス、タイピングインジケーターの取得エンドポイントを提供します。
~/.claude/teams/{team_name}/inboxes/ ディレクトリからデータを読み込みます。

"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request
from pathlib import Path
import json

from app.config import settings
from app.models.agent import AgentStatus, AgentStatusList, TypingIndicators
from app.services.i18n_service import i18n

router = APIRouter()


# ステータス判定の閾値（秒）
ONLINE_THRESHOLD_SECONDS = 5 * 60  # 5分
IDLE_THRESHOLD_SECONDS = 30 * 60  # 30分


def parse_timestamp(timestamp_str: str) -> Optional[datetime]:
    """ISO 8601形式のタイムスタンプ文字列をdatetimeオブジェクトに変換します。

    Args:
        timestamp_str: ISO 8601形式のタイムスタンプ文字列

    Returns:
        datetimeオブジェクト、パース失敗時はNone

    """
    if not timestamp_str:
        return None

    try:
        # Python 3.11+ の fromisoformat はISO 8601をサポート
        # 'Z' サフィックスを '+00:00' に変換
        if timestamp_str.endswith("Z"):
            timestamp_str = timestamp_str[:-1] + "+00:00"
        return datetime.fromisoformat(timestamp_str)
    except (ValueError, AttributeError):
        return None


def get_team_inboxes(team_dir: Path) -> dict[str, list]:
    """チームの全インボックスファイルを読み込むヘルパー関数。

    指定されたチームの inboxes/ ディレクトリ内の全 JSON ファイルを読み込み、
    エージェント名をキー、メッセージリストを値とする辞書で返します。
    読み込みエラーが発生したファイルはログに出力してスキップします。

    Args:
        team_dir: チームディレクトリのパス

    Returns:
        エージェント名をキー、メッセージリストを値とする辞書

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
                    extra={"file": str(inbox_file), "error": str(e)},
                )
                continue
    return inboxes


def determine_agent_status(last_activity: Optional[datetime]) -> str:
    """最終アクティビティ時刻からエージェントのステータスを判定します。

    - online: 5分以内にメッセージ送信
    - idle: 5分〜30分以内
    - offline: 30分以上経過

    Args:
        last_activity: 最終アクティビティ時刻

    Returns:
        ステータス文字列 (online/idle/offline)

    """
    if last_activity is None:
        return "offline"

    now = datetime.now(last_activity.tzinfo)
    time_diff = (now - last_activity).total_seconds()

    if time_diff <= ONLINE_THRESHOLD_SECONDS:
        return "online"
    elif time_diff <= IDLE_THRESHOLD_SECONDS:
        return "idle"
    else:
        return "offline"


@router.get("/{team_name}/agents/status", response_model=AgentStatusList)
async def get_agents_status(request: Request, team_name: str):
    """チーム内の全エージェントステータスを取得するエンドポイント。

    インボックスメッセージのタイムスタンプを解析し、各エージェントの
    オンライン状態 (online/idle/offline) を判定して返します。

    Args:
        request: FastAPI リクエストオブジェクト（言語判定用）
        team_name: チーム名

    Returns:
        AgentStatusList: 全エージェントのステータスリスト

    Raises:
        HTTPException: チームが存在しない場合 (404)

    """
    lang = getattr(request.state, "language", "en")

    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=i18n.t("api.errors.team_not_found", lang=lang, team=team_name),
        )

    # インボックスメッセージを取得
    inboxes = get_team_inboxes(team_dir)

    # エージェント別の最終アクティビティ時刻を集計
    agent_last_activity: dict[str, Optional[datetime]] = {}

    # 送信者としてのアクティビティを記録
    for agent_name, messages in inboxes.items():
        for msg in messages:
            from_agent = msg.get("from", "")
            if from_agent:
                timestamp_str = msg.get("timestamp", "")
                timestamp = parse_timestamp(timestamp_str)

                if timestamp:
                    if from_agent not in agent_last_activity:
                        agent_last_activity[from_agent] = timestamp
                    else:
                        # 最新の時刻を保持（Noneチェック付き）
                        existing = agent_last_activity[from_agent]
                        if existing is None or timestamp > existing:
                            agent_last_activity[from_agent] = timestamp

    # インボックス所有者（受信者）もエージェントとして追加
    for agent_name in inboxes.keys():
        if agent_name not in agent_last_activity:
            agent_last_activity[agent_name] = None

    # ステータスリストを構築
    agents = []
    for agent_name, last_activity in sorted(agent_last_activity.items()):
        status = determine_agent_status(last_activity)
        agents.append(
            AgentStatus(
                name=agent_name,
                status=status,
                lastActivity=last_activity,
            )
        )

    return AgentStatusList(agents=agents)


@router.get("/{team_name}/agents/typing", response_model=TypingIndicators)
async def get_typing_indicators(request: Request, team_name: str):
    """現在入力中のエージェントリストを取得するエンドポイント。

    現在の実装では空のリストを返します。
    将来的には、エージェントの入力状態を検出して返すよう拡張可能です。

    Args:
        request: FastAPI リクエストオブジェクト（言語判定用）
        team_name: チーム名

    Returns:
        TypingIndicators: 入力中のエージェント名のリスト

    Raises:
        HTTPException: チームが存在しない場合 (404)

    """
    lang = getattr(request.state, "language", "en")

    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=i18n.t("api.errors.team_not_found", lang=lang, team=team_name),
        )

    # 現時点では実際のタイピング状態を検出する手段がないため
    # 空のリストを返す
    # 将来的には、エージェントからのステータス報告や
    # 最近のメッセージパターン分析等で実装可能
    return TypingIndicators(typing=[])
