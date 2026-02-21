"""統合タイムライン API ルーター.

inbox メッセージとセッションログを統合したタイムラインを提供します。
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from app.services.timeline_service import TimelineService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


# ファイル変更関連のモデル
class FileChangeInfo(BaseModel):
    """ファイル変更情報."""
    path: str
    operation: str  # 'created' | 'modified' | 'deleted' | 'read'
    version: Optional[int] = None


class FileChangeEntry(BaseModel):
    """ファイル変更エントリ."""
    id: str
    file: FileChangeInfo
    timestamp: str
    agent: Optional[str] = None
    session_id: Optional[str] = None


class FileChangesResponse(BaseModel):
    """ファイル変更レスポンス."""
    items: list[FileChangeEntry]
    last_timestamp: str


# リクエスト・レスポンスモデル
class UnifiedTimelineEntry(BaseModel):
    """統合タイムラインエントリ."""
    id: str
    content: str
    from_: str
    to: Optional[str] = None
    timestamp: str
    color: Optional[str] = None
    read: bool = True
    summary: Optional[str] = None
    source: str  # 'inbox' | 'session'
    parsed_type: str
    parsed_data: Optional[dict] = None
    details: Optional[dict] = None

    model_config = ConfigDict(populate_by_name=True)


class UnifiedTimelineResponse(BaseModel):
    """統合タイムラインレスポンス."""
    items: list[UnifiedTimelineEntry]
    last_timestamp: str
    has_more: bool = False  # ページネーション：さらに古いエントリが存在するか
    last_event_id: Optional[str] = None  # 次ページ用カーソル


# TimelineService のインスタンスを取得するヘルパー関数
def _get_timeline_service() -> TimelineService:
    """TimelineService のインスタンスを取得します。"""
    return TimelineService()


@router.get("/{team_name}/history", response_model=UnifiedTimelineResponse)
async def get_timeline_history(
    team_name: str,
    limit: int = Query(100, ge=1, le=10000, description="最大取得件数"),
    types: Optional[str] = Query(None, description="カンマ区切りでタイプ指定（例: message,thinking,tool_use）"),
    before_event_id: Optional[str] = Query(None, description="このイベントIDより古いエントリを取得（ページネーション用）")
):
    """統合タイムライン履歴を取得します。

    inbox メッセージとセッションログを統合して返します。
    タイムスタンプの降順（新しい順）でソートされます。

    Args:
        team_name: チーム名
        limit: 最大取得件数（1-500、デフォルト100）
        types: フィルタリングするタイプ（カンマ区切り）
        before_event_id: このイベントIDより古いエントリを取得（ページネーション用）

    Returns:
        統合タイムラインレスポンス

    Raises:
        HTTPException: チームが存在しない場合

    """
    service = _get_timeline_service()

    # チーム存在チェック
    if not service.team_exists(team_name):
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")

    # inbox メッセージとセッションログを並行して取得
    inbox_messages = await service.load_inbox_messages(team_name)
    session_entries = await service.load_session_entries(team_name)

    # 統合
    all_entries = inbox_messages + session_entries

    # タイプフィルタ
    if types:
        type_filter = set(types.split(","))
        all_entries = [
            e for e in all_entries
            if e.get("parsed_type") in type_filter
        ]

    # timestamp が None のエントリを除外してからソート
    # content が空文字列のエントリも除外
    # タイムスタンプが同じ場合は ID でソートして順序を安定させる
    all_entries = [e for e in all_entries if e.get("timestamp") is not None and e.get("content")]
    all_entries.sort(
        key=lambda x: (x.get("timestamp", ""), x.get("id", "")),
        reverse=True
    )

    # before_event_id によるページネーション
    if before_event_id:
        # 指定されたイベントIDのインデックスを検索
        before_index = None
        for i, entry in enumerate(all_entries):
            if entry.get("id") == before_event_id:
                before_index = i
                break

        if before_index is not None:
            # 指定イベントより後ろ（古い）のエントリのみを使用
            all_entries = all_entries[before_index + 1:]
        else:
            # 指定されたイベントIDが見つからない場合、空のリストを返す
            logger.warning(f"before_event_id not found: {before_event_id}")
            all_entries = []

    # 件数制限（has_more 判定の前に元のサイズを保存）
    total_before_limit = len(all_entries)
    all_entries = all_entries[:limit]
    has_more = total_before_limit > limit

    # 最終タイムスタンプを取得
    last_timestamp = all_entries[0]["timestamp"] if all_entries else datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    # 次ページ用カーソルを設定（has_more=True の場合のみ）
    last_event_id = all_entries[-1]["id"] if all_entries and has_more else None

    # UnifiedTimelineEntry モデルを明示的にインスタンス化
    timeline_items = [UnifiedTimelineEntry(**entry) for entry in all_entries]

    return UnifiedTimelineResponse(
        items=timeline_items,
        last_timestamp=last_timestamp,
        has_more=has_more,
        last_event_id=last_event_id
    )


@router.get("/{team_name}/updates", response_model=UnifiedTimelineResponse)
async def get_timeline_updates(
    team_name: str,
    since: Optional[str] = Query(None, description="このタイムスタンプ以降のエントリのみ取得（ISO 8601形式）"),
    limit: int = Query(50, ge=1, le=200, description="最大取得件数")
):
    """差分更新用エンドポイントです。

    since 以降の新規エントリのみ返します。

    Args:
        team_name: チーム名
        since: 基準タイムスタンプ（ISO 8601形式、例: 2026-02-21T10:00:00Z）
        limit: 最大取得件数（1-200、デフォルト50）

    Returns:
        統合タイムラインレスポンス（since 以降のエントリのみ）

    Raises:
        HTTPException: チームが存在しない場合

    """
    service = _get_timeline_service()

    # チーム存在チェック
    if not service.team_exists(team_name):
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")

    # 新規セッションエントリを取得
    session_entries = await service.load_session_entries_since(team_name, since)

    # inbox メッセージは全件取得（差分追跡が複雑なため）
    # TODO: inbox メッセージの差分追跡を実装
    inbox_messages = await service.load_inbox_messages(team_name)

    # since フィルタ（inbox メッセージのみ、セッションは既にフィルタ済み）
    if since:
        inbox_messages = [
            m for m in inbox_messages
            if m.get("timestamp", "") > since
        ]

    # 統合
    all_entries = inbox_messages + session_entries

    # timestamp が None のエントリを除外してからソート
    # content が空文字列のエントリも除外
    all_entries = [e for e in all_entries if e.get("timestamp") is not None and e.get("content")]
    all_entries.sort(
        key=lambda x: x.get("timestamp", ""),
        reverse=True
    )

    # 件数制限（has_more 判定の前に元のサイズを保存）
    total_before_limit = len(all_entries)
    all_entries = all_entries[:limit]
    has_more = total_before_limit > limit

    # 最終タイムスタンプを取得
    last_timestamp = all_entries[0]["timestamp"] if all_entries else datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    # 次ページ用カーソルを設定（has_more=True の場合のみ）
    last_event_id = all_entries[-1]["id"] if all_entries and has_more else None

    # UnifiedTimelineEntry モデルを明示的にインスタンス化
    timeline_items = [UnifiedTimelineEntry(**entry) for entry in all_entries]

    return UnifiedTimelineResponse(
        items=timeline_items,
        last_timestamp=last_timestamp,
        has_more=has_more,
        last_event_id=last_event_id
    )


@router.get("/file-changes/{team_name}", response_model=FileChangesResponse)
async def get_file_changes(
    team_name: str,
    limit: int = Query(200, ge=1, le=1000, description="最大取得件数"),
    operations: Optional[str] = Query(None, description="カンマ区切りで操作種別指定（例: created,modified）")
):
    """ファイル変更履歴を取得します.

    セッションログからファイル変更エントリを抽出して返します。

    Args:
        team_name: チーム名
        limit: 最大取得件数（1-1000、デフォルト200）
        operations: フィルタリングする操作種別（カンマ区切り）

    Returns:
        ファイル変更レスポンス

    Raises:
        HTTPException: チームが存在しない場合

    """
    service = _get_timeline_service()

    # チーム存在チェック
    if not service.team_exists(team_name):
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")

    # セッションエントリからファイル変更を抽出
    session_entries = await service.load_session_entries(team_name)

    # file_change タイプのエントリを抽出
    file_changes = []
    for entry in session_entries:
        if entry.get("parsed_type") == "file_change":
            details = entry.get("details", {})
            files = details.get("files", [])
            for file_info in files:
                file_changes.append({
                    "id": f"{entry.get('timestamp', '')}-{file_info.get('path', '')}",
                    "file": {
                        "path": file_info.get("path", ""),
                        "operation": file_info.get("operation", "unknown"),
                        "version": file_info.get("version")
                    },
                    "timestamp": entry.get("timestamp", ""),
                    "agent": entry.get("from_"),
                    "session_id": entry.get("session_id")
                })

    # 操作種別フィルタ
    if operations:
        op_filter = set(operations.split(","))
        file_changes = [
            fc for fc in file_changes
            if fc["file"]["operation"] in op_filter
        ]

    # タイムスタンプでソート（降順）
    file_changes.sort(
        key=lambda x: x["timestamp"],
        reverse=True
    )

    # 件数制限
    file_changes = file_changes[:limit]

    # 最終タイムスタンプを取得
    last_timestamp = file_changes[0]["timestamp"] if file_changes else datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return FileChangesResponse(
        items=file_changes,
        last_timestamp=last_timestamp
    )
