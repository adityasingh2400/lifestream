'use client';

import { useMemo } from 'react';
import { useManifoldStore } from '@/store/useManifoldStore';
import { 
  STATE_DIMENSIONS, 
  StateDimension,
  StateVector,
  formatUSD,
} from '@/engine';

const DIMENSION_LABELS: Record<StateDimension, { label: string; color: string; icon: string; shortLabel: string }> = {
  Wl: { label: 'Liquid Wealth', shortLabel: 'Liquid', color: '#fbbf24', icon: '💵' },
  We: { label: 'Equity', shortLabel: 'Equity', color: '#f97316', icon: '📈' },
  V: { label: 'Vitality', shortLabel: 'Vital', color: '#22c55e', icon: '💪' },
  I: { label: 'Intelligence', shortLabel: 'Intel', color: '#3b82f6', icon: '🧠' },
  S: { label: 'Status', shortLabel: 'Status', color: '#8b5cf6', icon: '⭐' },
  R: { label: 'Resilience', shortLabel: 'Resil', color: '#ec4899', icon: '🛡️' },
};

interface RadarChartProps {
  values: number[];
  compareValues?: number[];
  size?: number;
}

function RadarChart({ values, compareValues, size = 140 }: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 25;
  const angleStep = (Math.PI * 2) / 6;

  const getPolygonPoints = (vals: number[]) => {
    return vals.map((v, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = v * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
  };

  const axisLines = STATE_DIMENSIONS.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return {
      x2: center + radius * Math.cos(angle),
      y2: center + radius * Math.sin(angle),
    };
  });

  const circles = [0.25, 0.5, 0.75, 1].map(scale => radius * scale);

  return (
    <svg width={size} height={size} className="mx-auto">
      {circles.map((r, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      ))}

      {axisLines.map((line, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      ))}

      {compareValues && (
        <polygon
          points={getPolygonPoints(compareValues)}
          fill="rgba(100,100,100,0.2)"
          stroke="rgba(150,150,150,0.5)"
          strokeWidth="1"
        />
      )}

      <polygon
        points={getPolygonPoints(values)}
        fill="rgba(99,102,241,0.3)"
        stroke="#6366f1"
        strokeWidth="2"
      />

      {values.map((v, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = v * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill={DIMENSION_LABELS[STATE_DIMENSIONS[i]].color}
            stroke="white"
            strokeWidth="1"
          />
        );
      })}

      {STATE_DIMENSIONS.map((dim, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelRadius = radius + 18;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        return (
          <text
            key={dim}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-[11px] fill-gray-400"
          >
            {DIMENSION_LABELS[dim].icon}
          </text>
        );
      })}
    </svg>
  );
}

interface DimensionRadarProps {
  compact?: boolean;
}

export function DimensionRadar({ compact = false }: DimensionRadarProps) {
  const { 
    displayPaths, 
    hoveredPathId, 
    selectedPathId, 
    goldenPath,
    simulationResult,
    viewYear,
    currentYear,
  } = useManifoldStore();

  const activePath = useMemo(() => {
    if (hoveredPathId) {
      return displayPaths.find(p => p.id === hoveredPathId);
    }
    if (selectedPathId) {
      return displayPaths.find(p => p.id === selectedPathId);
    }
    return goldenPath;
  }, [displayPaths, hoveredPathId, selectedPathId, goldenPath]);

  const { currentValues, viewYearValues, meanValues, realUnits } = useMemo(() => {
    if (!activePath) {
      return { currentValues: null, viewYearValues: null, meanValues: null, realUnits: null };
    }

    const current = activePath.states[0];
    const yearIndex = Math.min(viewYear - currentYear, activePath.states.length - 1);
    const viewState = activePath.states[Math.max(0, yearIndex)];
    
    const currentValues = STATE_DIMENSIONS.map(dim => current[dim]);
    const viewYearValues = STATE_DIMENSIONS.map(dim => viewState[dim]);

    const stateVector = new StateVector({
      Wl: viewState.Wl,
      We: viewState.We,
      V: viewState.V,
      I: viewState.I,
      S: viewState.S,
      R: viewState.R,
      vitality: viewState.vitality,
    });
    const realUnits = stateVector.toRealUnits();

    let meanValues: number[] | null = null;
    if (simulationResult && simulationResult.meanPath.length > yearIndex) {
      const meanState = simulationResult.meanPath[Math.max(0, yearIndex)];
      meanValues = STATE_DIMENSIONS.map(dim => meanState[dim]);
    }

    return { currentValues, viewYearValues, meanValues, realUnits };
  }, [activePath, simulationResult, viewYear, currentYear]);

  if (!activePath || !viewYearValues || !realUnits) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        Hover over a path to see breakdown
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <RadarChart 
          values={viewYearValues} 
          compareValues={meanValues || undefined}
          size={120}
        />
        
        {/* Compact dimension list */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {STATE_DIMENSIONS.map((dim, i) => {
            const info = DIMENSION_LABELS[dim];
            const value = viewYearValues[i];
            
            let displayValue: string;
            if (dim === 'Wl') {
              displayValue = formatUSD(realUnits.liquidWealth);
            } else if (dim === 'We') {
              displayValue = formatUSD(realUnits.equity);
            } else {
              displayValue = `${Math.round(value * 100)}%`;
            }
            
            return (
              <div key={dim} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{info.icon} {info.shortLabel}</span>
                <span className="text-[10px] font-medium" style={{ color: info.color }}>
                  {displayValue}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="text-[10px] text-gray-500 text-center">
          Gray = average outcome
        </div>
      </div>
    );
  }

  // Full version
  const pathLabel = activePath.isGoldenPath 
    ? 'Optimal Path' 
    : hoveredPathId 
      ? 'Hovered Path' 
      : 'Selected Path';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{pathLabel} @ {viewYear}</span>
      </div>

      <RadarChart 
        values={viewYearValues} 
        compareValues={meanValues || undefined}
      />

      <div className="p-2 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Net Worth</span>
          <span className="font-bold text-white">{formatUSD(realUnits.netWorth)}</span>
        </div>
      </div>

      <div className="p-2 bg-gray-800/50 rounded-lg">
        <div className="text-xs text-gray-400 mb-1">Vitality</div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
            {realUnits.bodyLabel}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {realUnits.mindLabel}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            {realUnits.appearanceLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STATE_DIMENSIONS.map((dim, i) => {
          const info = DIMENSION_LABELS[dim];
          const value = viewYearValues[i];
          const change = currentValues ? value - currentValues[i] : 0;
          
          let displayValue: string;
          if (dim === 'Wl') {
            displayValue = formatUSD(realUnits.liquidWealth);
          } else if (dim === 'We') {
            displayValue = formatUSD(realUnits.equity);
          } else {
            displayValue = `${Math.round(value * 100)}%`;
          }
          
          return (
            <div key={dim} className="flex items-center gap-2">
              <span className="text-sm">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 truncate">{info.label}</span>
                  <span className="text-xs font-medium" style={{ color: info.color }}>
                    {displayValue}
                  </span>
                </div>
                {change !== 0 && (
                  <span className={`text-[10px] ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change > 0 ? '+' : ''}{Math.round(change * 100)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {meanValues && (
        <div className="pt-2 border-t border-gray-700 text-xs text-gray-500 text-center">
          Gray area = average outcome
        </div>
      )}
    </div>
  );
}
