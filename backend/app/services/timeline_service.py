"""統合タイムラインサービス。

~/.claude/ ディレクトリ内の inbox メッセージとセッションログを統合し、
タイムライン形式で提供します。

"""
import json
import logging
from pathlib import Path
from typing import Optional

import orjson

from app.config import settings
from app.services.message_parser import parse_structured_message

logger = logging.getLogger(__name__)


class TimelineService:
    """統合タイムラインサービス。

    inbox メッセージとセッションログを統合してタイムラインエントリを生成します。
    セッションファイルは config.json から leadSessionId と cwd を取得して特定します。

    """

    def __init__(self, claude_dir: Optional[Path] = None):
        """タイムラインサービスを初期化します。

        Args:
            claude_dir: Claude ディレクトリのパス。省略時は設定値を使用。

        """
        self.claude_dir = claude_dir or settings.claude_dir
        self._session_cache: dict[str, int] = {}  # 読み込み位置キャッシュ

    def _cwd_to_project_hash(self, cwd: str) -> str:
        """cwd から project-hash を生成します。

        先頭に "-" を付与し、先頭の "/" を削除して "/" を "-" に置換します。

        例:
            cwd = "/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor"
            → "-Users-aegeanwang-Coding-workspaces-python-working-cc-agent-teams-action-monitor"

        Args:
            cwd: 作業ディレクトリの絶対パス

        Returns:
            project-hash 文字列

        """
        return "-" + cwd.lstrip("/").replace("/", "-")

    def _find_session_file(self, team_name: str) -> Optional[Path]:
        """チームのリードセッションファイルを特定します。

        フロー:
            1. config.json から leadSessionId と cwd を取得
            2. cwd → project-hash に変換
            3. ~/.claude/projects/{project-hash}/{leadSessionId}.jsonl を返す

        Args:
            team_name: チーム名

        Returns:
            セッションファイルのパス（存在しない場合は None）

        """
        config_path = self.claude_dir / "teams" / team_name / "config.json"

        if not config_path.exists():
            logger.warning(f"Team config not found: {config_path}")
            return None

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load team config: {e}")
            return None

        lead_session_id = config.get("leadSessionId")
        members = config.get("members", [])

        if not lead_session_id or not members:
            logger.warning(f"LeadSessionId or members not found in config: {team_name}")
            return None

        # 最初のメンバーの cwd を使用（リードセッションの基準）
        cwd = members[0].get("cwd")
        if not cwd:
            logger.warning(f"cwd not found in members[0]: {team_name}")
            return None

        # project-hash に変換
        project_hash = self._cwd_to_project_hash(cwd)

        # セッションファイルのパスを構築
        session_file = self.claude_dir / "projects" / project_hash / f"{lead_session_id}.jsonl"

        if session_file.exists():
            logger.info(f"Found session file: {session_file}")
            return session_file

        logger.warning(f"Session file not found: {session_file}")
        return None

    async def load_inbox_messages(self, team_name: str) -> list[dict]:
        """チームの全 inbox メッセージを読み込みます。

        Args:
            team_name: チーム名

        Returns:
            タイムラインエントリ形式のメッセージリスト

        """
        inbox_dir = self.claude_dir / "teams" / team_name / "inboxes"
        messages = []

        if not inbox_dir.exists():
            return messages

        for inbox_file in inbox_dir.glob("*.json"):
            recipient = inbox_file.stem
            try:
                with open(inbox_file, "r", encoding="utf-8") as f:
                    inbox_data = json.load(f)
                    # inbox_data は配列形式またはオブジェクト形式
                    messages_list = inbox_data if isinstance(inbox_data, list) else inbox_data.get("messages", [])
                    for msg in messages_list:
                        mapped = self._map_inbox_message(msg, recipient)
                        if mapped:
                            messages.append(mapped)
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Failed to load inbox file {inbox_file}: {e}")
                continue

        # timestamp が None のエントリを除外してからソート
        messages = [m for m in messages if m.get("timestamp") is not None]
        messages.sort(key=lambda x: x.get("timestamp", ""))
        return messages

    async def load_session_entries(self, team_name: str) -> list[dict]:
        """チームのセッションログを読み込みます。

        Args:
            team_name: チーム名

        Returns:
            タイムラインエントリ形式のセッションエントリリスト

        """
        session_file = self._find_session_file(team_name)

        if not session_file:
            return []

        entries = []
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = orjson.loads(line)
                        mapped = self._map_session_entry(entry)
                        if mapped:
                            entries.append(mapped)
                    except (orjson.JSONDecodeError, ValueError) as e:
                        logger.debug(f"Failed to parse session entry: {e}")
                        continue
        except IOError as e:
            logger.error(f"Failed to read session file: {e}")
            return []

        # timestamp が None のエントリを除外してからソート
        entries = [e for e in entries if e.get("timestamp") is not None]
        entries.sort(key=lambda x: x.get("timestamp", ""))
        return entries

    async def load_session_entries_since(
        self,
        team_name: str,
        since: Optional[str] = None
    ) -> list[dict]:
        """差分読み込みを行います。

        since 以降のタイムスタンプを持つ新規エントリのみを読み込みます。
        キャッシュはあくまで最適化として使用し、since パラメータを優先します。

        Args:
            team_name: チーム名
            since: タイムスタンプ（ISO 8601 形式）。指定時は当該時刻以降のエントリのみを返す。

        Returns:
            新規タイムラインエントリリスト

        """
        session_file = self._find_session_file(team_name)
        if not session_file:
            return []

        entries = []
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = orjson.loads(line)
                        mapped = self._map_session_entry(entry)
                        if mapped:
                            # since パラメータが指定されている場合はタイムスタンプでフィルタ
                            if since:
                                entry_timestamp = mapped.get("timestamp", "")
                                # timestamp が None または空文字列の場合はフィルタ対象外（含める）
                                if entry_timestamp and entry_timestamp <= since:
                                    continue  # since 以前のエンティティはスキップ
                            entries.append(mapped)
                    except (orjson.JSONDecodeError, ValueError):
                        continue
        except IOError as e:
            logger.error(f"Failed to read session file: {e}")
            return []

        return entries

    def _map_inbox_message(self, msg: dict, recipient: str) -> Optional[dict]:
        """inbox メッセージをタイムラインエントリ形式に変換します。

        Args:
            msg: inbox メッセージ辞書
            recipient: 受信者名

        Returns:
            タイムラインエントリ形式の辞書

        """
        # 基本的なフィールドをマッピング
        # text または content フィールドを使用
        content = msg.get("text") or msg.get("content", "")
        from_ = msg.get("from", "")

        # 構造化メッセージをパース試行
        parsed_data = self._parse_structured_message(content)

        # タイプ判定
        parsed_type = "message"
        summary = None
        color = None

        if parsed_data:
            parsed_type = parsed_data.get("type", "message")
            summary = parsed_data.get("summary")

            # タイプ別色設定
            color_map = {
                "task_assignment": "#3b82f6",
                "task_completed": "#10b981",
                "idle_notification": "#f59e0b",
                "shutdown_request": "#ef4444",
                "shutdown_response": "#22c55e",
                "plan_approval_request": "#8b5cf6",
                "plan_approval_response": "#22c55e",
                "error": "#dc2626",
            }
            color = color_map.get(parsed_type)

        # タイムスタンプ（ISO 8601 形式）
        timestamp = msg.get("timestamp")
        if timestamp:
            # ミリ秒以下を処理
            if isinstance(timestamp, str):
                # Z サフィックスがあれば +00:00 に変換
                timestamp = timestamp.replace("Z", "+00:00")

        entry = {
            "id": f"inbox-{timestamp}-{from_}-{recipient}",
            "content": content,
            "from_": from_,
            "to": recipient,
            "timestamp": timestamp,
            "color": color,
            "read": msg.get("read", True),
            "summary": summary,
            "source": "inbox",
            "parsed_type": parsed_type,
            "parsed_data": parsed_data,
            "details": None,
        }

        return entry

    def _map_session_entry(self, entry: dict) -> Optional[dict]:
        """セッションログエントリをタイムライン形式に変換します。

        Args:
            entry: セッションログエントリ辞書

        Returns:
            タイムラインエントリ形式の辞書（変換失敗時は None）

        """
        entry_type = entry.get("type")

        # ツール使用エントリはスキップ
        if entry_type == "tool_use":
            return None

        # タイプマッピング（entry_type が None の場合は "unknown" を使用）
        type_mapping = {
            "user": "user_message",
            "assistant": "assistant_message",
            "thinking": "thinking",
        }

        # file-history-snapshot は UAT 要件によりスキップ
        if entry_type == "file-history-snapshot":
            return None

        parsed_type = "unknown" if entry_type is None else type_mapping.get(entry_type, "unknown")

        # エージェント名を推定（セッションでは送信者情報が限定的）
        # message.role を優先、なければ entry.role を使用
        # assistant の場合はモデル名を含めて「AI Assistant (model)」形式にする
        message = entry.get("message", {})
        role = message.get("role", entry.get("role", "assistant"))

        # thinking と file-history-snapshot は assistant の model チェックをスキップ
        if role == "assistant" and entry_type not in ("thinking", "file-history-snapshot"):
            model = message.get("model")
            # モデルが特定できない場合はエントリを除外
            if not model or model == "unknown":
                return None
            from_ = f"AI Assistant ({model})"
        else:
            from_ = role if role != "assistant" else "AI Assistant"

        # タイムスタンプ
        timestamp = entry.get("timestamp")
        if timestamp and isinstance(timestamp, str):
            timestamp = timestamp.replace("Z", "+00:00")

        # コンテンツ構築
        content = ""
        details = None

        # 古い形式（entry.content が文字列）のフォールバック
        raw_content = entry.get("content")
        if isinstance(raw_content, str) and raw_content:
            content = raw_content
        elif isinstance(raw_content, list) and raw_content:
            # content が配列の場合は message.content と同様に処理
            message["content"] = raw_content

        if entry_type == "user":
            # content がまだ空の場合のみ message.content を処理
            if not content:
                # message.content を取得（文字列またはリスト）
                user_content = message.get("content", "")
                if isinstance(user_content, str):
                    content = user_content
                elif isinstance(user_content, list):
                    # リスト形式の場合、テキストブロックのみを結合（tool_result は除外）
                    text_parts = []
                    for block in user_content:
                        if isinstance(block, dict):
                            block_type = block.get("type")
                            if block_type == "text":
                                text_parts.append(block.get("text", ""))
                    content = "\n".join(text_parts) if text_parts else ""

        elif entry_type == "assistant":
            # message.content を取得（リスト形式）
            blocks = message.get("content", [])
            if isinstance(blocks, list):
                # テキストブロックと thinking ブロックのみを結合（tool_use は除外）
                text_parts = []

                for block in blocks:
                    block_type = block.get("type")
                    if block_type == "text":
                        text_parts.append(block.get("text", ""))
                    elif block_type == "thinking":
                        thinking_text = block.get('thinking', '')
                        text_parts.append(f"💭 {thinking_text}")

                # テキストを結合
                content = "\n".join(text_parts) if text_parts else ""

        elif entry_type == "thinking":
            content = "思考中..."
            thinking_text = entry.get("thinking", "")
            details = {"thinking": thinking_text}

        elif entry_type == "tool_use":
            tool_name = entry.get("name", "unknown")
            tool_input = entry.get("input", {})
            content = f"ツール使用: {tool_name}"
            details = {
                "toolName": tool_name,
                "toolInput": tool_input,
            }

        elif entry_type == "file-history-snapshot":
            # ファイル変更履歴の処理
            # データ構造：entry.fileChanges（辞書形式）を優先
            # フォールバック：entry.snapshot.trackedFileBackups
            file_changes = entry.get("fileChanges") or entry.get("snapshot", {}).get("trackedFileBackups", {})
            files_list = []

            # fileChanges が辞書形式かリスト形式かを判定
            if isinstance(file_changes, dict):
                # 辞書形式：{path: {backupFileName, version, backupTime}} または {path: {operation, version}}
                for path, change_info in file_changes.items():
                    if isinstance(change_info, dict):
                        # operation フィールドがない場合、backupFileName と version から推論
                        operation = change_info.get("operation")
                        if operation is None:
                            # operation を推論
                            backup_file_name = change_info.get("backupFileName")
                            version = change_info.get("version", 1)
                            
                            if backup_file_name is None and version == 1:
                                operation = "created"
                            elif backup_file_name is not None:
                                operation = "modified"
                            else:
                                operation = "read"
                        
                        version = change_info.get("version")
                        files_list.append({
                            "path": path,
                            "operation": operation,
                            "version": version,
                        })
            elif isinstance(file_changes, list):
                # リスト形式：[{path, operation, version}] または [{path, backupFileName, version, backupTime}]
                for change_info in file_changes:
                    if isinstance(change_info, dict):
                        path = change_info.get("path", "")
                        
                        # operation フィールドがない場合、backupFileName と version から推論
                        operation = change_info.get("operation")
                        if operation is None:
                            backup_file_name = change_info.get("backupFileName")
                            version = change_info.get("version", 1)
                            
                            if backup_file_name is None and version == 1:
                                operation = "created"
                            elif backup_file_name is not None:
                                operation = "modified"
                            else:
                                operation = "read"
                        
                        version = change_info.get("version")
                        if path:
                            files_list.append({
                                "path": path,
                                "operation": operation,
                                "version": version,
                            })

            changed_count = len(files_list)
            if changed_count == 1:
                content = f"ファイル変更: {files_list[0]['path']}"
            else:
                content = f"{changed_count} ファイル変更"

            details = {
                "files": files_list,
            }

        # content が 💭 で始まる場合は thinking タイプとして扱う
        if content and content.startswith("💭"):
            parsed_type = "thinking"
            details = {"thinking": content[1:].strip()}

        # 色設定
        color_map = {
            "user_message": "#3b82f6",
            "assistant_message": "#8b5cf6",
            "thinking": "#9ca3af",
            "tool_use": "#06b6d4",
        }
        color = color_map.get(parsed_type)

        result = {
            "id": f"session-{timestamp}-{parsed_type}",
            "content": content,
            "from_": from_,
            "to": None,
            "timestamp": timestamp,
            "color": color,
            "read": True,
            "summary": None,
            "source": "session",
            "parsed_type": parsed_type,
            "parsed_data": None,
            "details": details,
        }

        return result

    def _parse_structured_message(self, text: str) -> Optional[dict]:
        """構造化メッセージ（JSON-in-JSON）をパースします。

        MessageParser モジュールに委譲します。

        Args:
            text: メッセージテキスト

        Returns:
            パースされた構造化データ（失敗時は None）

        """
        return parse_structured_message(text)

    def team_exists(self, team_name: str) -> bool:
        """チームが存在するか確認します。

        チームの config.json が存在するかどうかで判定します。

        Args:
            team_name: チーム名

        Returns:
            チームが存在する場合は True、そうでない場合は False

        """
        config_path = self.claude_dir / "teams" / team_name / "config.json"
        return config_path.exists()
