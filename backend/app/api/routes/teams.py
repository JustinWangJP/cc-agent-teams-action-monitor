"""チーム関連の REST API エンドポイント。

チーム一覧、チーム詳細、チームインボックス、通信ネットワークデータの取得エンドポイントを提供します。
~/.claude/teams/ ディレクトリの config.json からデータを読み込みます。

"""
from typing import Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import json
from collections import defaultdict

from app.config import settings
from app.models.team import Team, TeamSummary, Member
from app.models.network import (
    NetworkData,
    AgentNode,
    CommunicationEdge,
    EdgeTypeCounts,
    NetworkMeta,
    NetworkTimeRange,
)

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


def get_model_color_and_icon(model: str) -> tuple[str, str]:
    """モデルIDから色とアイコンを取得するヘルパー関数。

    Claude Code Agent Teams のモデル設定に基づいて視覚的表現を返します。

    """
    model_lower = model.lower()

    # Anthropic Claude
    if "opus" in model_lower:
        return "#8B5CF6", "💎"  # violet-500
    if "sonnet" in model_lower:
        return "#3B82F6", "🔵"  # blue-500
    if "haiku" in model_lower:
        return "#10B981", "🍃"  # green-500

    # Moonshot AI
    if "kimi" in model_lower:
        return "#F59E0B", "🟡"  # amber-500

    # Zhipu AI
    if "glm" in model_lower:
        return "#EF4444", "🔴"  # red-500

    # デフォルト
    return "#6B7280", "🤖"  # gray-500


def parse_message_type(text: str) -> str:
    """メッセージ本文からプロトコルタイプを推定するヘルパー関数。

    JSON-in-JSON 形式のプロトコルメッセージを解析してタイプを判定します。

    """
    text = text.strip()

    # JSON形式かチェック
    if not text.startswith("{"):
        return "message"

    try:
        data = json.loads(text)
        msg_type = data.get("type", "").lower()

        # タイプ別の正規化
        if "idle" in msg_type:
            return "idle_notification"
        if "shutdown_request" in msg_type:
            return "shutdown_request"
        if "shutdown_response" in msg_type or "shutdown_approved" in msg_type:
            return "shutdown_response"
        if "plan_approval" in msg_type:
            return "plan_approval"

        return "message"
    except (json.JSONDecodeError, TypeError, AttributeError):
        return "message"


def get_dominant_type(types: dict[str, int]) -> str:
    """エッジの主要タイプを判定するヘルパー関数。

    カウントが最も多いメッセージタイプを返します。

    """
    return max(types.items(), key=lambda x: x[1])[0] if types else "message"


@router.get("/{team_name}/messages/network", response_model=NetworkData)
async def get_team_network(
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
):
    """チームのエージェント間通信ネットワークデータを取得するエンドポイント。

    インボックスメッセージを解析してノード（エージェント）とエッジ（通信関係）を構築し、
    D3.js フォースグラフ用のデータを返します。

    Args:
        team_name: チーム名
        start_time: フィルタ開始時刻（オプション）
        end_time: フィルタ終了時刻（オプション）

    Returns:
        NetworkData: ノード、エッジ、メタ情報を含むネットワークデータ

    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")

    # チーム設定とメンバー情報を取得
    config = get_team_config(team_dir)
    if not config:
        raise HTTPException(status_code=404, detail="Team config not found")

    members = {m["name"]: m for m in config.get("members", [])}

    # インボックスメッセージを取得
    inboxes = get_team_inboxes(team_dir)

    # エージェント別の統計を集計
    agent_stats: dict[str, dict[str, int]] = defaultdict(
        lambda: {"sent": 0, "received": 0, "total": 0}
    )

    # エッジ統計: "from->to" -> エッジデータ
    edge_stats: dict[
        str, dict[str, Any]
    ] = {}

    # タイムスタンプ範囲
    timestamps: list[str] = []
    total_messages = 0

    # 各インボックスを処理
    for agent_name, messages in inboxes.items():
        for msg in messages:
            # タイムフィルタ適用
            msg_timestamp = msg.get("timestamp", "")
            if not msg_timestamp:
                continue

            if start_time and msg_timestamp < start_time:
                continue
            if end_time and msg_timestamp > end_time:
                continue

            timestamps.append(msg_timestamp)
            total_messages += 1

            # 受信者を推定（inboxの所有者が受信者）
            from_agent = msg.get("from", "")
            to_agent = agent_name  # inboxファイル名 = 受信者

            if not from_agent:
                continue

            # 送信者カウント
            agent_stats[from_agent]["sent"] += 1
            agent_stats[from_agent]["total"] += 1

            # 受信者カウント
            agent_stats[to_agent]["received"] += 1
            agent_stats[to_agent]["total"] += 1

            # エッジ統計
            edge_key = f"{from_agent}->{to_agent}"
            if edge_key not in edge_stats:
                edge_stats[edge_key] = {
                    "source": from_agent,
                    "target": to_agent,
                    "count": 0,
                    "types": {
                        "message": 0,
                        "idle_notification": 0,
                        "shutdown_request": 0,
                        "shutdown_response": 0,
                        "plan_approval": 0,
                        "other": 0,
                    },
                    "lastTimestamp": msg_timestamp,
                }

            edge_stats[edge_key]["count"] += 1
            edge_stats[edge_key]["lastTimestamp"] = max(
                edge_stats[edge_key]["lastTimestamp"], msg_timestamp
            )

            # メッセージタイプを判定してカウント
            msg_text = msg.get("text", "")
            msg_type = parse_message_type(msg_text)

            if msg_type in edge_stats[edge_key]["types"]:
                edge_stats[edge_key]["types"][msg_type] += 1
            else:
                edge_stats[edge_key]["types"]["other"] += 1

    # ノードを構築
    nodes: list[AgentNode] = []
    for agent_id, stats in agent_stats.items():
        member = members.get(agent_id, {})
        model = member.get("model", "unknown")
        model_color, model_icon = get_model_color_and_icon(model)

        nodes.append(
            AgentNode(
                id=agent_id,
                label=agent_id,
                model=model,
                modelColor=model_color,
                modelIcon=model_icon,
                messageCount=stats["total"],
                sentCount=stats["sent"],
                receivedCount=stats["received"],
            )
        )

    # エッジを構築
    edges: list[CommunicationEdge] = []
    for edge_data in edge_stats.values():
        types_dict = edge_data["types"]
        edge_types = EdgeTypeCounts(**types_dict)

        edges.append(
            CommunicationEdge(
                source=edge_data["source"],
                target=edge_data["target"],
                count=edge_data["count"],
                types=edge_types,
                dominantType=get_dominant_type(types_dict),
                lastTimestamp=edge_data["lastTimestamp"],
            )
        )

    # メタデータを構築
    time_range = NetworkTimeRange(
        min=min(timestamps) if timestamps else "",
        max=max(timestamps) if timestamps else "",
    )

    meta = NetworkMeta(totalMessages=total_messages, timeRange=time_range)

    return NetworkData(nodes=nodes, edges=edges, teamName=team_name, meta=meta)
