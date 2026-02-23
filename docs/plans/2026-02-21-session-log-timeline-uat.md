# セッションログ統合機能 UAT テスト仕様書

**対象設計書**: [2026-02-21-session-log-timeline-design.md](./2026-02-21-session-log-timeline-design.md)
**作成日**: 2026-02-21
**バージョン**: 1.0

---

## 1. 概要

本文書は、Agent Teams Dashboard のセッションログ統合機能に対する UAT（User Acceptance Testing）テスト仕様を定義します。

### テストアプローチ

| アプローチ | 種別 | 内容 |
|-----------|------|------|
| アプローチA | 統合シナリオ型 | エンドツーエンドのユーザーストーリーに基づくテスト |
| アプローチB | 機能別網羅型 | 各タスクごとの独立した詳細テストケース |

---

## 2. アプローチA: 統合シナリオ型テスト

### US-001: セッションログ統合タイムライン閲覧

**ユーザーストーリー:**
> チームリーダーとして、エージェント間のメッセージとセッションログを統合したタイムラインを閲覧し、チーム全体の活動状況を把握したい。

**前提条件:**
- チームが作成され、メンバーが参加している
- セッションログ（`projects/{hash}/{sessionId}.jsonl`）が存在する
- inboxメッセージが存在する

**テスト手順:**

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | ダッシュボードにアクセスし、チームを選択する | 統合タイムラインパネルが表示される |
| 2 | タイムラインの更新間隔を30秒に設定する | ポーリングが開始され、30秒ごとに更新される |
| 3 | 初回読み込み後、最新エントリを確認する | inboxメッセージとsessionログが時系列で統合表示される |
| 4 | 「thinking」タイプのエントリをクリックする | 思考プロセスが折りたたみ可能で表示される |
| 5 | 「file_change」タイプのエントリを確認する | ファイルパスと操作種別（作成/編集/削除）がアイコン付きで表示される |
| 6 | 「tool_use」タイプのエントリを確認する | ツール名と入力パラメータが展開可能で表示される |
| 7 | タイムラインを手動リフレッシュする | 新規エントリが差分取得され追加表示される |
| 8 | 検索ボックスにエージェント名を入力する | 該当エージェントのエントリのみフィルタ表示される |

**受入基準:**
- [ ] inboxメッセージとsessionログが時系列順に統合表示される
- [ ] 各エントリタイプ（user_message, assistant_message, thinking, tool_use, file_change）が正しいアイコンと色で表示される
- [ ] session由来の詳細（thinking, files, toolName）が展開可能
- [ ] 差分更新が正しく動作し、重複なく追加される
- [ ] 検索・フィルタ機能が正常に動作する

---

### US-002: エージェント状態リアルタイム監視

**ユーザーストーリー:**
> チームリーダーとして、各エージェントの現在の状態（作業中/待機中/エラー）と進捗をリアルタイムで監視したい。

**前提条件:**
- チームに複数のエージェントが所属している
- タスクが割り当てられている
- inboxメッセージとセッションログが存在する

**テスト手順:**

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | エージェントカードパネルを開く | 全エージェントの状態が表示される |
| 2 | 「作業中」のエージェントを確認 | プログレスバー（0-100%）が表示され、現在のタスク名が表示される |
| 3 | 「待機中」のエージェントを確認 | 💤アイコンと「idle」ステータスが表示される |
| 4 | エージェントカードをクリック | 詳細情報（モデル名、最終活動時刻、関連ファイル一覧）が表示される |
| 5 | 30秒待機して状態変化を確認 | ポーリングにより状態が自動更新される |
| 6 | タスク完了メッセージを送信 | 該当エージェントの進捗が100%になり、ステータスが「completed」に変化 |
| 7 | エラー状態のエージェントを確認 | ❌アイコンと「error」ステータス、エラー詳細が表示される |

**受入基準:**
- [ ] エージェント状態（idle, working, waiting, error, completed）が正しく表示される
- [ ] プログレスバーが0-100%の範囲で正しく表示される
- [ ] 現在のタスク名（activeForm）が表示される
- [ ] 使用モデル名（sessionログから抽出）が表示される
- [ ] 最終活動時刻が相対時間（○分前）で表示される
- [ ] 状態変化がリアルタイム（ポーリング）で反映される

---

### US-003: タスク進捗トラッキング

**ユーザーストーリー:**
> プロジェクトマネージャーとして、タスクの進捗状況と依存関係を可視化し、ボトルネックを特定したい。

