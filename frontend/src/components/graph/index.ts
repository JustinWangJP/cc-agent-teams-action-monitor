/**
 * グラフコンポーネントのエクスポート。
 *
 * @module components/graph
 */

// タスク依存グラフ
export { TaskDependencyGraph, default } from './TaskDependencyGraph';
export type {
  TaskNode,
  TaskEdge,
  GraphConfig,
  StatusColors,
  TaskDependencyGraphProps,
} from './types';
export {
  buildNodesFromTasks,
  buildEdgesFromTasks,
  truncateLabel,
  getStatusColor,
  getStatusIcon,
  mergeConfig,
  statusToOrder,
  DEFAULT_GRAPH_CONFIG,
  DEFAULT_STATUS_COLORS,
} from './utils';

// エージェント通信ネットワークグラフ
export { AgentNetworkGraph } from './AgentNetworkGraph';
export type {
  AgentNode,
  CommunicationEdge,
  NetworkData,
  NetworkGraphConfig,
  EdgeTypeColors,
  AgentNetworkGraphProps,
} from './networkTypes';
export {
  calculateNodeRadius,
  calculateEdgeWidth,
  getDominantType,
  getEdgeColor,
  mergeNetworkConfig,
  getModelColor,
  getModelIcon,
  getMessageTypeLabel,
  getNodeStatistics,
  buildNodesFromMessages,
  buildEdgesFromMessages,
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_EDGE_TYPE_COLORS,
} from './networkUtils';
