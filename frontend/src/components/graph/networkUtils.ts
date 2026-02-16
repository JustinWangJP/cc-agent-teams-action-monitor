/**
 * エージェント通信ネットワークグラフのユーティリティ関数。
 *
 * @module components/graph/networkUtils
 */

import type { Member } from '@/types/team';
import type {
  NetworkGraphConfig,
  EdgeTypeColors,
  AgentNode,
  CommunicationEdge,
} from './networkTypes';

/**
 * デフォルトのグラフ設定。
 */
export const DEFAULT_NETWORK_CONFIG: NetworkGraphConfig = {
  nodeRadius: 20,
  nodePadding: 10,
  linkDistance: 100,
  chargeStrength: -300,
  centerStrength: 0.1,
  velocityDecay: 0.6,
  alphaDecay: 0.0228,
  alphaMin: 0.001,
};

/**
 * デフォルトのエッジタイプ別カラー。
 *
 * Tailwind CSS カラーパレットに基づいています。
 */
export const DEFAULT_EDGE_TYPE_COLORS: EdgeTypeColors = {
  message: '#94A3B8',           // slate-400
  idle_notification: '#F59E0B', // amber-500
  shutdown_request: '#EF4444',  // red-500
  shutdown_response: '#10B981', // green-500
  plan_approval: '#8B5CF6',     // violet-500
  other: '#6B7280',             // gray-500
};

/**
 * ノード半径を計算。
 *
 * メッセージ数に応じてノードサイズを動的に変更します。
 *
 * @param messageCount - メッセージ数
 * @param baseRadius - 基本半径（デフォルト: 20）
 * @returns 計算されたノード半径
 */
export function calculateNodeRadius(
  messageCount: number,
  baseRadius: number = 20
): number {
  return baseRadius + Math.log2(messageCount + 1) * 3;
}

/**
 * エッジ太さを計算。
 *
 * 通信回数に応じてエッジ太さを動的に変更します。
 *
 * @param count - 通信回数
 * @param baseWidth - 基本太さ（デフォルト: 1.5）
 * @returns 計算されたエッジ太さ
 */
export function calculateEdgeWidth(
  count: number,
  baseWidth: number = 1.5
): number {
  return baseWidth + Math.log2(count + 1) * 1.5;
}

/**
 * エッジの主要タイプを取得。
 *
 * 通信回数が最も多いメッセージタイプを判定します。
 *
 * @param types - メッセージタイプ別カウント
 * @returns 主要なメッセージタイプ名
 */
export function getDominantType(types: Record<string, number>): string {
  let maxType = 'message';
  let maxCount = 0;

  for (const [type, count] of Object.entries(types)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type;
    }
  }

  return maxType;
}

/**
 * エッジ色を取得。
 *
 * 主要なメッセージタイプに対応する色を返します。
 *
 * @param dominantType - 主要なメッセージタイプ
 * @param colors - カスタムカラー設定（オプション）
 * @returns カラーコード（hex）
 */
export function getEdgeColor(
  dominantType: string,
  colors: Partial<EdgeTypeColors> = {}
): string {
  const mergedColors = { ...DEFAULT_EDGE_TYPE_COLORS, ...colors };
  return mergedColors[dominantType as keyof EdgeTypeColors] || mergedColors.other;
}

/**
 * 設定をマージ。
 *
 * デフォルト設定とカスタム設定をマージします。
 *
 * @param customConfig - カスタム設定
 * @returns マージされた設定
 */
export function mergeNetworkConfig(
  customConfig: Partial<NetworkGraphConfig> = {}
): NetworkGraphConfig {
  return { ...DEFAULT_NETWORK_CONFIG, ...customConfig };
}

/**
 * モデル情報から色を取得。
 *
 * Claude モデル名に対応する色を返します。
 *
 * @param model - モデル名
 * @returns カラーコード（hex）
 */
export function getModelColor(model: string): string {
  const modelLower = model.toLowerCase();

  if (modelLower.includes('opus')) {
    return '#8B5CF6'; // violet-500
  }
  if (modelLower.includes('sonnet')) {
    return '#3B82F6'; // blue-500
  }
  if (modelLower.includes('haiku')) {
    return '#10B981'; // green-500
  }

  return '#6B7280'; // gray-500（デフォルト）
}

/**
 * モデル情報からアイコンを取得。
 *
 * Claude モデル名に対応する絵文字を返します。
 *
 * @param model - モデル名
 * @returns 絵文字アイコン
 */
export function getModelIcon(model: string): string {
  const modelLower = model.toLowerCase();

  if (modelLower.includes('opus')) {
    return '💎';
  }
  if (modelLower.includes('sonnet')) {
    return '🔵';
  }
  if (modelLower.includes('haiku')) {
    return '🍃';
  }

  return '🤖'; // デフォルト
}

/**
 * メッセージタイプの表示名を取得。
 *
 * @param type - メッセージタイプ
 * @returns 日本語表示名
 */
export function getMessageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    message: 'メッセージ',
    idle_notification: 'アイドル通知',
    shutdown_request: 'シャットダウン要求',
    shutdown_response: 'シャットダウン応答',
    plan_approval: 'プラン承認',
    other: 'その他',
  };

  return labels[type] || type;
}

/**
 * ノードの通信統計を計算。
 *
 * 送受信メッセージ数から統計情報を生成します。
 *
 * @param node - エージェントノード
 * @returns 統計情報オブジェクト
 */
export function getNodeStatistics(node: AgentNode): {
  total: number;
  sent: number;
  received: number;
  ratio: number; // 送信/受信比率
} {
  const { sentCount, receivedCount, messageCount } = node;

  return {
    total: messageCount,
    sent: sentCount,
    received: receivedCount,
    ratio: receivedCount > 0 ? sentCount / receivedCount : sentCount,
  };
}