**前提条件:**
- 複数のタスクが作成されている
- タスク間に依存関係（blocks/blockedBy）がある
- タスクにactiveFormが設定されている

**テスト手順:**

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | タスクパネルを開く | 全タスクが進捗バー付きで表示される |
| 2 | 「進行中」のタスクを確認 | プログレスバー、activeForm（「今何をしているか」）が表示される |
| 3 | 依存関係があるタスクを確認 | blockedBy（ブロック元）とblocks（ブロック先）が視覚的に表示される |
| 4 | ブロックされているタスクをクリック | ブロックを解除するための先行タスク一覧が表示される |
| 5 | タスクに紐付くファイル変更を確認 | 該当タスクに関連するファイル変更一覧が表示される |
| 6 | タスクを完了状態に更新 | プログレスが100%になり、依存タスクのブロックが解除される表示がされる |
| 7 | タイムライン連携ボタンをクリック | 該当タスクに関連するタイムラインエントリにフィルタが適用される |

**受入基準:**
- [ ] タスクの進捗がパーセンテージで表示される
- [ ] activeForm（現在の作業内容）が表示される
- [ ] blockedBy/blocksによる依存関係が視覚的に理解できる
- [ ] タスクとファイル変更が紐付けて表示される
- [ ] タイムラインとの連携（フィルタ）が動作する

---

### US-004: ファイル変更リアルタイム監視

**ユーザーストーリー:**
> 開発者として、チームメンバーのファイル変更をリアルタイムで監視し、競合を早期に発見したい。

**前提条件:**
- セッションログに`file-history-snapshot`エントリが存在する
- 複数のエージェントがファイルを操作している

**テスト手順:**

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | ファイル変更パネルを開く | 最新のファイル変更一覧が表示される |
| 2 | フィルターを「作成」に設定 | 作成操作のみが表示される |
| 3 | 特定のディレクトリでフィルタ | 該当ディレクトリ配下のファイルのみ表示される |
| 4 | ファイル変更エントリを確認 | ファイルパス、操作種別、時刻、関連エージェントが表示される |
| 5 | ファイルパスをクリック | ファイルの詳細情報（変更内容の差分）が表示される（可能な場合） |
| 6 | 30秒待機 | 新規ファイル変更が自動的に追加表示される |
| 7 | エージェントフィルタを適用 | 特定エージェントのファイル変更のみ表示される |

**受入基準:**
- [ ] ファイル変更（作成/編集/削除/読取）がリアルタイム表示される
- [ ] 操作種別ごとにアイコン/色が異なる
- [ ] ファイルパスが整形されて表示される
- [ ] 関連エージェントが紐付けて表示される
- [ ] ディレクトリ/拡張子/エージェントでのフィルタが動作する

---

### US-005: 統合ダッシュボードエクスペリエンス

**ユーザーストーリー:**
> チームリーダーとして、統合ダッシュボードで全情報（タイムライン、エージェント状態、タスク、ファイル変更）を一目で把握したい。

**前提条件:**
- 全機能が実装済み
- チームがアクティブに活動している

**テスト手順:**

| ステップ | 操作 | 期待結果 |
|---------|------|---------|
| 1 | ダッシュボードを開く | 全パネル（タイムライン、エージェント、タスク、ファイル変更）が表示される |
| 2 | レイアウトカスタマイズ | パネルのサイズ/位置を変更できる |
| 3 | 特定エージェントを選択 | タイムライン、タスク、ファイル変更が該当エージェントでフィルタされる |
| 4 | 特定タスクを選択 | 関連するタイムラインエントリとファイル変更がハイライトされる |
| 5 | リアルタイム更新を確認 | 新規メッセージ/ファイル変更が自動的に各パネルに反映される |
| 6 | エラーハンドリング確認 | APIエラー時に適切なエラーメッセージが表示され、自動リトライされる |
| 7 | 長時間運転テスト（5分） | メモリリークなく、ポーリングが継続して動作する |

**受入基準:**
- [ ] 全パネルが同時に表示・更新される
- [ ] パネル間の連携（選択連動）が動作する
- [ ] エラー時の表示と回復が適切
- [ ] 長時間運転で問題が発生しない

---

## 3. アプローチB: 機能別網羅型テスト

### TC-001: TimelineService - セッションファイル特定 (#1)

