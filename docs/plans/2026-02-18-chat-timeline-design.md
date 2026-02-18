# チャット形式メッセージタイムライン設計書

## 概要

vis-timelineベースの時系列表示を廃止し、エージェント間のメッセージ通信をLINE/Slack風のチャット形式で表示する新しいUIを実装する。

## 背景と目的

### 現状の問題
- vis-timelineは時系列表示に向いているが、エージェント間の会話の文脈が把握しにくい
- メッセージのやり取りが横スクロールで追いにくい
- エージェントごとの発言がグループ化されておらず、会話の流れが見えにくい

### 目的
- エージェント間のメッセージ通信を会話形式で直感的に表示
- 「誰が」「誰に」「何をしたか」を明確に可視化
- 最新のメッセージを自動的に追跡し、リアルタイム性を保持

## 設計方針

### 表示形式
- **時系列ベース**: 全メッセージを時刻順（昇順）に表示
- **個別バブル形式**: 各メッセージを独立した吹き出しバブルで表示
- **スマートスクロール**: 最下部表示時のみ自動スクロール

### 技術スタック
- React 18 + TypeScript
- Tailwind CSS（スタイリング）
- Radix UI（スクロールエリア、アバター）
- date-fns（日時フォーマット）

## コンポーネント構成

```
ChatTimelinePanel（コンテナ）
├── ChatMessageList（メッセージリスト）
│   ├── ChatMessageBubble（個別メッセージバブル）× N
│   ├── NewMessageNotification（新着通知）
│   └── ScrollToBottomButton（最下部へボタン）
├── MessageDetailPanel（詳細パネル - スライドイン）
└── ChatHeader（ヘッダー）
    ├── MessageFilter（フィルター）
    └── PollingIntervalSelector（更新間隔）
```

## コンポーネント詳細

### 1. ChatMessageBubble

**役割**: 個別メッセージの表示

**Props**:
```typescript
interface ChatMessageBubbleProps {
  message: ParsedMessage;
  isHighlighted?: boolean;
  onClick?: (message: ParsedMessage) => void;
}
```

**表示要素**:
- アバター（エージェント名の頭文字またはアイコン）
- 送信者名
- メッセージバブル（吹き出し形式）
- 時刻（相対時間: "3分前" / 絶対時間: "10:30"）
- メッセージタイプアイコン

**スタイル**:
- バブル背景: 送信者ごとに異なる色を割り当て
- アバター: 円形、エージェント名の頭文字表示
- 時刻: バブルの右下に小さく表示

### 2. ChatMessageList

**役割**: メッセージリストの表示とスクロール管理

**Props**:
```typescript
interface ChatMessageListProps {
  messages: ParsedMessage[];
  selectedMessageId?: string;
  onMessageClick?: (message: ParsedMessage) => void;
  autoScroll?: boolean;
}
```

**機能**:
- バーチャルスクロール（大量メッセージ対応）
- スマート自動スクロール
  - 最下部から100px以内にいる場合: 自動スクロール
  - それ以上上にいる場合: 「新着メッセージ」通知を表示
- 既読/未読状態の表示

### 3. MessageDetailPanel

**役割**: メッセージ詳細の表示（スライドインパネル）

**Props**:
```typescript
interface MessageDetailPanelProps {
  message: ParsedMessage | null;
  isOpen: boolean;
  onClose: () => void;
}
```

**表示内容**:
- 送信者情報（名前、アバター）
- 受信者情報
- メッセージ本文
- タイムスタンプ（詳細）
- メッセージタイプ
- JSON生データ（折りたたみ）
- コピーボタン

### 4. ChatTimelinePanel

**役割**: 全体のレイアウトと状態管理

**状態**:
- messages: フィルター済みメッセージリスト
- selectedMessage: 選択中のメッセージ
- isDetailOpen: 詳細パネルの開閉状態
- hasNewMessages: 新着メッセージフラグ

## データフロー

```
1. API Response (ParsedMessage[])
   ↓
2. TimelinePanel (フィルター適用)
   ↓
3. ChatMessageList (時刻昇順にソート)
   ↓
4. ChatMessageBubble[] (個別レンダリング)
```

## インタラクション設計

### 自動スクロール動作