/**
 * メッセージデータ型。
 *
 * ビルド関数で使用される入力データ型。
 */
export interface MessageData {
  /** 送信者エージェント名 */
  from: string;
  /** 受信者エージェント名（推定） */
  to?: string;
  /** メッセージ本文 */
  text: string;
  /** タイムスタンプ */
  timestamp: string;
  /** パースされたメッセージタイプ */
  parsedType?: string;
}

/**
 * メンバーマップ型。
 *
 * エージェント名からメンバー情報へのマップ。
 */
export type MemberMap = Record<string, Member>;

/**
 * メッセージ配列から AgentNode 配列を生成します。
 *
 * チームメンバー情報とメッセージデータから、
 * エージェントノードを構築します。
 *
 * @param messages - メッセージ配列
 * @param members - チームメンバー配列
 * @returns AgentNode 配列
 */
export function buildNodesFromMessages(
  messages: MessageData[],
  members: Member[]
): AgentNode[] {
  // メンバーマップを作成（エージェント名で検索できるように）
  const memberMap: MemberMap = {};
  for (const member of members) {
    memberMap[member.name] = member;
  }

  // 通信統計を集計
  const agentStats: Map<
    string,
    { sent: number; received: number; total: number }
  > = new Map();

  for (const msg of messages) {
    const from = msg.from;
    const to = msg.to;

    // 送信者カウント
    if (!agentStats.has(from)) {
      agentStats.set(from, { sent: 0, received: 0, total: 0 });
    }
    const fromStats = agentStats.get(from)!;
    fromStats.sent += 1;
    fromStats.total += 1;

    // 受信者カウント
    if (to) {
      if (!agentStats.has(to)) {
        agentStats.set(to, { sent: 0, received: 0, total: 0 });
      }
      const toStats = agentStats.get(to)!;
      toStats.received += 1;
      toStats.total += 1;
    }
  }

  // ノードを構築
  const nodes: AgentNode[] = [];

  for (const [agentName, stats] of agentStats.entries()) {
    const member = memberMap[agentName];
    const model = member?.model || 'unknown';

    nodes.push({
      id: agentName,
      label: agentName,
      model,
      modelColor: getModelColor(model),
      modelIcon: getModelIcon(model),
      messageCount: stats.total,
      sentCount: stats.sent,
      receivedCount: stats.received,
      x: undefined,
      y: undefined,
      vx: undefined,
      vy: undefined,
      index: undefined,
    });
  }

  return nodes;
}

/**
 * メッセージ配列から CommunicationEdge 配列を生成します。
 *
 * エージェント間の通信関係をエッジとして構築します。
 *
 * @param messages - メッセージ配列
 * @returns CommunicationEdge 配列
 */
export function buildEdgesFromMessages(
  messages: MessageData[]
): CommunicationEdge[] {
  // エッジタイプの型定義
  type EdgeTypes = {
    message: number;
    idle_notification: number;
    shutdown_request: number;
    shutdown_response: number;
    plan_approval: number;
    other: number;
  };

  // エッジマップ: "from,to" -> エッジ情報
  const edgeMap: Map<
    string,
    {
      count: number;
      types: EdgeTypes;
      lastTimestamp: string;
    }
  > = new Map();

  for (const msg of messages) {
    const to = msg.to;
    if (!to) continue; // 受信者が不明なメッセージはスキップ

    // 一貫性のため from < to の順序でキーを作成
    const edgeKey =
      msg.from < to ? `${msg.from}->${to}` : `${to}->${msg.from}`;

    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, {
        count: 0,
        types: {
          message: 0,
          idle_notification: 0,
          shutdown_request: 0,
          shutdown_response: 0,
          plan_approval: 0,
          other: 0,
        },
        lastTimestamp: msg.timestamp,
      });
    }

    const edge = edgeMap.get(edgeKey)!;
    edge.count += 1;

    // メッセージタイプをカウント
    const msgType = normalizeMessageType(msg.parsedType) as keyof EdgeTypes;
    if (msgType in edge.types) {
      edge.types[msgType] += 1;
    } else {
      edge.types.other += 1;
    }

    // 最新のタイムスタンプを更新
    if (msg.timestamp > edge.lastTimestamp) {
      edge.lastTimestamp = msg.timestamp;
    }
  }

  // エッジを構築
  const edges: CommunicationEdge[] = [];

  for (const [edgeKey, edgeData] of edgeMap.entries()) {
    const [source, target] = edgeKey.split('->');

    edges.push({
      source,
      target,
      count: edgeData.count,
      types: edgeData.types,
      dominantType: getDominantType(edgeData.types),
      lastTimestamp: edgeData.lastTimestamp,
    });
  }

  return edges;
}

/**
 * メッセージタイプを正規化します。
 *
 * 様々なメッセージタイプを標準的なタイプにマッピングします。
 *
 * @param type - メッセージタイプ
 * @returns 正規化されたメッセージタイプ
 */
function normalizeMessageType(type?: string): string {
  if (!type) return 'message';

  const normalized = type.toLowerCase();

  if (normalized.includes('idle')) {
    return 'idle_notification';
  }
  if (normalized.includes('shutdown_request')) {
    return 'shutdown_request';
  }
  if (normalized.includes('shutdown_response') || normalized.includes('shutdown_approved')) {
    return 'shutdown_response';
  }
  if (normalized.includes('plan_approval')) {
    return 'plan_approval';
  }
  if (normalized.includes('message')) {
    return 'message';
  }

  return 'other';
}