**対象コンポーネント**: `backend/app/services/timeline_service.py`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-001-01 | project-hash変換 - 通常パス | cwd: `/Users/aegeanwang/Coding/workspaces/python/working/cc-agent-teams-action-monitor` | `-Users-aegeanwang-Coding-workspaces-python-working-cc-agent-teams-action-monitor` | セクション2.2の変換ルール準拠 |
| TC-001-02 | project-hash変換 - ルートパス | cwd: `/home/user/project` | `-home-user-project` | 先頭の/が処理される |
| TC-001-03 | セッションファイル特定 - 正常系 | team_name: 存在するチーム | 有効なPathオブジェクトが返る | config.jsonからleadSessionIdとcwdを取得 |
| TC-001-04 | セッションファイル特定 - config不在 | team_name: 存在しないチーム | `None` | エラーなくNoneを返す |
| TC-001-05 | セッションファイル特定 - leadSessionId未設定 | configにleadSessionIdなし | `None` | Noneを返す |
| TC-001-06 | セッションファイル特定 - ファイル不在 | configは存在するが.jsonlファイル不在 | `None` | Noneを返す |
| TC-001-07 | inboxメッセージ読み込み - 正常系 | 存在するチーム名 | メッセージ配列 | 複数inboxファイルから統合 |
| TC-001-08 | inboxメッセージ読み込み - inboxディレクトリ不在 | team_name: 新規チーム | 空配列 `[]` | エラーなく空配列を返す |
| TC-001-09 | セッションログ読み込み - 正常系 | team_name: 有効なチーム | エントリ配列 | file-history-snapshot含む |
| TC-001-10 | セッションログ読み込み - JSONパースエラー | 不正なJSON行を含む | 不正行をスキップして続行 | 例外をcatchしてcontinue |
| TC-001-11 | 差分読み込み - 初回 | since: `None` | 全エントリ | キャッシュに位置を保存 |
| TC-001-12 | 差分読み込み - 2回目以降 | since: 前回のタイムスタンプ | 新規エントリのみ | キャッシュ位置から読み込み |

---

### TC-002: 統合タイムラインAPI (#2)

**対象コンポーネント**: `backend/app/api/routes/timeline.py`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-002-01 | GET /history - 正常系 | `team_name`: 有効, `limit`: 100 | UnifiedTimelineResponse | items配列とlast_timestamp |
| TC-002-02 | GET /history - 件数制限 | `limit`: 500 | 最大500件 | limitパラメータが機能 |
| TC-002-03 | GET /history - タイプフィルタ | `types`: "thinking,file_change" | 指定タイプのみ | カンマ区切りで複数指定 |
| TC-002-04 | GET /history - before_event_id | `before_event_id`: 有効ID | ページネーション結果 | カーソルベースページネーション |
| TC-002-05 | GET /history - チーム不在 | `team_name`: 無効 | HTTP 404 | 適切なエラーレスポンス |
| TC-002-06 | GET /updates - 正常系 | `team_name`: 有効, `since`: ISO8601 | 差分エントリのみ | since以降のエントリ |
| TC-002-07 | GET /updates - limit制限 | `limit`: 200 | 最大200件 | デフォルト50、最大200 |
| TC-002-08 | GET /updates - 新規データなし | `since`: 最新時刻 | 空配列 | items: [], last_timestamp: 現在時刻 |
| TC-002-09 | GET /updates - 不正sinceフォーマット | `since`: "invalid" | HTTP 400 | バリデーションエラー |
| TC-002-10 | GET /file-changes/{team} - 正常系 | `team_name`: 有効 | FileChangeEntry配列 | ファイル変更専用エンドポイント |

---

### TC-003: タイムライン型定義 (#3)

**対象コンポーネント**: `frontend/src/types/message.ts`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-003-01 | TimelineSource型 - inbox | `'inbox'` | コンパイル成功 | 型定義が正しい |
| TC-003-02 | TimelineSource型 - session | `'session'` | コンパイル成功 | 型定義が正しい |
| TC-003-03 | ExtendedParsedType - 既存タイプ | `'message'` | コンパイル成功 | inbox由来タイプ |
| TC-003-04 | ExtendedParsedType - 新規タイプ | `'user_message'` | コンパイル成功 | session由来タイプ |
| TC-003-05 | ExtendedParsedType - 全タイプ網羅 | 全15タイプ | 各タイプでコンパイル成功 | 型の網羅性 |
| TC-003-06 | UnifiedTimelineEntry - 必須フィールド | id, content, from, timestamp, source, parsedType | コンパイル成功 | 最小限のエントリ |
| TC-003-07 | UnifiedTimelineEntry - 詳細付き | details: {thinking, files, toolName} | コンパイル成功 | 最大限のエントリ |
| TC-003-08 | UnifiedTimelineEntry - ParsedMessage互換 | textプロパティ | contentと同値 | 既存コンポーネント互換 |
| TC-003-09 | MESSAGE_TYPE_CONFIG - アイコン取得 | `getMessageTypeConfig('thinking')` | `{icon: '💭', ...}` | ヘルパー関数動作 |
| TC-003-10 | MESSAGE_TYPE_CONFIG - 未定義タイプ | `getMessageTypeConfig('unknown')` | デフォルト値 | フォールバック動作 |

