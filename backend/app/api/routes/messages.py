"""メッセージタイムラインの REST API エンドポイント。

メッセージのタイムライン表示、フィルタリング、検索機能を提供します。
"""

from fastapi import APIRouter, HTTPException, Query, Request
from pathlib import Path
import json
from datetime import datetime
from typing import Optional

from app.config import settings
from app.models.timeline import TimelineData, TimelineItem, TimelineGroup, MessageType
from app.models.model import ModelListResponse, ModelConfig
from app.models.chat import ChatMessage, ChatMessageList
from app.services.i18n_service import i18n

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


def get_team_dir(team_name: str, lang: str = "en") -> Path:
    """チームディレクトリのパスを取得する。

    Args:
        team_name: チーム名
        lang: 言語コード

    Returns:
        チームディレクトリのパス

    Raises:
        HTTPException: チームが存在しない場合

    """
    team_dir = settings.teams_dir / team_name
    if not team_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=i18n.t("api.errors.team_not_found", lang=lang, team=team_name),
        )
    return team_dir


async def get_team_inboxes(team_dir: Path, team_name: str) -> dict[str, list]:
    """チームの全インボックスファイルを読み込みます。

    キャッシュサービスが利用可能な場合はキャッシュから取得します。

    Args:
        team_dir: チームディレクトリのパス
        team_name: チーム名

    Returns:
        エージェント名をキー、メッセージリストを値とする辞書

    """
    import logging

    logger = logging.getLogger(__name__)

    # キャッシュサービスが利用可能な場合はキャッシュから取得
    try:
        from app.services.cache_service import get_cache

        cache = get_cache()
        cached_inboxes = await cache.get_team_inboxes(team_dir, team_name)
        if cached_inboxes:
            logger.debug(f"Using cached inboxes for team '{team_name}'")
            return cached_inboxes
    except RuntimeError:
        # キャッシュサービスが初期化されていない場合はフォールバック
        logger.debug("Cache service not available, falling back to file read")

    # フォールバック: ファイルから直接読み込み
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


def safe_parse_timestamp(timestamp_str: str) -> tuple[Optional[datetime], bool]:
    """ISO 8601形式のタイムスタンプを安全にパースします。

    TC-024: 無効なタイムスタンプの場合はNoneを返し、エラーフラグを設定します。

    Args:
        timestamp_str: ISO 8601形式のタイムスタンプ文字列

    Returns:
        (datetimeオブジェクトまたはNone, パース成功ならTrue)

    """
    if not timestamp_str:
        return None, False

    try:
        # 'Z' サフィックスを '+00:00' に変換
        normalized = timestamp_str
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        return datetime.fromisoformat(normalized), True
    except (ValueError, AttributeError):
        # TC-024: 無効なタイムスタンプはログに出力
        import logging

        logger = logging.getLogger(__name__)
        logger.debug(
            f"Invalid timestamp format: {timestamp_str}",
            extra={"timestamp": timestamp_str},
        )
        return None, False


def parse_message_type(text: str) -> MessageType:
    """メッセージ本文からメッセージタイプを判定する。

    JSON-in-JSON形式のプロトコルメッセージ（idle_notification, shutdown_request等）を
    解析し、対応する MessageType を返します。

    Args:
        text: メッセージ本文

    Returns:
        メッセージタイプ（MessageType enum値）

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

    指定された最大長を超えるテキストを切り詰め、末尾に「...」を付加します。
    最大長以下の場合は元のテキストをそのまま返します。

    Args:
        text: 元テキスト
        max_length: 最大長（デフォルト50文字）

    Returns:
        切り詰められたテキスト

    """
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def get_message_class(msg_type: MessageType) -> str:
    """メッセージタイプに対応するCSSクラス名を取得する。

    タイムライン表示で使用するCSSクラス名を MessageType から取得します。

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

    時間範囲、送信者、タイプ、検索キーワード、未読状態でメッセージを
    フィルタリングします。各条件は AND 結合で適用されます。

    Args:
        messages: フィルタリング対象のメッセージリスト
        start_time: 開始時刻（この時刻以降）
        end_time: 終了時刻（この時刻以前）
        senders: 送信者フィルター（リスト）
        types: メッセージタイプフィルター（リスト）
        search: 検索キーワード（部分一致）
        unread_only: 未読のみフィルタリングするか

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
            m
            for m in filtered
            if parse_message_type(m.get("text", "")).value in type_strs
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

    メッセージリストから送信者名を抽出し、重複を排除して
    タイムライン表示用のグループリストを生成します。

    Args:
        messages: メッセージリスト

    Returns:
        タイムライングループリスト

    """
    senders = set(m.get("from") for m in messages if m.get("from"))
    return [
        TimelineGroup(id=sender, content=sender, className="timeline-group")
        for sender in sorted(senders)
    ]


