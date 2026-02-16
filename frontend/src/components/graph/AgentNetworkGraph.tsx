/**
 * エージェント通信ネットワークグラフコンポーネント。
 *
 * D3.js フォースシミュレーションを使用してエージェント間の通信関係を可視化します。
 * ノードのドラッグ、ズーム、パン、クリック選択に対応します。
 *
 * @module components/graph/AgentNetworkGraph
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type * as D3 from 'd3';
import type {
  AgentNode,
  CommunicationEdge,
  NetworkGraphConfig,
  EdgeTypeColors,
  NetworkData,
} from './networkTypes';
import {
  mergeNetworkConfig,
  calculateNodeRadius,
  calculateEdgeWidth,
  getEdgeColor,
  getModelColor,
  getModelIcon,
  getMessageTypeLabel,
  DEFAULT_EDGE_TYPE_COLORS,
} from './networkUtils';

/**
 * AgentNetworkGraph コンポーネントのProps。
 */
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

/**
 * AgentNetworkGraph コンポーネント。
 *
 * エージェント間の通信関係を有向グラフとして表示します。
 *
 * @example
 * ```tsx
 * <AgentNetworkGraph
 *   teamName="my-team"
 *   width={800}
 *   height={500}
 *   onNodeClick={(node) => console.log('Clicked:', node)}
 * />
 * ```
 */
