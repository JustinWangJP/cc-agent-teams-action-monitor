"""メッセージタイムラインの REST API エンドポイント。

メッセージのタイムライン表示、フィルタリング、検索機能を提供します。
"""

from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import json
from datetime import datetime
from typing import Optional, Literal

from app.config import settings
from app.models.timeline import TimelineData, TimelineItem, TimelineGroup, MessageType
from app.models.model import ModelListResponse, ModelConfig
from app.models.network import (
    NetworkData,
    AgentNode,
    CommunicationEdge,
    EdgeTypeCounts,
    NetworkMeta,
    NetworkTimeRange,
)

router = APIRouter()


# ============================================================================
# モデル設定定義
# ============================================================================

MODEL_CONFIGS = [
    ModelConfig(
        id="claude-opus-4-6",
        color="#8B5CF6",
        icon="🟣",
        label="Opus 4.6",
        provider="anthropic",
    ),
    ModelConfig(
        id="claude-sonnet-4-5",
        color="#3B82F6",
        icon="🔵",
        label="Sonnet 4.5",
        provider="anthropic",
    ),
    ModelConfig(
        id="claude-sonnet-4-5-20250929",
        color="#3B82F6",
        icon="🔵",
        label="Sonnet 4.5",
        provider="anthropic",
    ),
    ModelConfig(
        id="claude-haiku-4-5-20251001",
        color="#10B981",
        icon="🟢",
        label="Haiku 4.5",
        provider="anthropic",
    ),
    ModelConfig(
        id="claude-haiku-4-5",
        color="#10B981",
        icon="🟢",
        label="Haiku 4.5",
        provider="anthropic",
    ),
    ModelConfig(
        id="kimi-k2.5",
        color="#F59E0B",
        icon="🟡",
        label="Kimi K2.5",
        provider="moonshot",
    ),
    ModelConfig(
        id="glm-5",
        color="#EF4444",
        icon="🔴",
        label="GLM-5",
        provider="zhipu",
    ),
]


# ============================================================================
# ヘルパー関数
# ============================================================================

