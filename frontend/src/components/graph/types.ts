/**
 * D3.js タスク依存グラフの型定義。
 *
 * @module components/graph/types
 */

import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

/**
 * タスクノード。
 *
 * D3.js フォースシミュレーション用ノードデータ。
 * SimulationNodeDatum を拡張してタスク固有のプロパティを追加します。
 */
export interface TaskNode extends SimulationNodeDatum {
  /** タスクID */
  id: string;
  /** 元のタスクID（データベースID） */
  taskId: string;
  /** 表示ラベル（タスク件名の短縮版） */
  label: string;
  /** タスク件名（フルテキスト） */
  subject: string;
  /** タスクステータス */
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  /** 担当エージェント名 */
  owner?: string;
  /** チーム名 */
  teamName?: string;
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
 * タスクエッジ（依存関係）。
 *
 * D3.js フォースシミュレーション用リンクデータ。
 * SimulationLinkDatum を拡張します。
 */
export interface TaskEdge extends SimulationLinkDatum<TaskNode> {
  /** ソースノード（IDまたはTaskNodeオブジェクト） */
  source: string | TaskNode;
  /** ターゲットノード（IDまたはTaskNodeオブジェクト） */
  target: string | TaskNode;
}

/**
 * グラフ設定。
 */
export interface GraphConfig {
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
  /** アルファターゲット（ドラッグ終了時） */
  alphaMin: number;
}

/**
 * ステータス別の色設定。
 */
export interface StatusColors {
  pending: string;
  in_progress: string;
  completed: string;
  deleted: string;
}

/**
 * グラフコンポーネントのProps。
 */
export interface TaskDependencyGraphProps {
  /** タスク配列 */
  tasks: Array<{
    id: string;
    subject: string;
    status: 'pending' | 'in_progress' | 'completed' | 'deleted';
    owner?: string;
    blockedBy?: string[];
    teamName?: string;
  }>;
  /** グラフ幅（デフォルト: 800） */
  width?: number;
  /** グラフ高さ（デフォルト: 500） */
  height?: number;
  /** ノードクリック時のコールバック */
  onNodeClick?: (node: TaskNode) => void;
  /** ノードホバー時のコールバック */
  onNodeHover?: (node: TaskNode | null) => void;
  /** カスタム設定（オプション） */
  config?: Partial<GraphConfig>;
  /** カスタム色（オプション） */
  colors?: Partial<StatusColors>;
}
