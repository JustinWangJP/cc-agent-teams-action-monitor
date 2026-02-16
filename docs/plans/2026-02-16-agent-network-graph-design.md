# エージェント通信ネットワークグラフ 設計書

## 1. 概要

### 1.1 目的

チーム内のエージェント間通信を D3.js フォースグラフで可視化し、通信パターンと関係性を直感的に理解できるようにする。

### 1.2 背景

機能設計書の P2 機能として位置づけられていた「エージェント通信ネットワーク」を実装する。既存のタスク依存グラフ（TaskDependencyGraph）と同様のパターンで実装し、一貫性を保つ。

---

## 2. データ構造

### 2.1 ノード: AgentNode

```typescript
interface AgentNode extends SimulationNodeDatum {
  /** エージェント名（一意識別子） */
  id: string;
  /** 表示ラベル */
  label: string;
  /** モデルID */
  model: string;
  /** モデルカラー（HEX） */
  modelColor: string;
  /** モデルアイコン */
  modelIcon: string;
  /** 送受信メッセージ総数 */
  messageCount: number;
  /** 送信メッセージ数 */
  sentCount: number;
  /** 受信メッセージ数 */
  receivedCount: number;
  /** X座標（シミュレーション自動設定） */
  x?: number;
  /** Y座標（シミュレーション自動設定） */
  y?: number;
}
```

### 2.2 エッジ: CommunicationEdge

```typescript
interface CommunicationEdge extends SimulationLinkDatum<AgentNode> {
  /** 送信者ID */
  source: string | AgentNode;
  /** 受信者ID */
  target: string | AgentNode;
  /** メッセージ総数 */
  count: number;
  /** タイプ別メッセージ数 */
  types: {
    message: number;
    idle_notification: number;
    shutdown_request: number;
    shutdown_response: number;
    plan_approval: number;
    other: number;
  };
  /** 最も多いメッセージタイプ */
  dominantType: string;
  /** 最終通信時刻（ISO 8601） */
  lastTimestamp: string;
}
```

### 2.3 API レスポンス

```typescript
interface NetworkData {
  /** ノード配列 */
  nodes: AgentNode[];
  /** エッジ配列 */
  edges: CommunicationEdge[];
  /** チーム名 */
  teamName: string;
  /** メタデータ */
  meta: {
    totalMessages: number;
    timeRange: { min: string; max: string };
  };
}
```

---

## 3. API エンドポイント

### 3.1 新規エンドポイント

```
GET /api/teams/{team_name}/messages/network
```

**クエリパラメータ**:
- `start_time` (Optional): 開始時刻 (ISO 8601)
- `end_time` (Optional): 終了時刻 (ISO 8601)

**実装ロジック**:
1. チームの全インボックスを読み込み
2. 各メッセージから送信者・受信者を抽出
3. ノード（エージェント）とエッジ（通信関係）を集計
4. モデル情報を結合して返却

---

## 4. コンポーネント設計

### 4.1 ファイル構成

```
frontend/src/components/graph/
├── AgentNetworkGraph.tsx    # メインコンポーネント
├── networkTypes.ts          # 型定義
├── networkUtils.ts          # ユーティリティ関数
├── index.ts                 # エクスポート（更新）
├── TaskDependencyGraph.tsx  # 既存
├── types.ts                 # 既存
└── utils.ts                 # 既存
```

### 4.2 AgentNetworkGraph Props

```typescript
interface AgentNetworkGraphProps {
  /** チーム名 */
  teamName: string;
  /** グラフ幅（デフォルト: 800） */
  width?: number;
  /** グラフ高さ（デフォルト: 500） */
  height?: number;
  /** ノードクリック時のコールバック */
  onNodeClick?: (node: AgentNode) => void;
  /** ノードホバー時のコールバック */
  onNodeHover?: (node: AgentNode | null) => void;
  /** カスタム設定 */
  config?: Partial<NetworkGraphConfig>;
}
```

### 4.3 グラフ設定

```typescript
interface NetworkGraphConfig {
  nodeRadius: number;        // ベースノード半径: 20
  nodePadding: number;       // ノードパディング: 10
  linkDistance: number;      // リンク距離: 100
  chargeStrength: number;    // 反発力: -300
  centerStrength: number;    // 中心引力: 0.1
  velocityDecay: number;     // 減衰率: 0.6
}
```

---

## 5. ビジュアル仕様

### 5.1 ノード

| 属性 | 計算式 |
|-----|-------|
| 半径 | `baseRadius + Math.log2(messageCount + 1) * 3` |
| 塗りつぶし | モデル別カラー（config/models.ts 参照） |
| ストローク | 白（#FFFFFF）、幅2 |
| アイコン | モデル別絵文字（🟣🔵🟢🟡🔴⚪） |
| ラベル | エージェント名（ノード下） |

### 5.2 エッジ

| 属性 | 計算式 |
|-----|-------|
| 太さ | `baseWidth + Math.log2(count + 1) * 1.5` |
| 色 | タイプ別（message=#94A3B8, idle=#F59E0B, shutdown=#EF4444） |
| 不透明度 | 0.6 |
| 矢印 | 有効（marker-end） |

### 5.3 凡例

画面右上に表示:
- モデル別アイコン
- エッジタイプ別色

---

## 6. インタラクション

| 操作 | 動作 |
|-----|------|
| ノードドラッグ | ノード位置移動、シミュレーション再開 |
| ホイール | ズームイン/アウト（0.1x 〜 4x） |
| 背景ドラッグ | パン |
| ノードクリック | 選択、onNodeClick コールバック発火 |
| ノードホバー | ハイライト、onNodeHover コールバック発火 |

---

## 7. App.tsx 統合

### 7.1 ビュー追加

既存の4ビューに5つ目を追加:

```typescript
const VIEWS = [
  { id: 'overview' as const, label: '概要', icon: LayoutDashboard },
  { id: 'timeline' as const, label: 'タイムライン', icon: MessageSquare },
  { id: 'tasks' as const, label: 'タスク', icon: ListTodo },
  { id: 'graphs' as const, label: '依存グラフ', icon: GitBranch },
  { id: 'network' as const, label: '通信ネットワーク', icon: Network }, // 新規
];
```

### 7.2 ビュー表示

```tsx
{/* Network Graph View */}
{currentView === 'network' && (
  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
      エージェント通信ネットワーク
    </h2>
    {selectedTeam ? (
      <AgentNetworkGraph
        teamName={selectedTeam}
        width={1100}
        height={600}
        onNodeClick={(node) => console.log('Selected:', node)}
      />
    ) : (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">チームを選択してください</p>
      </div>
    )}
  </div>
)}
```

---

## 8. テスト計画

### 8.1 ユニットテスト

- `networkUtils.test.ts`: ノード・エッジ構築ロジック
- `AgentNetworkGraph.test.tsx`: コンポーネントレンダリング

### 8.2 統合テスト

- API エンドポイントのレスポンス検証
- フロントエンドとバックエンドの結合

---

## 9. 実装順序

1. **バックエンド**: API エンドポイント実装
2. **型定義**: networkTypes.ts 作成
3. **ユーティリティ**: networkUtils.ts 作成
4. **コンポーネント**: AgentNetworkGraph.tsx 実装
5. **統合**: App.tsx にビュー追加
6. **テスト**: ユニットテスト作成

---

## 10. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-02-16 | 1.0.0 | 初版作成 |

*作成者: Claude Code*