```
ユーザーのスクロール位置
    │
    ├── 最下部〜100px以内 ──→ 新規メッセージで自動スクロール
    │
    └── 100px以上上 ───────→ 自動スクロールせず、通知表示
                                    ↓
                              「新着メッセージ」をクリック
                                    ↓
                              最下部へスクロール
```

### メッセージクリック時の動作

```
メッセージクリック
    ↓
右側から詳細パネルがスライドイン
    ↓
メッセージ詳細を表示
    ↓
×ボタンまたは外側クリックで閉じる
```

## スタイリング仕様

### カラーパレット（エージェント別）

各エージェントに一意の色を割り当て、視覚的に識別しやすくする：

```
team-lead:    bg-blue-100    text-blue-800
backend-dev:  bg-green-100   text-green-800
frontend-dev: bg-purple-100  text-purple-800
reviewer:     bg-yellow-100  text-yellow-800
未割り当て:    bg-gray-100    text-gray-800
```

### メッセージタイプアイコン

```
message:              💬
idle_notification:    💤
shutdown_request:     🛑
shutdown_response:    ✓
plan_approval_request: 📋
plan_approval_response: ✅
task_assignment:      📝
unknown:              ❓
```

### レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 メッセージタイムライン              30件のメッセージ      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐  ┌─────────────────────────────┐                  │
│  │ TL  │  │ team-lead                   │                  │
│  │     │  │ タスクを確認しました        │                  │
│  └─────┘  │ 進めてください             │  10:30            │
│           └─────────────────────────────┘                  │
│                                                             │
│  ┌─────┐  ┌─────────────────────────────┐                  │
│  │ BD  │  │ backend-dev                 │                  │
│  │     │  │ 了解です                    │  10:31            │
│  └─────┘  └─────────────────────────────┘                  │
│                                                             │
│                    ┌─────────────────┐                     │
│                    │ 新着メッセージ 2件 │ ← 通知ボタン      │
│                    └─────────────────┘                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐  ┌───────────────────────┐ │
│ │ 送信者: team-lead           │  │ 送信者情報           │ │
│ │ 受信者: backend-dev         │  │ backend-dev          │ │
│ │ 時刻: 2026-02-17 10:30:00   │  │                      │ │
│ │ タイプ: 💬 メッセージ       │  │ メッセージ詳細       │ │
│ │                             │  │ ...                  │ │
│ │ 本文:                       │  └───────────────────────┘ │
│ │ タスクを確認しました        │                            │
│ │ 進めてください             │                            │
│ │                             │                            │
│ │ [生データを表示 ▼]          │                            │
│ └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

## パフォーマンス考慮事項

### バーチャルスクロール
- 100件以上のメッセージがある場合、react-windowまたはreact-virtualizedを検討
- 画面に表示されているメッセージのみDOMに描画

### メモ化
- ChatMessageBubbleはReact.memoでラップ
- メッセージ内容が変更されない限り再レンダリングしない

### ポーリング最適化
- 新規メッセージのみを取得するAPIを検討（差分更新）
- タブが非アクティブ時はポーリング間隔を延長

## エージェント間メッセージ（DM）の扱い

**機能概要**:
- グループチャット内にエージェント間のDMを表示
- 秘密メッセージは「🔒 秘密」ラベルを付与して表示
- 自分が送信者または受信者の場合のみ表示
- タイムスタンプで通常メッセージと混在して時系列表示

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 team-lead → backend-dev            🔒 秘密  10:30      │
│ タスクの期限調整について相談があります                     │
└─────────────────────────────────────────────────────────────┘
```

**データ構造**:
```typescript
interface DirectMessage extends ParsedMessage {
  isPrivate: true;
  to: string;      // 受信者エージェント名
  visibleTo: string[]; // [送信者, 受信者]
}
```

## エラーハンドリング

### 表示エラー
- メッセージパース失敗時: 「メッセージを表示できません」と代替表示
- 無効なタイムスタンプ: 「日時不明」と表示

### データ取得エラー
- エラーメッセージをリスト上部に表示
- 「再試行」ボタンを提供

## テスト計画

### 単体テスト
- ChatMessageBubble: 各種メッセージタイプの表示
- ChatMessageList: スマートスクロールの動作
- MessageDetailPanel: スライドイン/アウトのアニメーション

### 統合テスト
- メッセージクリック → 詳細パネル表示の流れ
- 新規メッセージ受信時の自動スクロール動作

### E2Eテスト
- フィルター適用時の表示確認
- 大量メッセージ（100件以上）のスクロールパフォーマンス

## 追加機能仕様（本実装に含む）

### 1. メッセージ検索 + ハイライト（優先度：高）

**機能概要**:
- チャットヘッダーに検索ボックスを配置
- リアルタイム検索（入力中に絞り込み）
- 検索結果のハイライト表示（黄色背景）
- 検索結果件数の表示
- 検索対象：送信者名、メッセージ本文、メタデータ

**コンポーネント**:
```typescript
interface ChatSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  onPrevResult: () => void;  // 前の結果へ
  onNextResult: () => void;  // 次の結果へ
}
```

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 検索...                              5件の結果  ↑ ↓   │
└─────────────────────────────────────────────────────────────┘
```