def get_team_dir(team_name: str) -> Path:
    """チームディレクトリのパスを取得する。

    Args:
        team_name: チーム名

    Returns:
        チームディレクトリのパス

    Raises:
        HTTPException: チームが存在しない場合
    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(status_code=404, detail="Team not found")
    return team_dir


def get_team_inboxes(team_dir: Path) -> dict[str, list]:
    """チームの全インボックスファイルを読み込む。

    Args:
        team_dir: チームディレクトリのパス

    Returns:
        エージェント名をキー、メッセージリストを値とする辞書
    """
    inboxes_dir = team_dir / "inboxes"
    inboxes = {}
    if inboxes_dir.exists():
        for inbox_file in inboxes_dir.glob("*.json"):
            with open(inbox_file, "r", encoding="utf-8") as f:
                inboxes[inbox_file.stem] = json.load(f)
    return inboxes


def parse_message_type(text: str) -> MessageType:
    """メッセージ本文からメッセージタイプを判定する。

    Args:
        text: メッセージ本文

    Returns:
        メッセージタイプ
    """
    text_stripped = text.strip()

    # JSON-in-JSON 形式のプロトコルメッセージを判定
    if text_stripped.startswith("{") and text_stripped.endswith("}"):
        try:
            data = json.loads(text)
            msg_type = data.get("type", "")
            if msg_type == "idle_notification":
                return MessageType.IDLE_NOTIFICATION
            elif msg_type == "shutdown_request":
                return MessageType.SHUTDOWN_REQUEST
            elif msg_type == "shutdown_response":
                return MessageType.SHUTDOWN_RESPONSE
            elif msg_type == "plan_approval_request":
                return MessageType.PLAN_APPROVAL_REQUEST
            elif msg_type == "plan_approval_response":
                return MessageType.PLAN_APPROVAL_RESPONSE
        except json.JSONDecodeError:
            pass

    # 通常メッセージ
    return MessageType.MESSAGE


def truncate_text(text: str, max_length: int = 50) -> str:
    """テキストを指定長に切り詰める。

    Args:
        text: 元テキスト
        max_length: 最大長

    Returns:
        切り詰められたテキスト
    """
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def get_message_class(msg_type: MessageType) -> str:
    """メッセージタイプに対応するCSSクラス名を取得する。

    Args:
        msg_type: メッセージタイプ

    Returns:
        CSSクラス名
    """
    class_map = {
        MessageType.MESSAGE: "timeline-item-message",
        MessageType.IDLE_NOTIFICATION: "timeline-item-idle",
        MessageType.SHUTDOWN_REQUEST: "timeline-item-shutdown",
        MessageType.SHUTDOWN_APPROVED: "timeline-item-shutdown-approved",
        MessageType.SHUTDOWN_RESPONSE: "timeline-item-shutdown-response",
        MessageType.PLAN_APPROVAL_REQUEST: "timeline-item-plan-request",
        MessageType.PLAN_APPROVAL_RESPONSE: "timeline-item-plan-response",
        MessageType.UNKNOWN: "timeline-item-unknown",
    }
    return class_map.get(msg_type, "timeline-item-default")


def filter_messages(
    messages: list[dict],
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    senders: Optional[list[str]] = None,
    types: Optional[list[MessageType]] = None,
    search: Optional[str] = None,
    unread_only: bool = False,
) -> list[dict]:
    """メッセージをフィルタリングする。

    Args:
        messages: メッセージリスト
        start_time: 開始時刻
        end_time: 終了時刻
        senders: 送信者フィルター
        types: タイプフィルター
        search: 検索キーワード
        unread_only: 未読のみ

    Returns:
        フィルタリングされたメッセージリスト
    """
    filtered = messages

    # 時間範囲フィルター
    if start_time:
        filtered = [
            m
            for m in filtered
            if datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00"))
            >= start_time
        ]
    if end_time:
        filtered = [
            m
            for m in filtered
            if datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00")) <= end_time
        ]

    # 送信者フィルター
    if senders:
        filtered = [m for m in filtered if m.get("from") in senders]

    # タイプフィルター
    if types:
        type_strs = {t.value for t in types}
        filtered = [
            m for m in filtered if parse_message_type(m.get("text", "")).value in type_strs
        ]

    # 検索フィルター
    if search:
        search_lower = search.lower()
        filtered = [
            m
            for m in filtered
            if search_lower in m.get("text", "").lower()
            or search_lower in m.get("from", "").lower()
            or search_lower in m.get("summary", "").lower()
        ]

    # 未読フィルター
    if unread_only:
        filtered = [m for m in filtered if not m.get("read", False)]

    return filtered


def get_unique_senders(messages: list[dict]) -> list[TimelineGroup]:
    """メッセージから一意の送信者（グループ）リストを取得する。

    Args:
        messages: メッセージリスト

    Returns:
        グループリスト
    """
    senders = set(m.get("from") for m in messages if m.get("from"))
    return [
        TimelineGroup(id=sender, content=sender, className="timeline-group")
        for sender in sorted(senders)
    ]


def get_time_range(messages: list[dict]) -> dict[str, str]:
    """メッセージの時間範囲を取得する。

    Args:
        messages: メッセージリスト

    Returns:
        最小・最大タイムスタンプを含む辞書
    """
    if not messages:
        return {"min": datetime.now().isoformat(), "max": datetime.now().isoformat()}

    timestamps = [
        datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00")) for m in messages
    ]
    return {
        "min": min(timestamps).isoformat(),
        "max": max(timestamps).isoformat(),
    }


# ============================================================================
# API エンドポイント
# ============================================================================

@router.get("/models", response_model=ModelListResponse)
async def get_available_models():
    """利用可能なモデル一覧と設定を取得する。

    各AIモデルの色、アイコン、ラベル等の設定情報を返します。
    フロントエンドでのモデル可視化に使用します。

    Returns:
        モデル設定リスト
    """
    return ModelListResponse(models=MODEL_CONFIGS)


@router.get("/teams/{team_name}/messages/timeline", response_model=TimelineData)
async def get_message_timeline(
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
    senders: Optional[str] = Query(None, description="送信者（カンマ区切り）"),
    types: Optional[str] = Query(None, description="タイプ（カンマ区切り）"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    unread_only: bool = Query(False, description="未読のみ"),
):
    """タイムライン表示用のメッセージを取得する。

    指定されたチームのメッセージをタイムライン形式で返します。
    時間範囲、送信者、タイプ、検索キーワードでフィルタリング可能です。

    Args:
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)
        senders: 送信者（カンマ区切り）
        types: メッセージタイプ（カンマ区切り）
        search: 検索キーワード
        unread_only: 未読のみ取得するか

    Returns:
        タイムラインデータ（アイテム、グループ、時間範囲）
    """
    team_dir = get_team_dir(team_name)
    inboxes = get_team_inboxes(team_dir)

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["from"] = msg.get("from", agent_name)
                all_messages.append(msg)

    # タイムスタンプでソート
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None
    sender_list = senders.split(",") if senders else None

    type_list = None
    if types:
        type_map = {
            "message": MessageType.MESSAGE,
            "idle_notification": MessageType.IDLE_NOTIFICATION,
            "shutdown_request": MessageType.SHUTDOWN_REQUEST,
            "shutdown_approved": MessageType.SHUTDOWN_APPROVED,
            "shutdown_response": MessageType.SHUTDOWN_RESPONSE,
            "plan_approval_request": MessageType.PLAN_APPROVAL_REQUEST,
            "plan_approval_response": MessageType.PLAN_APPROVAL_RESPONSE,
            "task_assignment": MessageType.TASK_ASSIGNMENT,
            "unknown": MessageType.UNKNOWN,
        }
        type_list = [type_map[t.strip()] for t in types.split(",") if t.strip() in type_map]

    # フィルタリング適用
    filtered_messages = filter_messages(
        messages=all_messages,
        start_time=start_dt,
        end_time=end_dt,
        senders=sender_list,
        types=type_list,
        search=search,
        unread_only=unread_only,
    )

    # タイムラインアイテムに変換
    timeline_items = []
    for idx, msg in enumerate(filtered_messages):
        msg_type = parse_message_type(msg.get("text", ""))
        timeline_items.append(
            TimelineItem(
                id=f"{msg.get('from', 'unknown')}-{idx}",
                content=truncate_text(msg.get("text", ""), 50),
                start=msg.get("timestamp", datetime.now().isoformat()),
                type="box",
                className=get_message_class(msg_type),
                group=msg.get("from", "unknown"),
                data=msg,
            )
        )

    # グループと時間範囲を取得
    groups = get_unique_senders(filtered_messages)
    time_range = get_time_range(filtered_messages)

    return TimelineData(items=timeline_items, groups=groups, timeRange=time_range)


@router.get("/teams/{team_name}/messages")
async def get_messages(
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
    senders: Optional[str] = Query(None, description="送信者（カンマ区切り）"),
    types: Optional[str] = Query(None, description="タイプ（カンマ区切り）"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    unread_only: bool = Query(False, description="未読のみ"),
):
    """メッセージ一覧を取得する（生データ形式）。

    タイムライン形式ではなく、元のメッセージデータをそのまま返します。

    Args:
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)
        senders: 送信者（カンマ区切り）
        types: メッセージタイプ（カンマ区切り）
        search: 検索キーワード
        unread_only: 未読のみ取得するか

    Returns:
        メッセージリスト
    """
    team_dir = get_team_dir(team_name)
    inboxes = get_team_inboxes(team_dir)

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["from"] = msg.get("from", agent_name)
                all_messages.append(msg)

    # タイムスタンプでソート
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None
    sender_list = senders.split(",") if senders else None

    type_list = None
    if types:
        type_map = {
            "message": MessageType.MESSAGE,
            "idle_notification": MessageType.IDLE_NOTIFICATION,
            "shutdown_request": MessageType.SHUTDOWN_REQUEST,
            "shutdown_approved": MessageType.SHUTDOWN_APPROVED,
            "shutdown_response": MessageType.SHUTDOWN_RESPONSE,
            "plan_approval_request": MessageType.PLAN_APPROVAL_REQUEST,
            "plan_approval_response": MessageType.PLAN_APPROVAL_RESPONSE,
            "task_assignment": MessageType.TASK_ASSIGNMENT,
            "unknown": MessageType.UNKNOWN,
        }
        type_list = [type_map[t.strip()] for t in types.split(",") if t.strip() in type_map]

    # フィルタリング適用
    filtered_messages = filter_messages(
        messages=all_messages,
        start_time=start_dt,
        end_time=end_dt,
        senders=sender_list,
        types=type_list,
        search=search,
        unread_only=unread_only,
    )

    return {"messages": filtered_messages, "count": len(filtered_messages)}


@router.get("/teams/{team_name}/messages/network", response_model=NetworkData)
async def get_message_network(
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
):
    """エージェント通信ネットワークのデータを取得する。

    指定されたチームのエージェント間通信をネットワークグラフ形式で返します。
    ノード（エージェント）とエッジ（通信関係）を集計し、モデル情報を結合します。

    Args:
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)

    Returns:
        ネットワークデータ（ノード、エッジ、メタ情報）
    """
    team_dir = get_team_dir(team_name)
    inboxes = get_team_inboxes(team_dir)

    # モデル設定をマップ化
    model_config_map = {config.id: config for config in MODEL_CONFIGS}

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["inbox_owner"] = agent_name
                msg["from"] = msg.get("from", agent_name)
                all_messages.append(msg)

    # タイムスタンプでソート
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None

    # 時間範囲フィルター
    filtered_messages = all_messages
    if start_dt:
        filtered_messages = [
            m
            for m in filtered_messages
            if datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00")) >= start_dt
        ]
    if end_dt:
        filtered_messages = [
            m
            for m in filtered_messages
            if datetime.fromisoformat(m["timestamp"].replace("Z", "+00:00")) <= end_dt
        ]

    # ========================================================================
    # ノード集計（エージェント別）
    # ========================================================================

    # エージェントごとの統計を集計
    agent_stats: dict[str, dict] = {}  # agent_name -> {sent, received, model}

    for msg in filtered_messages:
        sender = msg.get("from")
        receiver = msg.get("inbox_owner")

        if sender:
            if sender not in agent_stats:
                agent_stats[sender] = {"sent": 0, "received": 0, "model": None}
            agent_stats[sender]["sent"] += 1

        if receiver and receiver != sender:
            if receiver not in agent_stats:
                agent_stats[receiver] = {"sent": 0, "received": 0, "model": None}
            agent_stats[receiver]["received"] += 1

    # モデル情報を取得（config.json から）
    config_file = team_dir / "config.json"
    agent_models: dict[str, str] = {}  # agent_name -> model_id
    if config_file.exists():
        with open(config_file, "r", encoding="utf-8") as f:
            config_data = json.load(f)
            members = config_data.get("members", [])
            for member in members:
                agent_name = member.get("name")
                model_id = member.get("model")
                if agent_name and model_id:
                    agent_models[agent_name] = model_id

    # ノードを作成
    nodes = []
    for agent_name, stats in agent_stats.items():
        model_id = agent_models.get(agent_name, "unknown")
        model_config = model_config_map.get(
            model_id,
            ModelConfig(
                id="unknown",
                color="#94A3B8",
                icon="⚪",
                label="Unknown",
                provider="other",
            ),
        )

        nodes.append(
            AgentNode(
                id=agent_name,
                label=agent_name,
                model=model_id,
                modelColor=model_config.color,
                modelIcon=model_config.icon,
                messageCount=stats["sent"] + stats["received"],
                sentCount=stats["sent"],
                receivedCount=stats["received"],
            )
        )

    # ========================================================================
    # エッジ集計（送信者→受信者）
    # ========================================================================

    # エッジキー: "sender->receiver"
    edge_stats: dict[str, dict] = {}  # edge_key -> {count, types, last_timestamp}

    for msg in filtered_messages:
        sender = msg.get("from")
        receiver = msg.get("inbox_owner")

        if not sender or not receiver or sender == receiver:
            continue

        edge_key = f"{sender}->{receiver}"

        if edge_key not in edge_stats:
            edge_stats[edge_key] = {
                "count": 0,
                "types": EdgeTypeCounts().model_dump(),
                "last_timestamp": msg.get("timestamp", ""),
            }

        edge_stats[edge_key]["count"] += 1

        # メッセージタイプを判定してカウント
        msg_type = parse_message_type(msg.get("text", ""))
        msg_type_str = msg_type.value

        # タイプ別カウントを更新
        types_dict = edge_stats[edge_key]["types"]
        if msg_type_str in types_dict:
            types_dict[msg_type_str] += 1
        else:
            types_dict["other"] += 1

        # 最終タイムスタンプを更新
        msg_timestamp = msg.get("timestamp", "")
        if msg_timestamp > edge_stats[edge_key]["last_timestamp"]:
            edge_stats[edge_key]["last_timestamp"] = msg_timestamp

    # エッジを作成
    edges = []
    for edge_key, stats in edge_stats.items():
        sender, receiver = edge_key.split("->")

        # 優占タイプを判定
        types_counts = stats["types"]
        dominant_type = max(types_counts.items(), key=lambda x: x[1])[0]

        edges.append(
            CommunicationEdge(
                source=sender,
                target=receiver,
                count=stats["count"],
                types=EdgeTypeCounts(**types_counts),
                dominantType=dominant_type,
                lastTimestamp=stats["last_timestamp"],
            )
        )

    # ========================================================================
    # メタ情報
    # ========================================================================

    time_range = get_time_range(filtered_messages)

    meta = NetworkMeta(
        totalMessages=len(filtered_messages),
        timeRange=NetworkTimeRange(min=time_range["min"], max=time_range["max"]),
    )

    return NetworkData(nodes=nodes, edges=edges, teamName=team_name, meta=meta)
