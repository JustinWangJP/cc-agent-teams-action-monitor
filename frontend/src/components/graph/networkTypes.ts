/**
 * エージェント通信ネットワークグラフの型定義。
 *
 * @module components/graph/networkTypes
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

/**
 * エージェントノード。
 *
 * D3.js フォースシミュレーション用ノードデータ。
 * エージェント間の通信関係を可視化するためのノード定義。
 */
export interface AgentNode extends SimulationNodeDatum {
  /** エージェントID */
  id: string;
  /** 表示ラベル（エージェント名） */
  label: string;
  /** 使用モデル名 */
  model: string;
  /** モデル別の色 */
  modelColor: string;
  /** モデル別のアイコン */
  modelIcon: string;
  /** 総メッセージ数 */
  messageCount: number;
  /** 送信メッセージ数 */
  sentCount: number;
  /** 受信メッセージ数 */
  receivedCount: number;
  /** X座標（シミュレーションによって自動設定） */
  x?: number;
  /** Y座標（シミュレーションによって自動設定） */
  y?: number;
  /** X速度 */
  vx?: number;
  /** Y速度 */
  vy?: number;
  /** インデックス */
  index?: number;
}

/**
 * 通信エッジ。
 *
 * エージェント間の通信関係を表すリンクデータ。
 */
export interface CommunicationEdge extends SimulationLinkDatum<AgentNode> {
  /** ソースノード（IDまたはAgentNodeオブジェクト） */
  source: string | AgentNode;
  /** ターゲットノード（IDまたはAgentNodeオブジェクト） */
  target: string | AgentNode;
  /** 通信回数 */
  count: number;
  /** メッセージタイプ別のカウント */
  types: {
    /** 通常メッセージ */
    message: number;
    /** アイドル通知 */
    idle_notification: number;
    /** シャットダウン要求 */
    shutdown_request: number;
    /** シャットダウン応答 */
    shutdown_response: number;
    /** プラン承認/却下 */
    plan_approval: number;
    /** その他 */
    other: number;
  };
  /** 主要なメッセージタイプ */
  dominantType: string;
  /** 最終通信タイムスタンプ */
  lastTimestamp: string;
}

/**
 * ネットワークデータ。
 *
 * グラフ描画用の完全なデータセット。
 */
export interface NetworkData {
  /** ノード配列 */
  nodes: AgentNode[];
  /** エッジ配列 */
  edges: CommunicationEdge[];
  /** チーム名 */
  teamName: string;
  /** メタデータ */
  meta: {
    /** 総メッセージ数 */
    totalMessages: number;
    /** タイムスタンプ範囲 */
    timeRange: { min: string; max: string };
  };
}

/**
 * グラフ設定。
 */
export interface NetworkGraphConfig {
  /** ノード半径 */
  nodeRadius: number;
  /** ノードパディング（衝突判定用） */
  nodePadding: number;
  /** リンク距離 */
  linkDistance: number;
  /** 反発力の強さ（負の値で反発） */
  chargeStrength: number;
  /** センター引力の強さ */
  centerStrength: number;
  /** シミュレーションの減衰率 */
  velocityDecay: number;
  /** アルファ減衰率 */
  alphaDecay: number;
  /** アルファ最小値 */
  alphaMin: number;
}

/**
 * エッジタイプ別の色設定。
 */
export interface EdgeTypeColors {
  /** 通常メッセージの色 */
  message: string;
  /** アイドル通知の色 */
  idle_notification: string;
  /** シャットダウン要求の色 */
  shutdown_request: string;
  /** シャットダウン応答の色 */
  shutdown_response: string;
  /** プラン承認の色 */
  plan_approval: string;
  /** その他の色 */
  other: string;
}

/**
 * グラフコンポーネントのProps。
 */
export interface AgentNetworkGraphProps {
  /** チーム名 */
  teamName: string;
  /** ネットワークデータ（オプション：未指定時はAPIから取得） */
  data?: NetworkData;
  /** ローディング状態 */
  isLoading?: boolean;
  /** エラーメッセージ */
  error?: string | null;
  /** グラフ幅（デフォルト: 800） */
  width?: number;
  /** グラフ高さ（デフォルト: 500） */
  height?: number;
  /** ノードクリック時のコールバック */
  onNodeClick?: (node: AgentNode) => void;
  /** ノードホバー時のコールバック */
  onNodeHover?: (node: AgentNode | null) => void;
  /** カスタム設定（オプション） */
  config?: Partial<NetworkGraphConfig>;
  /** カスタムエッジ色（オプション） */
  colors?: Partial<EdgeTypeColors>;
}
