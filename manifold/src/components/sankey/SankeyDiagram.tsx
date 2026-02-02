'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import * as d3 from 'd3';
import { useManifoldStore } from '@/store/useManifoldStore';
import { 
  getWealthTier, 
  getNetWorth, 
  formatUSD, 
  WEALTH_TIERS,
  WealthTier,
  PATH_CATEGORY_INFO,
  PathCategory,
} from '@/engine';

const CheckpointIcon = dynamic(
  () => import('@/components/checkpoints/CheckpointIcon').then(m => ({ default: m.CheckpointIcon })),
  { ssr: false }
);

// ============================================================================
// TYPES
// ============================================================================

interface FlowNode {
  id: string;
  year: number;
  tier: WealthTier;
  pathCount: number;
  avgNetWorth: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlowLink {
  source: FlowNode;
  target: FlowNode;
  value: number;
  category: PathCategory;
}

// ============================================================================
// SANKEY DIAGRAM COMPONENT
// ============================================================================

export function SankeyDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const { 
    displayPaths, 
    currentYear, 
    goalYear,
    setViewYear,
    goldenPath,
  } = useManifoldStore();

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width: Math.max(600, width), height: Math.max(400, height) });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Process simulation paths into flow data
  const { nodes, links } = useMemo(() => {
    if (!displayPaths || displayPaths.length === 0) {
      return { nodes: [], links: [] };
    }

    const years = Array.from({ length: goalYear - currentYear + 1 }, (_, i) => currentYear + i);
    const nodeMap = new Map<string, { pathCount: number; totalNetWorth: number; tier: WealthTier; year: number }>();
    const linkMap = new Map<string, { value: number; category: PathCategory }>();

    // Count paths through each node and create links
    for (const path of displayPaths) {
      let prevNodeId: string | null = null;
      
      for (let t = 0; t < path.states.length; t++) {
        const state = path.states[t];
        const year = currentYear + t;
        const netWorth = getNetWorth(state.Wl, state.We);
        const tier = getWealthTier(netWorth);
        const nodeId = `${year}-${tier}`;
        
        const existing = nodeMap.get(nodeId);
        if (existing) {
          existing.pathCount++;
          existing.totalNetWorth += netWorth;
        } else {
          nodeMap.set(nodeId, {
            pathCount: 1,
            totalNetWorth: netWorth,
            tier,
            year,
          });
        }
        
        // Create link from previous node
        if (prevNodeId) {
          const linkId = `${prevNodeId}->${nodeId}`;
          const existingLink = linkMap.get(linkId);
          if (existingLink) {
            existingLink.value++;
          } else {
            linkMap.set(linkId, {
              value: 1,
              category: path.category || 'balanced',
            });
          }
        }
        
        prevNodeId = nodeId;
      }
    }

    // Convert to arrays with positions
    const margin = { top: 60, right: 60, bottom: 80, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;
    
    const yearScale = d3.scalePoint<number>()
      .domain(years)
      .range([0, width])
      .padding(0.5);

    // Group nodes by year for vertical positioning
    const nodesByYear = new Map<number, Array<{ id: string; data: typeof nodeMap extends Map<string, infer V> ? V : never }>>();
    nodeMap.forEach((data, id) => {
      const yearNodes = nodesByYear.get(data.year) || [];
      yearNodes.push({ id, data });
      nodesByYear.set(data.year, yearNodes);
    });

    const flowNodes: FlowNode[] = [];
    
    nodesByYear.forEach((yearNodes, year) => {
      // Sort by tier (debt at bottom, rich at top)
      const tierOrder: WealthTier[] = ['debt', 'struggling', 'comfortable', 'wealthy', 'rich'];
      yearNodes.sort((a, b) => tierOrder.indexOf(b.data.tier) - tierOrder.indexOf(a.data.tier));
      
      const totalPaths = yearNodes.reduce((sum, n) => sum + n.data.pathCount, 0);
      let yOffset = 0;
      
      yearNodes.forEach(({ id, data }) => {
        const nodeHeight = Math.max(20, (data.pathCount / totalPaths) * height * 0.8);
        
        flowNodes.push({
          id,
          year: data.year,
          tier: data.tier,
          pathCount: data.pathCount,
          avgNetWorth: data.totalNetWorth / data.pathCount,
          x: (yearScale(data.year) || 0) + margin.left - 15,
          y: yOffset + margin.top,
          width: 30,
          height: nodeHeight,
        });
        
        yOffset += nodeHeight + 10;
      });
    });

    // Create flow links
    const nodeById = new Map(flowNodes.map(n => [n.id, n]));
    const flowLinks: FlowLink[] = [];
    
    linkMap.forEach((data, linkId) => {
      const [sourceId, targetId] = linkId.split('->');
      const source = nodeById.get(sourceId);
      const target = nodeById.get(targetId);
      
      if (source && target) {
        flowLinks.push({
          source,
          target,
          value: data.value,
          category: data.category,
        });
      }
    });

    return { nodes: flowNodes, links: flowLinks };
  }, [displayPaths, currentYear, goalYear, dimensions]);

  // Milestone positions for 3D checkpoint icons (golden path only)
  const milestoneOverlays = useMemo(() => {
    if (!goldenPath?.milestones?.length || nodes.length === 0) return [];
    return goldenPath.milestones
      .map((m) => {
        const tier = goldenPath.wealthTierByYear?.get(m.year);
        if (!tier) return null;
        const node = nodes.find((n) => n.year === m.year && n.tier === tier);
        if (!node) return null;
        const iconSize = 36;
        return {
          ...m,
          x: node.x + node.width / 2 - iconSize / 2,
          y: node.y + node.height / 2 - iconSize / 2,
          iconSize,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }, [goldenPath, nodes]);

  // Render diagram
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 60, right: 60, bottom: 80, left: 80 };

    // Draw links as curved paths
    const linkGroup = svg.append('g').attr('class', 'links');
    
    linkGroup.selectAll('path')
      .data(links)
      .join('path')
      .attr('d', (d) => {
        const x0 = d.source.x + d.source.width;
        const y0 = d.source.y + d.source.height / 2;
        const x1 = d.target.x;
        const y1 = d.target.y + d.target.height / 2;
        const midX = (x0 + x1) / 2;
        
        return `M${x0},${y0} C${midX},${y0} ${midX},${y1} ${x1},${y1}`;
      })
      .attr('fill', 'none')
      .attr('stroke', (d) => PATH_CATEGORY_INFO[d.category]?.color || '#666')
      .attr('stroke-width', (d) => Math.max(1, Math.sqrt(d.value) * 2))
      .attr('stroke-opacity', 0.4)
      .style('cursor', 'pointer')
      .on('mouseenter', function() {
        d3.select(this).attr('stroke-opacity', 0.8);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke-opacity', 0.4);
      });

    // Draw nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');
    
    const nodeElements = nodeGroup.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        setHoveredNode(d.id);
        d3.select(this).select('rect').attr('opacity', 0.8);
      })
      .on('mouseleave', function() {
        setHoveredNode(null);
        d3.select(this).select('rect').attr('opacity', 1);
      })
      .on('click', (event, d) => {
        setViewYear(d.year);
      });

    // Node rectangles
    nodeElements.append('rect')
      .attr('width', (d) => d.width)
      .attr('height', (d) => d.height)
      .attr('fill', (d) => {
        const tierInfo = WEALTH_TIERS.find(t => t.tier === d.tier);
        return tierInfo?.color || '#666';
      })
      .attr('rx', 4)
      .attr('ry', 4);

    // Node labels (net worth)
    nodeElements.append('text')
      .attr('x', (d) => d.width / 2)
      .attr('y', (d) => d.height / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.height < 25) return '';
        return formatUSD(d.avgNetWorth);
      });

    // Year labels at bottom
    const years = Array.from(new Set(nodes.map(n => n.year))).sort();
    const yearScale = d3.scalePoint<number>()
      .domain(years)
      .range([margin.left, dimensions.width - margin.right])
      .padding(0.5);

    svg.append('g')
      .attr('class', 'year-axis')
      .attr('transform', `translate(0,${dimensions.height - 30})`)
      .selectAll('text')
      .data(years)
      .join('text')
      .attr('x', d => yearScale(d) || 0)
      .attr('text-anchor', 'middle')
      .attr('fill', '#888')
      .attr('font-size', '12px')
      .text(d => d);

    // Tier labels on left
    const tierLabels = svg.append('g')
      .attr('class', 'tier-labels')
      .attr('transform', `translate(${margin.left - 10}, 0)`);

    const tierPositions = new Map<WealthTier, number[]>();
    nodes.forEach(n => {
      const positions = tierPositions.get(n.tier) || [];
      positions.push(n.y + n.height / 2);
      tierPositions.set(n.tier, positions);
    });

    tierPositions.forEach((positions, tier) => {
      const avgY = positions.reduce((a, b) => a + b, 0) / positions.length;
      const tierInfo = WEALTH_TIERS.find(t => t.tier === tier);
      
      tierLabels.append('text')
        .attr('x', 0)
        .attr('y', avgY)
        .attr('text-anchor', 'end')
        .attr('fill', tierInfo?.color || '#888')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text(tierInfo?.label || '');
    });

  }, [nodes, links, dimensions, setViewYear]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <h2 className="text-lg font-semibold text-white">Life Trajectory Flow</h2>
        <p className="text-sm text-gray-400">
          {displayPaths.length} simulated paths from {currentYear} to {goalYear}
        </p>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-gray-800/80 rounded-lg p-3">
        <p className="text-xs text-gray-400 mb-2">Path Categories</p>
        <div className="space-y-1">
          {Object.entries(PATH_CATEGORY_INFO).map(([key, info]) => (
            <div key={key} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: info.color }}
              />
              <span className="text-xs text-gray-300">{info.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />

      {/* 3D checkpoint icons at milestones (golden path) */}
      {milestoneOverlays.length > 0 && (
        <div
          className="absolute left-0 top-0 pointer-events-none z-[5]"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          {milestoneOverlays.map((m) => (
            <div
              key={m.id}
              className="absolute"
              style={{
                left: m.x,
                top: m.y,
                width: m.iconSize,
                height: m.iconSize,
              }}
              title={`${m.label} (${m.year})`}
            >
              <CheckpointIcon icon={m.icon} size={m.iconSize} />
            </div>
          ))}
        </div>
      )}

      {/* Hovered node tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg p-3 shadow-xl z-20">
          <p className="text-sm text-white font-medium">
            {nodes.find(n => n.id === hoveredNode)?.year} - {WEALTH_TIERS.find(t => t.tier === nodes.find(n => n.id === hoveredNode)?.tier)?.label}
          </p>
          <p className="text-xs text-gray-400">
            {nodes.find(n => n.id === hoveredNode)?.pathCount} paths • 
            Avg: {formatUSD(nodes.find(n => n.id === hoveredNode)?.avgNetWorth || 0)}
          </p>
        </div>
      )}
    </div>
  );
}