def get_time_range(messages: list[dict]) -> dict[str, str]:
    """メッセージの時間範囲を取得する。

    メッセージリストの最小・最大タイムスタンプを抽出し、
    タイムライン表示の時間範囲として返します。

    Args:
        messages: メッセージリスト

    Returns:
        最小・最大タイムスタンプを含む辞書（"min", "max"キー）

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


@router.get("/cache/stats")
async def get_cache_stats():
    """キャッシュ統計情報を取得します。

    キャッシュのヒット率、キャッシュ済みアイテム数などを返します。
    モニタリングやデバッグに使用します。

    Returns:
        キャッシュ統計辞書
    """
    try:
        from app.services.cache_service import get_cache

        cache = get_cache()
        return cache.get_stats()
    except RuntimeError:
        return {"error": "Cache service not initialized"}


@router.get("/teams/{team_name}/messages/timeline", response_model=TimelineData)
async def get_message_timeline(
    request: Request,
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
    since: Optional[str] = Query(
        None, description="差分更新用: 前回取得時刻以降のメッセージのみ取得 (ISO 8601)"
    ),
    senders: Optional[str] = Query(None, description="送信者（カンマ区切り）"),
    types: Optional[str] = Query(None, description="タイプ（カンマ区切り）"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    unread_only: bool = Query(False, description="未読のみ"),
    limit: int = Query(100, description="取得件数上限", ge=1, le=500),
    offset: int = Query(0, description="オフセット", ge=0),
):
    """タイムライン表示用のメッセージを取得する。

    指定されたチームのメッセージをタイムライン形式で返します。
    時間範囲、送信者、タイプ、検索キーワードでフィルタリング可能です。

    Args:
        request: FastAPI リクエストオブジェクト（言語判定用）
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)
        since: 差分更新用: 前回取得時刻 (ISO 8601形式)。指定するとこの時刻以降のメッセージのみ返却
        senders: 送信者（カンマ区切り）
        types: メッセージタイプ（カンマ区切り）
        search: 検索キーワード
        unread_only: 未読のみ取得するか
        limit: 取得件数上限 (最大500)
        offset: オフセット

    Returns:
        タイムラインデータ（アイテム、グループ、時間範囲）
    """
    lang = getattr(request.state, "language", "en")
    team_dir = get_team_dir(team_name, lang)
    inboxes = await get_team_inboxes(team_dir, team_name)

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["from"] = msg.get("from", agent_name)
                msg["inbox_owner"] = agent_name  # 受信者情報（インボックス所有者）
                all_messages.append(msg)

    # タイムスタンプでソート
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None

    # 差分更新: since パラメータが指定された場合、start_time を上書き
    since_dt = None
    if since:
        since_dt, is_valid = safe_parse_timestamp(since)
        if is_valid and since_dt:
            # since は start_time より優先（差分更新のため）
            start_dt = since_dt

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
        type_list = [
            type_map[t.strip()] for t in types.split(",") if t.strip() in type_map
        ]

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

    # ページネーション適用
    total_count = len(filtered_messages)
    has_more = (offset + limit) < total_count
    paginated_messages = filtered_messages[offset : offset + limit]

    # タイムラインアイテムに変換
    timeline_items = []
    for idx, msg in enumerate(paginated_messages):
        msg_type = parse_message_type(msg.get("text", ""))
        timeline_items.append(
            TimelineItem(
                id=f"{msg.get('from', 'unknown')}-{idx}",
                content=truncate_text(msg.get("text", ""), 50),
                start=msg.get("timestamp", datetime.now().isoformat()),
                type="box",
                className=get_message_class(msg_type),
                group=msg.get("from", "unknown"),
                receiver=msg.get("inbox_owner"),  # 受信者情報を追加
                data=msg,
            )
        )

    # グループと時間範囲を取得（ページネーション後のメッセージベース）
    groups = get_unique_senders(paginated_messages)
    time_range = get_time_range(paginated_messages)

    return TimelineData(
        items=timeline_items,
        groups=groups,
        timeRange=time_range,
        count=len(paginated_messages),
        total=total_count,
        hasMore=has_more,
    )


@router.get("/teams/{team_name}/messages")
async def get_messages(
    request: Request,
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
    since: Optional[str] = Query(
        None, description="差分更新用: 前回取得時刻以降のメッセージのみ取得 (ISO 8601)"
    ),
    senders: Optional[str] = Query(None, description="送信者（カンマ区切り）"),
    types: Optional[str] = Query(None, description="タイプ（カンマ区切り）"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    unread_only: bool = Query(False, description="未読のみ"),
):
    """メッセージ一覧を取得する（生データ形式）。

    タイムライン形式ではなく、元のメッセージデータをそのまま返します。

    Args:
        request: FastAPI リクエストオブジェクト（言語判定用）
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)
        since: 差分更新用: 前回取得時刻 (ISO 8601形式)。指定するとこの時刻以降のメッセージのみ返却
        senders: 送信者（カンマ区切り）
        types: メッセージタイプ（カンマ区切り）
        search: 検索キーワード
        unread_only: 未読のみ取得するか

    Returns:
        メッセージリスト
    """
    lang = getattr(request.state, "language", "en")
    team_dir = get_team_dir(team_name, lang)
    inboxes = await get_team_inboxes(team_dir, team_name)

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["from"] = msg.get("from", agent_name)
                msg["inbox_owner"] = agent_name  # 受信者情報（インボックス所有者）
                all_messages.append(msg)

    # タイムスタンプでソート
    all_messages.sort(key=lambda m: m.get("timestamp", ""))

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None

    # 差分更新: since パラメータが指定された場合、start_time を上書き
    if since:
        since_dt, is_valid = safe_parse_timestamp(since)
        if is_valid and since_dt:
            # since は start_time より優先（差分更新のため）
            start_dt = since_dt

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
        type_list = [
            type_map[t.strip()] for t in types.split(",") if t.strip() in type_map
        ]

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


@router.get("/teams/{team_name}/messages/chat", response_model=ChatMessageList)
async def get_chat_messages(
    request: Request,
    team_name: str,
    start_time: Optional[str] = Query(None, description="開始時刻 (ISO 8601)"),
    end_time: Optional[str] = Query(None, description="終了時刻 (ISO 8601)"),
    since: Optional[str] = Query(
        None, description="差分更新用: 前回取得時刻以降のメッセージのみ取得 (ISO 8601)"
    ),
    senders: Optional[str] = Query(None, description="送信者（カンマ区切り）"),
    types: Optional[str] = Query(None, description="タイプ（カンマ区切り）"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    unread_only: bool = Query(False, description="未読のみ"),
    limit: int = Query(100, description="取得件数上限", ge=1, le=500),
    offset: int = Query(0, description="オフセット", ge=0),
):
    """チャット形式表示用のメッセージを取得する。

    指定されたチームのメッセージをチャット形式で返します。
    秘密メッセージ（DM）の判定、閲覧可能エージェントの設定を含みます。

    Args:
        request: FastAPI リクエストオブジェクト（言語判定用）
        team_name: チーム名
        start_time: 開始時刻 (ISO 8601形式)
        end_time: 終了時刻 (ISO 8601形式)
        since: 差分更新用: 前回取得時刻 (ISO 8601形式)。指定するとこの時刻以降のメッセージのみ返却
        senders: 送信者（カンマ区切り）
        types: メッセージタイプ（カンマ区切り）
        search: 検索キーワード
        unread_only: 未読のみ取得するか
        limit: 取得件数上限 (最大500)
        offset: オフセット

    Returns:
        チャットメッセージリスト
    """
    lang = getattr(request.state, "language", "en")
    team_dir = get_team_dir(team_name, lang)
    inboxes = await get_team_inboxes(team_dir, team_name)

    # チーム設定からメンバー情報を取得
    config_file = team_dir / "config.json"
    team_members = set()
    if config_file.exists():
        with open(config_file, "r", encoding="utf-8") as f:
            config_data = json.load(f)
            members = config_data.get("members", [])
            team_members = {m.get("name") for m in members if m.get("name")}

    # 全メッセージを収集
    all_messages = []
    for agent_name, messages in inboxes.items():
        if isinstance(messages, list):
            for msg in messages:
                msg["from"] = msg.get("from", agent_name)
                msg["inbox_owner"] = agent_name  # 受信者情報
                all_messages.append(msg)

    # タイムスタンプでソート（昇順）
    # TC-024: 無効なタイムスタンプを持つメッセージは最後に配置
    def sort_key(msg: dict) -> tuple:
        """メッセージのソート用キーを生成します。

        有効なタイムスタンプを持つメッセージは先頭に、
        無効なタイムスタンプを持つメッセージは末尾に配置されます。

        Args:
            msg: ソート対象のメッセージ辞書

        Returns:
            (優先度, 日時) のタプル。有効=0, 無効=1


        """
        timestamp_str = msg.get("timestamp", "")
        dt, is_valid = safe_parse_timestamp(timestamp_str)
        if is_valid and dt:
            return (0, dt)  # 有効なタイムスタンプは先頭
        return (1, datetime.now())  # 無効なタイムスタンプは末尾

    all_messages.sort(key=sort_key)

    # フィルター条件の解析
    start_dt = datetime.fromisoformat(start_time) if start_time else None
    end_dt = datetime.fromisoformat(end_time) if end_time else None

    # 差分更新: since パラメータが指定された場合、start_time を上書き
    if since:
        since_dt, is_valid = safe_parse_timestamp(since)
        if is_valid and since_dt:
            # since は start_time より優先（差分更新のため）
            start_dt = since_dt

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
        type_list = [
            type_map[t.strip()] for t in types.split(",") if t.strip() in type_map
        ]

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

    # ページネーション適用
    total_count = len(filtered_messages)
    has_more = (offset + limit) < total_count
    paginated_messages = filtered_messages[offset : offset + limit]

    # チャットメッセージに変換
    chat_messages = []
    for idx, msg in enumerate(paginated_messages):
        sender = msg.get("from", "unknown")
        receiver = msg.get("inbox_owner", "")

        # メッセージタイプを判定
        msg_type = parse_message_type(msg.get("text", ""))

        # 秘密メッセージ（DM）の判定
        # 受信者が明確で、チーム全体へのブロードキャストでない場合
        is_private = False
        visible_to = []

        # インボックス所有者が受信者として、送信者と1対1のメッセージの場合はDMとみなす
        if receiver and receiver != sender and receiver in team_members:
            # 受信者のインボックス内にあるメッセージで、送信者と受信者が特定される場合
            is_private = True
            visible_to = [sender, receiver]

        chat_messages.append(
            ChatMessage(
                id=f"{sender}-{receiver}-{idx}",
                from_=sender,
                to=receiver if receiver != sender else None,
                text=msg.get("text", ""),
                summary=msg.get("summary"),
                # TC-024: 無効なタイムスタンプの場合、現在時刻を使用
                timestamp=(
                    safe_parse_timestamp(msg.get("timestamp", ""))[0].isoformat()
                    if safe_parse_timestamp(msg.get("timestamp", ""))[1]
                    else datetime.now().isoformat()
                ),
                type=msg_type.value,
                isPrivate=is_private,
                visibleTo=visible_to,
                read=msg.get("read", False),
                color=msg.get("color"),
            )
        )

    return ChatMessageList(
        messages=chat_messages,
        count=len(chat_messages),
        hasMore=has_more,
    )