---

### TC-004: useUnifiedTimelineフック (#4)

**対象コンポーネント**: `frontend/src/hooks/useUnifiedTimeline.ts`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-004-01 | 初回データ取得 | `teamName`: 有効 | entries配列, lastTimestamp | 正常系 |
| TC-004-02 | ポーリング動作 | 30秒間待機 | 自動更新される | refetchInterval機能 |
| TC-004-03 | 差分更新 | 新規メッセージ送信後 | 新規エントリが追加 | sinceパラメータ使用 |
| TC-004-04 | チーム切り替え | `teamName`を変更 | 新チームのデータ | queryKey変更で再取得 |
| TC-004-05 | 無効チーム | `teamName`: `null` | クエリ無効化 | enabled: false |
| TC-004-06 | キャッシュ機能 | 同一チーム再度アクセス | キャッシュから即時表示 | React Queryキャッシュ |
| TC-004-07 | エラーハンドリング | API 500エラー | errorオブジェクト | 適切なエラー状態 |
| TC-004-08 | 手動リフレッシュ | `refetch()`呼び出し | データ再取得 | 手動更新機能 |
| TC-004-09 | ローディング状態 | 初回取得中 | `isLoading: true` | ローディング表示用 |
| TC-004-10 | 更新時刻確認 | `dataUpdatedAt` | Unixタイムスタンプ | 最終更新時刻管理 |

---

### TC-005: ChatMessageBubble拡張 (#5)

**対象コンポーネント**: `frontend/src/components/chat/ChatMessageBubble.tsx`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-005-01 | inboxメッセージ表示 | `source: 'inbox'` | 従来通り表示 | 後方互換性 |
| TC-005-02 | sessionメッセージ表示 | `source: 'session'` | 新デザインで表示 | 拡張機能 |
| TC-005-03 | user_messageアイコン | `parsedType: 'user_message'` | 👤アイコン表示 | MESSAGE_TYPE_CONFIG準拠 |
| TC-005-04 | assistant_messageアイコン | `parsedType: 'assistant_message'` | 🤖アイコン表示 | MESSAGE_TYPE_CONFIG準拠 |
| TC-005-05 | thinkingアイコン | `parsedType: 'thinking'` | 💭アイコン表示 | MESSAGE_TYPE_CONFIG準拠 |
| TC-005-06 | tool_useアイコン | `parsedType: 'tool_use'` | 🔧アイコン表示 | MESSAGE_TYPE_CONFIG準拠 |
| TC-005-07 | file_changeアイコン | `parsedType: 'file_change'` | 📁アイコン表示 | MESSAGE_TYPE_CONFIG準拠 |
| TC-005-08 | thinking詳細表示 | `details.thinking`有り | 折りたたみ可能な思考ブロック | SessionDetailsコンポーネント |
| TC-005-09 | ファイル変更一覧 | `details.files`有り | ファイルバッジ一覧 | 操作種別アイコン付き |
| TC-005-10 | ツール使用情報 | `details.toolName`有り | ツール名表示 | ツール入力展開可能 |
| TC-005-11 | 検索ハイライト | `searchQuery`指定 | 該当テキストハイライト | 既存機能維持 |
| TC-005-12 | 選択状態表示 | `isSelected: true` | 選択枠表示 | 既存機能維持 |

---

### TC-006: 構造化メッセージパーサー (#6)

**対象コンポーネント**: `backend/app/services/message_parser.py`

**テストケース:**

