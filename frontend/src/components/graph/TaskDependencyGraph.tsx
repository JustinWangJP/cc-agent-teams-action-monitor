/**
 * タスク依存グラフコンポーネント。
 *
 * D3.js フォースシミュレーションを使用してタスク間の依存関係を可視化します。
 * ノードのドラッグ、ズーム、パン、クリック選択に対応します。
 *
 * @module components/graph/TaskDependencyGraph
 */

import React, { useRef, useEffect, useCallback } from 'react';
import type * as D3 from 'd3';
import type {
  TaskNode,
  TaskEdge,
  StatusColors,
  TaskDependencyGraphProps,
} from './types';
import {
  buildNodesFromTasks,
  buildEdgesFromTasks,
  mergeConfig,
  getStatusColor,
  getStatusIcon,
  DEFAULT_STATUS_COLORS,
} from './utils';

/**
 * TaskDependencyGraph コンポーネント。
 *
 * タスクの依存関係を有向グラフとして表示します。
 *
 * @example
 * ```tsx
 * <TaskDependencyGraph
 *   tasks={tasks}
 *   width={800}
 *   height={500}
 *   onNodeClick={(node) => console.log('Clicked:', node)}
 * />
 * ```
 */
export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  tasks,
  width = 800,
  height = 500,
  onNodeClick,
  onNodeHover,
  config: customConfig,
  colors: customColors,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<D3.Simulation<TaskNode, TaskEdge> | null>(null);
  const zoomRef = useRef<any>(null);

  // 設定のマージ
  const config = mergeConfig(customConfig);
  const colors: StatusColors = { ...DEFAULT_STATUS_COLORS, ...customColors };

  // ノード・エッジの構築
  const nodes = React.useMemo(() => buildNodesFromTasks(tasks), [tasks]);
  const edges = React.useMemo(() => buildEdgesFromTasks(tasks), [tasks]);

  // ノードクリックハンドラ
  const handleNodeClick = useCallback(
    (node: TaskNode) => {
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  // ノードホバーハンドラ
  const handleNodeHover = useCallback(
    (node: TaskNode | null) => {
      if (onNodeHover) {
        onNodeHover(node);
      }
    },
    [onNodeHover]
  );

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

      // 矢印マーカー定義
      const defs = svg.append('defs');
      defs
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', config.nodeRadius + 8)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#94A3B8');

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
        .attr('stroke', '#94A3B8')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#arrowhead)');

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
            .drag<SVGGElement, TaskNode>()
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded) as any
        );

      // ノード円
      node
        .append('circle')
        .attr('r', config.nodeRadius)
        .attr('fill', (d) => getStatusColor(d.status, colors))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('filter', 'url(#dropShadow)');

      // ステータスアイコン
      node
        .append('text')
        .text((d) => getStatusIcon(d.status))
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '16px')
        .style('pointer-events', 'none');

      // ラベル（件名）
      node
        .append('text')
        .text((d) => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', config.nodeRadius + 16)
        .attr('class', 'node-label')
        .style('font-size', '12px')
        .style('fill', '#475569')
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
          .attr('r', config.nodeRadius + 5)
          .attr('stroke', '#F59E0B');
      });

      node.on('mouseleave', (event, _d) => {
        handleNodeHover(null);
        select(event.currentTarget)
          .select('circle')
          .transition()
          .duration(150)
          .attr('r', config.nodeRadius)
          .attr('stroke', '#fff');
      });

      // フォースシミュレーション
      const simulation = d3
        .forceSimulation<TaskNode, TaskEdge>(nodes)
        .force(
          'link',
          d3
            .forceLink<TaskNode, TaskEdge>(edges)
            .id((d) => d.id)
            .distance(config.linkDistance)
        )
        .force('charge', d3.forceManyBody().strength(config.chargeStrength))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(config.centerStrength))
        .force('collision', d3.forceCollide().radius(config.nodeRadius + config.nodePadding))
        .velocityDecay(config.velocityDecay)
        .alphaDecay(config.alphaDecay)
        .alphaMin(config.alphaMin);

      // ティック更新
      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as TaskNode).x!)
          .attr('y1', (d) => (d.source as TaskNode).y!)
          .attr('x2', (d) => (d.target as TaskNode).x!)
          .attr('y2', (d) => (d.target as TaskNode).y!);

        node.attr('transform', (d) => `translate(${d.x},${d.y})`);
      });

      simulationRef.current = simulation;

      // ドラッグハンドラ
      function dragStarted(event: D3.D3DragEvent<SVGGElement, TaskNode, TaskNode>, d: TaskNode) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event: D3.D3DragEvent<SVGGElement, TaskNode, TaskNode>, d: TaskNode) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragEnded(event: D3.D3DragEvent<SVGGElement, TaskNode, TaskNode>, d: TaskNode) {
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

  // 空状態
  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ width, height }}
      >
        <div className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-lg font-medium">表示するタスクがありません</p>
          <p className="text-sm mt-1">タスクを作成すると依存関係グラフが表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ maxWidth: '100%' }}
      />
      <div className="absolute top-2 right-2 flex gap-2 text-xs">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded shadow">
          <span className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-slate-700 dark:text-slate-300">未着手</span>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded shadow">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-700 dark:text-slate-300">進行中</span>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-1 rounded shadow">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-slate-700 dark:text-slate-300">完了</span>
        </div>
      </div>
    </div>
  );
};

export default TaskDependencyGraph;