### 2. メッセージタイプによる絞り込み（優先度：中）

**機能概要**:
- ドロップダウンまたはチップでメッセージタイプを選択
- 複数選択可能
- 選択中のフィルターを視覚的に表示

**フィルターオプション**:
- 💬 メッセージ
- 📝 タスク関連
- 🛑 シャットダウン関連
- 📋 プラン承認関連
- 💤 アイドル通知

**コンポーネント**:
```typescript
interface MessageTypeFilterProps {
  selectedTypes: MessageType[];
  onChange: (types: MessageType[]) => void;
}
```

### 3. エージェントステータス表示（優先度：中）

**機能概要**:
- アバターにオンライン状態を表示
- 状態：🟢 オンライン / 🟡 アイドル / ⚫ オフライン
- 最終アクティビティ時刻の表示（ツールチップ）

**状態判定ロジック**:
- 🟢 オンライン: 5分以内にメッセージ送信
- 🟡 アイドル: 5分〜30分以内
- ⚫ オフライン: 30分以上経過

**データ取得**:
- `/api/teams/{team}/agents/status` エンドポイント追加
- HTTP Pollingで定期更新（既存ポーリング間隔を活用）

### 4. 会話のブックマーク（優先度：低）

**機能概要**:
- メッセージにスター（⭐）を付与
- ブックマーク一覧ビュー
- ローカルストレージに保存（永続化）

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 team-lead                                    ⭐ 10:30   │
│ タスクを確認しました                                       │
└─────────────────────────────────────────────────────────────┘
```

**コンポーネント**:
```typescript
interface BookmarkButtonProps {
  messageId: string;
  isBookmarked: boolean;
  onToggle: () => void;
}
```

### 5. タイピングインジケーター（優先度：低）

**機能概要**:
- エージェントが入力中であることを表示
- HTTP Pollingによる擬似リアルタイム更新
- 入力開始から3秒後に表示、入力停止後3秒で消える
- 複数エージェント対応

**UI**:
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  team-lead が入力中...  ● ● ●                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**実装方式**:
- HTTP Pollingで `/api/teams/{team}/agents/typing` を定期取得
- ローカル状態でタイムアウト管理（3秒）

---

## 今後の拡張案（将来実装）

### 優先度：高
- 未読メッセージ数のバッジ表示

### 優先度：中
- メッセージへのリアクション（絵文字）
- スレッド返信機能

### 優先度：低
- メッセージへのリアクション（絵文字）
- スレッド返信機能

## 関連ファイル

### 新規作成
- `frontend/src/components/chat/ChatTimelinePanel.tsx`
- `frontend/src/components/chat/ChatMessageList.tsx`
- `frontend/src/components/chat/ChatMessageBubble.tsx`
- `frontend/src/components/chat/MessageDetailPanel.tsx`
- `frontend/src/components/chat/ChatHeader.tsx`
- `frontend/src/hooks/useChatScroll.ts`
- `frontend/src/hooks/useSmartScroll.ts`

### 修正
- `frontend/src/components/timeline/TimelinePanel.tsx`（統合または置き換え）
- `frontend/src/App.tsx`（ルーティング/表示切り替え）

### 削除予定
- `frontend/src/components/timeline/MessageTimeline.tsx`
- `frontend/src/components/timeline/timeline.css`

## 参考実装

### 類似UI例
- SlackのDM画面
- Discordのサーバーチャンネル
- LINEのグループトーク

---

作成日: 2026-02-18
