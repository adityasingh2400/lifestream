'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  DecisionTree, 
  DecisionNode, 
  PathOutcome,
  formatUSD,
} from '@/engine';
import { useDecisionTreeStore } from '@/store/useDecisionTreeStore';

// ============================================================================
// TYPES
// ============================================================================

interface TreeVisualizationProps {
  tree: DecisionTree;
  onSelectDecision: (nodeId: string, decisionId: string) => void;
  onFocusNode: (nodeId: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  node: DecisionNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const NODE_EXPANDED_HEIGHT = 320;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 40;

// ============================================================================
// SORTING / ORGANIZATION
// ============================================================================

type SortCriteria = 'salary' | 'probability' | 'netWorth' | 'risk' | 'growth';

function sortNodes(nodes: DecisionNode[], criteria: SortCriteria): DecisionNode[] {
  return [...nodes].sort((a, b) => {
    switch (criteria) {
      case 'salary':
        return b.outcome.salary - a.outcome.salary;
      case 'probability':
        return b.pathProbability - a.pathProbability;
      case 'netWorth':
        return b.outcome.netWorth - a.outcome.netWorth;
      case 'risk':
        // Lower probability = higher risk, sort high risk first
        return a.pathProbability - b.pathProbability;
      case 'growth':
        const growthOrder = { explosive: 5, fast: 4, moderate: 3, slow: 2, stagnant: 1 };
        return (growthOrder[b.outcome.careerGrowth] || 0) - (growthOrder[a.outcome.careerGrowth] || 0);
      default:
        return 0;
    }
  });
}

function getCriteriaLabel(criteria: SortCriteria): string {
  switch (criteria) {
    case 'salary': return 'Highest Salary';
    case 'probability': return 'Most Likely';
    case 'netWorth': return 'Best Net Worth';
    case 'risk': return 'Highest Risk';
    case 'growth': return 'Fastest Growth';
  }
}

// ============================================================================
// QUALITY BADGE
// ============================================================================

function QualityBadge({ 
  label, 
  value, 
  inverted = false 
}: { 
  label: string; 
  value: string; 
  inverted?: boolean;
}) {
  const colors: Record<string, string> = {
    poor: inverted ? '#22c55e' : '#ef4444',
    low: inverted ? '#22c55e' : '#f97316',
    average: '#eab308',
    medium: '#eab308',
    moderate: '#eab308',
    good: inverted ? '#f97316' : '#22c55e',
    high: inverted ? '#ef4444' : '#22c55e',
    excellent: inverted ? '#ef4444' : '#14b8a6',
    fast: '#22c55e',
    explosive: '#06b6d4',
    slow: '#f97316',
    stagnant: '#ef4444',
    extreme: inverted ? '#ef4444' : '#a855f7',
  };

  const color = colors[value] || '#888';

  return (
    <div 
      className="text-[10px] px-1.5 py-0.5 rounded"
      style={{ backgroundColor: color + '22', color }}
    >
      {label}: {value}
    </div>
  );
}

// ============================================================================
// COMPACT NODE (unexpanded)
// ============================================================================

function CompactNode({
  node,
  isSelected,
  isRoot,
  onClick,
}: {
  node: DecisionNode;
  isSelected: boolean;
  isRoot: boolean;
  onClick: () => void;
}) {
  const netWorthColor = node.outcome.netWorth >= 0 ? 'text-green-400' : 'text-red-400';
  
  // Determine node color based on outcome quality
  const getBorderColor = () => {
    if (isSelected) return 'border-blue-500 shadow-lg shadow-blue-500/20';
    if (isRoot) return 'border-purple-500/50';
    
    const salary = node.outcome.salary;
    if (salary >= 300000) return 'border-emerald-500/50';
    if (salary >= 150000) return 'border-blue-500/50';
    if (salary >= 80000) return 'border-yellow-500/50';
    return 'border-gray-600';
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-[180px] p-3 rounded-xl border-2 transition-all duration-200
        bg-gray-900/90 backdrop-blur hover:scale-105 text-left
        ${getBorderColor()}
        ${isSelected ? 'ring-2 ring-blue-500/30' : ''}
      `}
    >
      {/* Title */}
      <div className="font-medium text-white text-sm truncate mb-1">
        {node.outcome.jobTitle || 'Starting Point'}
      </div>
      
      {/* Company */}
      {node.outcome.company && (
        <div className="text-xs text-gray-400 truncate mb-2">
          {node.outcome.company}
        </div>
      )}
      
      {/* Key metrics */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400 font-medium">
          {formatUSD(node.outcome.salary, true)}/yr
        </span>
        <span className={`${netWorthColor} font-medium`}>
          NW: {formatUSD(node.outcome.netWorth, true)}
        </span>
      </div>
      
      {/* Probability bar */}
      <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          style={{ width: `${node.pathProbability * 100}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        {Math.round(node.pathProbability * 100)}% likely
      </div>
    </button>
  );
}

// ============================================================================
// EXPANDED NODE DETAIL
// ============================================================================

function ExpandedNodeDetail({
  node,
  onClose,
  onSelectPath,
}: {
  node: DecisionNode;
  onClose: () => void;
  onSelectPath: (decisionId: string) => void;
}) {
  const outcome = node.outcome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-gray-900 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                Year {node.year}
              </span>
              <span className="text-xs text-gray-500">Age {node.age}</span>
              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                {Math.round(node.pathProbability * 100)}% likely
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{outcome.jobTitle}</h2>
            {outcome.company && (
              <p className="text-gray-400">{outcome.company} • {outcome.companyType}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Annual Salary</div>
              <div className="text-lg font-bold text-green-400">{formatUSD(outcome.salary)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Net Worth</div>
              <div className={`text-lg font-bold ${outcome.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatUSD(outcome.netWorth)}
              </div>
            </div>
            {outcome.equity && outcome.equity > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Equity</div>
                <div className="text-lg font-bold text-purple-400">{formatUSD(outcome.equity)}</div>
              </div>
            )}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Monthly Burn</div>
              <div className="text-lg font-bold text-white">{formatUSD(outcome.monthlyBurn)}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Savings Rate</div>
              <div className="text-lg font-bold text-white">{Math.round(outcome.savingsRate * 100)}%</div>
            </div>
            {outcome.location && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Location</div>
                <div className="text-lg font-bold text-white">{outcome.location}</div>
              </div>
            )}
          </div>

          {/* Narrative */}
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-2">Life at this point</div>
            <p className="text-gray-300 leading-relaxed">{outcome.narrative}</p>
          </div>

          {/* Quality Metrics */}
          <div className="flex flex-wrap gap-2">
            <QualityBadge label="Work-Life" value={outcome.workLifeBalance} />
            <QualityBadge label="Growth" value={outcome.careerGrowth} />
            <QualityBadge label="Fulfillment" value={outcome.fulfillment} />
            <QualityBadge label="Stress" value={outcome.stress} inverted />
          </div>

          {/* Key Events */}
          {outcome.keyEvents.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">Key Events</div>
              <div className="flex flex-wrap gap-2">
                {outcome.keyEvents.map((event, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                    {event}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Future Paths */}
          {!node.isTerminal && node.decisions.length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <div className="text-sm font-semibold text-white mb-3">
                Choose your next path ({node.decisions.length} options)
              </div>
              <div className="space-y-2">
                {node.decisions.map((decision) => (
                  <button
                    key={decision.id}
                    onClick={() => onSelectPath(decision.id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{decision.label}</span>
                      <span className="text-xs text-gray-400">
                        {Math.round(decision.probability * 100)}% success
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{decision.description}</p>
                    {decision.tradeoffs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {decision.tradeoffs.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {node.isTerminal && (
            <div className="text-center py-4 text-gray-500">
              This is a terminal node. No further paths available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTION LINES (SVG)
// ============================================================================

function ConnectionLines({
  positions,
  parentId,
  childIds,
  newNodeId,
  inactiveNodeIds,
}: {
  positions: Map<string, { x: number; y: number }>;
  parentId: string;
  childIds: string[];
  newNodeId: string | null;
  inactiveNodeIds: Set<string>;
}) {
  const parent = positions.get(parentId);
  if (!parent || childIds.length === 0) return null;

  return (
    <g>
      {childIds.map((childId) => {
        const child = positions.get(childId);
        if (!child) return null;

        const startX = parent.x + NODE_WIDTH / 2;
        const startY = parent.y + NODE_HEIGHT;
        const endX = child.x + NODE_WIDTH / 2;
        const endY = child.y;

        // Bezier curve control points
        const midY = (startY + endY) / 2;
        
        const isNew = childId === newNodeId;
        const isInactive = inactiveNodeIds.has(childId);
        const pathLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)) * 1.5;

        return (
          <path
            key={`${parentId}-${childId}`}
            d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
            fill="none"
            stroke={isInactive ? "rgba(107, 114, 128, 0.3)" : "url(#lineGradient)"}
            strokeWidth={isInactive ? "1" : "2"}
            strokeOpacity={isInactive ? "0.3" : "0.6"}
            strokeDasharray={isInactive ? "4 4" : isNew ? pathLength : "none"}
            strokeDashoffset={isNew ? pathLength : 0}
            className={isNew ? "animate-draw-path" : ""}
            style={isNew ? {
              animation: "drawPath 0.8s ease-out forwards",
            } : undefined}
          />
        );
      })}
    </g>
  );
}

// Ghost node for showing alternative paths on hover
function GhostNode({
  decision,
  parentPosition,
  index,
  totalAlternatives,
  onSelect,
}: {
  decision: { id: string; label: string; probability: number };
  parentPosition: { x: number; y: number };
  index: number;
  totalAlternatives: number;
  onSelect: () => void;
}) {
  // Position ghost nodes below and spread out from parent
  const spacing = NODE_WIDTH + HORIZONTAL_GAP;
  const totalWidth = totalAlternatives * spacing - HORIZONTAL_GAP;
  const startX = parentPosition.x + NODE_WIDTH / 2 - totalWidth / 2;
  const x = startX + index * spacing;
  const y = parentPosition.y + NODE_HEIGHT + VERTICAL_GAP + 40;

  return (
    <>
      {/* Ghost connection line */}
      <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
        <path
          d={`M ${parentPosition.x + NODE_WIDTH / 2} ${parentPosition.y + NODE_HEIGHT} 
              C ${parentPosition.x + NODE_WIDTH / 2} ${(parentPosition.y + NODE_HEIGHT + y) / 2}, 
                ${x + NODE_WIDTH / 2} ${(parentPosition.y + NODE_HEIGHT + y) / 2}, 
                ${x + NODE_WIDTH / 2} ${y}`}
          fill="none"
          stroke="rgba(139, 92, 246, 0.3)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
      
      {/* Ghost node */}
      <button
        onClick={onSelect}
        className="absolute w-[180px] p-3 rounded-xl border-2 border-dashed border-purple-500/30 
                   bg-gray-900/50 backdrop-blur hover:bg-gray-800/70 hover:border-purple-500/50 
                   transition-all duration-200 text-left opacity-60 hover:opacity-100"
        style={{ left: x, top: y }}
      >
        <div className="font-medium text-gray-400 text-sm truncate mb-1">
          {decision.label}
        </div>
        <div className="text-xs text-gray-500">
          {Math.round(decision.probability * 100)}% success
        </div>
        <div className="text-[10px] text-purple-400 mt-1">
          Click to switch path
        </div>
      </button>
    </>
  );
}

// ============================================================================
// MAIN VISUALIZATION
// ============================================================================

export function DecisionTreeVisualization({ 
  tree, 
  onSelectDecision, 
  onFocusNode 
}: TreeVisualizationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('probability');
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get store state for inactive nodes and new node tracking
  const { inactiveNodeIds, newNodeId, switchPath } = useDecisionTreeStore();

  const rootNode = tree.nodes.get(tree.rootId);

  // Calculate node positions in a tree layout
  const { positions, dimensions } = useMemo(() => {
    if (!rootNode) return { positions: new Map(), dimensions: { width: 0, height: 0 } };

    const posMap = new Map<string, { x: number; y: number }>();
    let maxX = 0;
    let maxY = 0;

    // BFS to layout nodes by depth
    const nodesByDepth = new Map<number, DecisionNode[]>();
    const queue: DecisionNode[] = [rootNode];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      const depth = node.depth;
      
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)!.push(node);

      // Add children to queue
      for (const childId of node.childIds) {
        const child = tree.nodes.get(childId);
        if (child) queue.push(child);
      }
    }

    // Position nodes at each depth
    nodesByDepth.forEach((nodes, depth) => {
      // Sort nodes at this level
      const sortedNodes = sortNodes(nodes, sortCriteria);
      const levelWidth = sortedNodes.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
      const startX = Math.max(0, (800 - levelWidth) / 2); // Center in container

      sortedNodes.forEach((node, index) => {
        const x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP);
        const y = depth * (NODE_HEIGHT + VERTICAL_GAP + 40);
        posMap.set(node.id, { x, y });
        maxX = Math.max(maxX, x + NODE_WIDTH);
        maxY = Math.max(maxY, y + NODE_HEIGHT);
      });
    });

    return {
      positions: posMap,
      dimensions: { width: maxX + 40, height: maxY + 40 },
    };
  }, [tree, rootNode, sortCriteria]);

  // Handle node click
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    onFocusNode(nodeId);
  }, [onFocusNode]);

  // Handle path selection
  const handleSelectPath = useCallback(async (decisionId: string) => {
    if (!selectedNodeId) return;
    // Close the modal immediately so the full-screen loading overlay can show
    setSelectedNodeId(null);
    setIsGenerating(true);
    await onSelectDecision(selectedNodeId, decisionId);
    setIsGenerating(false);
  }, [selectedNodeId, onSelectDecision]);

  // Close detail modal
  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const selectedNode = selectedNodeId ? tree.nodes.get(selectedNodeId) : null;

  if (!rootNode) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No decision tree available. Enter your situation to begin.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{tree.nodes.size}</span> nodes explored
          </div>
          <div className="text-sm text-gray-400">
            Click a node to see details and explore paths
          </div>
        </div>
        
        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Sort by:</span>
          <select
            value={sortCriteria}
            onChange={(e) => setSortCriteria(e.target.value as SortCriteria)}
            className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="probability">Most Likely</option>
            <option value="salary">Highest Salary</option>
            <option value="netWorth">Best Net Worth</option>
            <option value="growth">Fastest Growth</option>
            <option value="risk">Highest Risk</option>
          </select>
        </div>
      </div>

      {/* Graph area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
      >
        <div 
          className="relative"
          style={{ 
            minWidth: Math.max(dimensions.width, 800),
            minHeight: Math.max(dimensions.height, 400),
          }}
        >
          {/* SVG for connection lines */}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            
            {/* CSS for path animation */}
            <style>{`
              @keyframes drawPath {
                from {
                  stroke-dashoffset: var(--path-length, 300);
                }
                to {
                  stroke-dashoffset: 0;
                }
              }
              .animate-draw-path {
                animation: drawPath 0.8s ease-out forwards;
              }
            `}</style>
            
            {/* Render all connections */}
            {Array.from(tree.nodes.values()).map((node) => (
              <ConnectionLines
                key={node.id}
                positions={positions}
                parentId={node.id}
                childIds={node.childIds}
                newNodeId={newNodeId}
                inactiveNodeIds={inactiveNodeIds}
              />
            ))}
          </svg>

          {/* Render nodes */}
          {Array.from(tree.nodes.values()).map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            
            const isInactive = inactiveNodeIds.has(node.id);

            return (
              <div
                key={node.id}
                className={`absolute transition-all duration-300 ${isInactive ? 'opacity-40 grayscale' : ''}`}
                style={{ left: pos.x, top: pos.y }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <CompactNode
                  node={node}
                  isSelected={selectedNodeId === node.id || tree.currentFocusId === node.id}
                  isRoot={node.id === tree.rootId}
                  onClick={() => !isInactive && handleNodeClick(node.id)}
                />
              </div>
            );
          })}
          
          {/* Render ghost nodes for alternative paths on hover */}
          {hoveredNodeId && (() => {
            const hoveredNode = tree.nodes.get(hoveredNodeId);
            const hoveredPos = positions.get(hoveredNodeId);
            if (!hoveredNode || !hoveredPos || !hoveredNode.isExpanded || !hoveredNode.selectedDecisionId) return null;
            
            // Get unselected decisions
            const unselectedDecisions = hoveredNode.decisions.filter(
              d => d.id !== hoveredNode.selectedDecisionId
            );
            
            if (unselectedDecisions.length === 0) return null;
            
            return unselectedDecisions.map((decision, index) => (
              <GhostNode
                key={decision.id}
                decision={decision}
                parentPosition={hoveredPos}
                index={index}
                totalAlternatives={unselectedDecisions.length}
                onSelect={async () => {
                  setHoveredNodeId(null);
                  setIsGenerating(true);
                  await switchPath(hoveredNodeId, decision.id);
                  setIsGenerating(false);
                }}
              />
            ));
          })()}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-purple-500/50" />
            <span>Starting Point</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-emerald-500/50" />
            <span>$300K+ salary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-blue-500/50" />
            <span>$150K+ salary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-yellow-500/50" />
            <span>$80K+ salary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-gray-600" />
            <span>Other</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNode && (
        <ExpandedNodeDetail
          node={selectedNode}
          onClose={handleCloseDetail}
          onSelectPath={handleSelectPath}
        />
      )}
    </div>
  );
}