| ID | テスト名 | 入力JSON | 期待結果 | 備考 |
|----|---------|---------|---------|------|
| TC-006-01 | task_assignmentパース | `{"type":"task_assignment","taskId":"6","subject":"テスト"}` | parsed_type: task_assignment | タスク割り当て |
| TC-006-02 | task_completedパース | `{"type":"task_completed","taskId":"6"}` | parsed_type: task_completed | タスク完了 |
| TC-006-03 | idle_notificationパース | `{"type":"idle_notification","idleReason":"available"}` | parsed_type: idle_notification | アイドル通知 |
| TC-006-04 | shutdown_requestパース | `{"type":"shutdown_request","reason":"完了"}` | parsed_type: shutdown_request | シャットダウン要求 |
| TC-006-05 | shutdown_responseパース | `{"type":"shutdown_response","approve":true}` | parsed_type: shutdown_response | シャットダウン応答 |
| TC-006-06 | plan_approval_requestパース | `{"type":"plan_approval_request"}` | parsed_type: plan_approval_request | プラン承認要求 |
| TC-006-07 | plan_approval_responseパース | `{"type":"plan_approval_response","approve":false}` | parsed_type: plan_approval_response | プラン承認応答 |
| TC-006-08 | 不正JSON | `{"invalid` | Noneまたは例外 | エラーハンドリング |
| TC-006-09 | typeフィールド欠落 | `{"content":"テスト"}` | 'unknown'またはデフォルト | フォールバック |
| TC-006-10 | 空文字 | `""` | None | エッジケース |

---

### TC-007: エージェント状態推論ロジック (#7)

**対象コンポーネント**: `backend/app/services/agent_status_service.py`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-007-01 | idle状態推論 | idle_notification受信後5分 | status: idle | アイドル判定 |
| TC-007-02 | working状態推論 | in_progressタスクあり | status: working | 作業中判定 |
| TC-007-03 | waiting状態推論 | blockedなin_progressタスク | status: waiting | 待ち状態判定 |
| TC-007-04 | error状態推論 | 30分以上無活動 | status: error | エラー判定 |
| TC-007-05 | completed状態推論 | 全タスクcompleted | status: completed | 完了判定 |
| TC-007-06 | プログレス計算 - 0% | 担当0/完了0 | progress: 0 | 未開始 |
| TC-007-07 | プログレス計算 - 50% | 担当2/完了1 | progress: 50 | 進行中 |
| TC-007-08 | プログレス計算 - 100% | 担当2/完了2 | progress: 100 | 完了 |
| TC-007-09 | current_task推論 | task_assignmentメッセージ | currentTaskId: 該当ID | 現在タスク特定 |
| TC-007-10 | モデル名抽出 | sessionログにmodelフィールド | model: モデル名 | セッションログ解析 |

---

### TC-008: 拡張エージェントカード (#8)

**対象コンポーネント**: `frontend/src/components/agent/ExpandedAgentCard.tsx`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-008-01 | プログレスバー表示 | `progress: 75` | 75% filledバー | 視覚的進捗 |
| TC-008-02 | idleステータス | `status: idle` | 💤 + 黄色 | 状態表示 |
| TC-008-03 | workingステータス | `status: working` | 🔵 + 青色 | 状態表示 |
| TC-008-04 | waitingステータス | `status: waiting` | ⏳ + 紫色 | 状態表示 |
| TC-008-05 | errorステータス | `status: error` | ❌ + 赤色 | 状態表示 |
| TC-008-06 | completedステータス | `status: completed` | ✅ + 緑色 | 状態表示 |
| TC-008-07 | activeForm表示 | `activeForm: "実装中"` | 🔄 実装中 | 現在作業表示 |
| TC-008-08 | 経過時間表示 | `lastActivityAt: 5分前` | 「5分前」 | 相対時間 |
| TC-008-09 | モデル名表示 | `model: claude-opus` | モデル名バッジ | 使用モデル |
| TC-008-10 | 関連ファイル一覧 | `touchedFiles: [...]` | ファイルパスリスト | ファイル紐付け |

---

### TC-009: タスク進捗トラッキング (#9)

**対象コンポーネント**: `frontend/src/components/tasks/ExpandedTaskCard.tsx`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-009-01 | 進捗バー表示 | `progress: 60` | 60%バー | 進捗可視化 |
| TC-009-02 | activeForm表示 | `activeForm: "テスト作成中"` | テキスト表示 | 現在作業 |
| TC-009-03 | blockedBy表示 | `blockedBy: ["task-1"]` | 🔗 task-1 | ブロック元 |
| TC-009-04 | blocks表示 | `blocks: ["task-3"]` | 🔗 task-3 | ブロック先 |
| TC-009-05 | 依存関係パスハイライト | 依存タスククリック | ハイライト表示 | 視覚的連携 |
| TC-009-06 | 関連ファイル表示 | タスクに紐付くfiles | ファイル一覧 | ファイル紐付け |
| TC-009-07 | タイムライン連携 | 「タイムライン」ボタンクリック | タイムラインにフィルタ | 連携機能 |
| TC-009-08 | ステータス色分け | `status: in_progress` | 青色バー | ステータス別色 |
| TC-009-09 | 完了タスク | `status: completed` | 緑色バー 100% | 完了表示 |
| TC-009-10 | 担当者リンク | `enableOwnerLink: true` | エージェント名リンク | ナビゲーション |

