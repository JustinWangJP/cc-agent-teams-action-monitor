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

        前回の読み込み位置から新規エントリのみを読み込みます。

        Args:
            team_name: チーム名
            since: タイムスタンプ（現時点では使用せず、キャッシュ位置を使用）

        Returns:
            新規タイムラインエントリリスト

        """
        # キャッシュから前回の読み込み位置を取得
        cache_key = f"session_{team_name}"
        cached_pos = self._session_cache.get(cache_key, 0)

        session_file = self._find_session_file(team_name)
        if not session_file:
            return []

        entries = []
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                # 前回位置までスキップ
                for _ in range(cached_pos):
                    next(f, None)

                # 新規エントリを読み込み
                line_num = cached_pos
                for line in f:
                    line = line.strip()
                    if not line:
                        line_num += 1
                        continue
                    try:
                        entry = orjson.loads(line)
                        mapped = self._map_session_entry(entry)
                        if mapped:
                            entries.append(mapped)
                        line_num += 1
                    except (orjson.JSONDecodeError, ValueError):
                        line_num += 1
                        continue

                # キャッシュを更新
                self._session_cache[cache_key] = line_num
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
        content = msg.get("content", "")
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

        # タイプマッピング
        type_mapping = {
            "user": "user_message",
            "assistant": "assistant_message",
            "thinking": "thinking",
            "tool_use": "tool_use",
        }

        parsed_type = type_mapping.get(entry_type, "unknown")

        # エージェント名を推定（セッションでは送信者情報が限定的）
        # 通常はリードエージェント（team-lead）のアクティビティ
        from_ = entry.get("role", "assistant")

        # タイムスタンプ
        timestamp = entry.get("timestamp")
        if timestamp and isinstance(timestamp, str):
            timestamp = timestamp.replace("Z", "+00:00")

        # コンテンツ構築
        content = ""
        details = None

        if entry_type == "user":
            content = entry.get("content", "")

        elif entry_type == "assistant":
            # 複数のブロックを持つ可能性がある
            blocks = entry.get("content", [])
            if isinstance(blocks, list):
                for block in blocks:
                    block_type = block.get("type")
                    if block_type == "text":
                        content = block.get("text", "")
                        break  # 最初のテキストブロックを使用
                    elif block_type == "tool_use":
                        content = f"Tool: {block.get('name', 'unknown')}"
                        break

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

        タイプ別に詳細情報を抽出し、summary を生成します。

        Args:
            text: メッセージテキスト

        Returns:
            パースされた構造化データ（失敗時は None）

        """
        if not text or not isinstance(text, str):
            return None

        text = text.strip()

        # JSON テキストの抽出を試行（```json ブロック内など）
        json_start = text.find("{")
        json_end = text.rfind("}")

        if json_start == -1 or json_end == -1 or json_start >= json_end:
            return None

        try:
            json_str = text[json_start:json_end + 1]
            data = json.loads(json_str)

            # 構造化メッセージの type フィールドを確認
            msg_type = data.get("type")
            if not msg_type:
                return None

            # 有効なメッセージタイプ
            valid_types = {
                "task_assignment",
                "task_completed",
                "idle_notification",
                "shutdown_request",
                "shutdown_response",
                "plan_approval_request",
                "plan_approval_response",
            }

            if msg_type not in valid_types:
                return None

            # タイプ別の詳細抽出と summary 生成
            if msg_type == "task_assignment":
                task_id = data.get("taskId")
                subject = data.get("subject", "")
                if task_id:
                    summary = f"タスク #{task_id}: {subject}" if subject else f"タスク #{task_id} 割り当て"
                else:
                    summary = "タスク割り当て"
                data["summary"] = summary

            elif msg_type == "task_completed":
                task_id = data.get("taskId")
                if task_id:
                    summary = f"タスク #{task_id} 完了"
                else:
                    summary = "タスク完了"
                data["summary"] = summary

            elif msg_type == "idle_notification":
                idle_reason = data.get("idleReason", "")
                summary_text = data.get("summary", "アイドル中")
                if idle_reason:
                    summary = f"アイドル通知: {idle_reason}"
                else:
                    summary = summary_text
                data["summary"] = summary

            elif msg_type == "shutdown_request":
                reason = data.get("reason", "")
                if reason:
                    summary = f"シャットダウン要求: {reason}"
                else:
                    summary = "シャットダウン要求"
                data["summary"] = summary

            elif msg_type == "shutdown_response":
                # approve フィールドで判定
                approve = data.get("approve", True)
                if approve is False:
                    summary = "シャットダウン拒否"
                else:
                    summary = "シャットダウン応答"
                data["summary"] = summary

            elif msg_type == "plan_approval_request":
                summary = "プラン承認要求"
                data["summary"] = summary

            elif msg_type == "plan_approval_response":
                approve = data.get("approve", True)
                if approve is False:
                    summary = "プラン却下"
                else:
                    summary = "プラン承認"
                data["summary"] = summary

            return data

        except (json.JSONDecodeError, ValueError):
            return None