export const AgentNetworkGraph: React.FC<AgentNetworkGraphProps> = ({
  teamName,
  width = 800,
  height = 500,
  onNodeClick,
  onNodeHover,
  config: customConfig,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<D3.Simulation<AgentNode, CommunicationEdge> | null>(null);
  const zoomRef = useRef<any>(null);

  // データ取得状態
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 設定のマージ
  const config: NetworkGraphConfig = mergeNetworkConfig(customConfig);
  const colors: EdgeTypeColors = { ...DEFAULT_EDGE_TYPE_COLORS };

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/teams/${encodeURIComponent(teamName)}/messages/network`);
        if (!response.ok) {
          throw new Error(`Failed to fetch network data: ${response.statusText}`);
        }
        const data: NetworkData = await response.json();
        setNetworkData(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('Error fetching network data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamName]);

  // ノード・エッジの抽出
  const nodes = networkData?.nodes ?? [];
  const edges = networkData?.edges ?? [];

  // ノードクリックハンドラ
  const handleNodeClick = useCallback(
    (node: AgentNode) => {
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  // ノードホバーハンドラ
  const handleNodeHover = useCallback(
    (node: AgentNode | null) => {
      if (onNodeHover) {
        onNodeHover(node);
      }
    },
    [onNodeHover]
  );

  // D3.js グラフ描画
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    // D3.js 動的インポート（ES Modules）
    const initGraph = async () => {
      const d3 = await import('d3');
      const { select, zoom } = d3;

      // SVG コンテナ
      const svg = select(svgRef.current);
      svg.selectAll('*').remove(); // クリア

      // メイングループ（ズーム・パン用）
      const g = svg.append('g').attr('class', 'graph-container');

      // ズームビヘイビア
      const zoomBehavior = zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      zoomRef.current = zoomBehavior;
      svg.call(zoomBehavior as any);

      // 矢印マーカー定義（エッジタイプ別）
      const defs = svg.append('defs');

      // 各エッジタイプ用のマーカーを作成
      const edgeTypes = Object.keys(colors);
      for (const type of edgeTypes) {
        const markerColor = colors[type as keyof EdgeTypeColors];

        defs
          .append('marker')
          .attr('id', `arrowhead-${type}`)
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', config.nodeRadius + 8)
          .attr('refY', 0)
          .attr('orient', 'auto')
          .attr('markerWidth', 8)
          .attr('markerHeight', 8)
          .append('path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', markerColor);
      }

      // ドロップシャドウフィルター
      const filter = defs
        .append('filter')
        .attr('id', 'dropShadow')
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');
      filter
        .append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 2);
      filter
        .append('feOffset')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetblur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      // リンク（エッジ）描画
      const link = g
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(edges)
        .join('line')
        .attr('class', 'link')
        .attr('stroke', (d) => getEdgeColor(d.dominantType, colors))
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d) => calculateEdgeWidth(d.count, 1.5))
        .attr('marker-end', (d) => `url(#arrowhead-${d.dominantType})`);

      // ノードグループ描画
      const node = g
        .append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .call(
          d3
            .drag<SVGGElement, AgentNode>()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded) as any
        );

      // ノード円（メッセージ数に応じたサイズ）
      node
        .append('circle')
        .attr('r', (d) => calculateNodeRadius(d.messageCount, config.nodeRadius))
        .attr('fill', (d) => d.modelColor)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'url(#dropShadow)');

      // モデルアイコン
      node
        .append('text')
        .text((d) => d.modelIcon)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '16px')
        .style('pointer-events', 'none');

      // ラベル（エージェント名）
      node
        .append('text')
        .text((d) => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => calculateNodeRadius(d.messageCount, config.nodeRadius) + 16)
        .attr('class', 'node-label')
        .style('font-size', '12px')
        .style('fill', '#475569')
        .style('font-weight', '500')
        .style('pointer-events', 'none');

      // イベントハンドラ
      node.on('click', (event, d) => {
        event.stopPropagation();
        handleNodeClick(d);
      });

      node.on('mouseenter', (event, d) => {
        handleNodeHover(d);
        select(event.currentTarget)
          .select('circle')
          .transition()
          .duration(150)
          .attr('stroke', '#F59E0B')
          .attr('stroke-width', 3);
      });

      node.on('mouseleave', (event, _d) => {
        handleNodeHover(null);
        select(event.currentTarget)
          .select('circle')
          .transition()
          .duration(150)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);
      });

      // フォースシミュレーション
      const simulation = d3
        .forceSimulation<AgentNode, CommunicationEdge>(nodes)
        .force(
          'link',
          d3
            .forceLink<AgentNode, CommunicationEdge>(edges)
            .id((d) => d.id)
            .distance(config.linkDistance)
        )
        .force('charge', d3.forceManyBody().strength(config.chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(config.centerStrength))
        .force(
          'collision',
          d3.forceCollide<AgentNode>().radius((d) => calculateNodeRadius(d.messageCount, config.nodeRadius) + config.nodePadding)
        )
        .velocityDecay(config.velocityDecay)
        .alphaDecay(config.alphaDecay)
        .alphaMin(config.alphaMin);

      // ティック更新
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as AgentNode).x!)
          .attr('y1', (d) => (d.source as AgentNode).y!)
          .attr('x2', (d) => (d.target as AgentNode).x!)
          .attr('y2', (d) => (d.target as AgentNode).y!);

        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

      simulationRef.current = simulation;

      // ドラッグハンドラ
      function dragStarted(event: D3.D3DragEvent<SVGGElement, AgentNode, AgentNode>, d: AgentNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: D3.D3DragEvent<SVGGElement, AgentNode, AgentNode>, d: AgentNode) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragEnded(event: D3.D3DragEvent<SVGGElement, AgentNode, AgentNode>, d: AgentNode) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    };

    initGraph();

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [nodes, edges, width, height, config, colors, handleNodeClick, handleNodeHover]);

  // ローディング状態
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ width, height }}
      >
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 dark:border-slate-400 mb-2" />
          <p className="text-sm">ネットワークデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ width, height }}
      >
        <div className="text-center text-red-500">
          <p className="text-lg font-medium">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // 空状態
  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ width, height }}
      >
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium">表示する通信データがありません</p>
          <p className="text-sm mt-1">エージェント間のメッセージがあるとネットワークグラフが表示されます</p>
        </div>
      </div>
    );
  }

  // 使用されているモデルを収集（凡例用）
  const usedModels = Array.from(new Set(nodes.map((n) => n.model)));
  const usedEdgeTypes = Array.from(new Set(edges.map((e) => e.dominantType)));

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ maxWidth: '100%' }}
      />
      {/* 凡例: モデル別 */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 text-xs">
        <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded shadow">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">モデル</div>
          {usedModels.map((model) => {
            const color = getModelColor(model);
            const icon = getModelIcon(model);
            return (
              <div key={model} className="flex items-center gap-2 mt-1">
                <span className="text-sm">{icon}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-slate-700 dark:text-slate-300">{model}</span>
              </div>
            );
          })}
        </div>
        {/* 凡例: エッジタイプ別 */}
        {usedEdgeTypes.length > 0 && (
          <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded shadow">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">通信タイプ</div>
            {usedEdgeTypes.map((type) => {
              const color = getEdgeColor(type, colors);
              return (
                <div key={type} className="flex items-center gap-2 mt-1">
                  <span className="w-8 h-0.5" style={{ backgroundColor: color }} />
                  <span className="text-slate-700 dark:text-slate-300">{getMessageTypeLabel(type)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentNetworkGraph;