---

### TC-010: ファイル変更監視パネル (#10)

**対象コンポーネント**: `frontend/src/components/file/FileChangesPanel.tsx`

**テストケース:**

| ID | テスト名 | 入力 | 期待結果 | 備考 |
|----|---------|------|---------|------|
| TC-010-01 | ファイル変更一覧 | APIレスポンス | 変更リスト表示 | 基本機能 |
| TC-010-02 | createdアイコン | `operation: created` | ✨アイコン | 作成操作 |
| TC-010-03 | modifiedアイコン | `operation: modified` | ✏️アイコン | 編集操作 |
| TC-010-04 | deletedアイコン | `operation: deleted` | 🗑️アイコン | 削除操作 |
| TC-010-05 | readアイコン | `operation: read` | 📖アイコン | 読取操作 |
| TC-010-06 | 操作フィルタ | `operations: ['created']` | 作成のみ表示 | フィルタ機能 |
| TC-010-07 | ディレクトリフィルタ | `directories: ['src']` | src配下のみ | パスフィルタ |
| TC-010-08 | 拡張子フィルタ | `extensions: ['ts']` | .tsファイルのみ | 拡張子フィルタ |
| TC-010-09 | エージェントフィルタ | `agents: ['frontend-dev-a']` | 該当エージェントのみ | エージェントフィルタ |
| TC-010-10 | リアルタイム更新 | 新規ファイル変更 | 自動追加表示 | ポーリング連携 |

---

## 4. テスト環境要件

### 4.1 バックエンド

```bash
# 必要なパッケージ
pip install pytest pytest-asyncio httpx

# テストデータ準備
~/.claude/teams/test-team/config.json  # テスト用チーム設定
~/.claude/projects/{hash}/{sessionId}.jsonl  # テスト用セッションログ
```

### 4.2 フロントエンド

```bash
# 必要なパッケージ
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# 環境変数
VITE_API_BASE_URL=http://localhost:8000/api
```

### 4.3 テストデータ

**セッションログサンプル** (`test-session.jsonl`):
```json
{"type": "user", "content": "テストメッセージ", "timestamp": "2026-02-21T10:00:00Z"}
{"type": "assistant", "content": "応答", "timestamp": "2026-02-21T10:00:05Z"}
{"type": "thinking", "thinking": "思考内容", "timestamp": "2026-02-21T10:00:06Z"}
{"type": "tool_use", "toolUse": {"name": "read_file", "input": {"path": "test.py"}}, "timestamp": "2026-02-21T10:00:10Z"}
{"type": "file-history-snapshot", "fileChanges": [{"path": "test.py", "operation": "modified"}], "timestamp": "2026-02-21T10:00:15Z"}
```

---

## 5. 欠陥管理

### 優先度定義

| 優先度 | 定義 | 対応期限 |
|--------|------|---------|
| P0 | ブロッカー - 主要機能が動作しない | 即時 |
| P1 | 高 - 重要機能に影響 | 1日以内 |
| P2 | 中 - 軽微な問題、回避策あり | 3日以内 |
| P3 | 低 - 見た目の問題、機能影響なし | 次回リリース |

### 欠陥報告フォーマット

```markdown
**ID**: BUG-001
**タイトル**: [簡潔な説明]
**再現手順**:
1. [手順1]
2. [手順2]
**期待結果**: [期待する動作]
**実際の結果**: [実際の動作]
**スクリーンショット**: [添付]
**環境**: [ブラウザ/OS/バージョン]
**優先度**: [P0/P1/P2/P3]
```

---

## 6. 承認サインオフ

| 役割 | 名前 | 署名 | 日付 |
|------|------|------|------|
| テスト実施者 | | | |
| 開発リーダー | | | |
| プロダクトオーナー | | | |
| ステークホルダー | | | |

---

**変更履歴:**

| 日付 | 版 | 変更内容 |
|------|-----|---------|
| 2026-02-21 | 1.0 | 初版作成 - アプローチA（統合シナリオ型）とアプローチB（機能別網羅型）を含む |
