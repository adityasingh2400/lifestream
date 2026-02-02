'use client';

import { useMemo } from 'react';
import { useManifoldStore } from '@/store/useManifoldStore';
import { 
  PATH_CATEGORY_INFO,
  StateVector,
  formatUSD,
} from '@/engine';
import { MilestoneBadge } from '../checkpoints/CheckpointIcon';

// Adjective color mapping - colors based on quality level (bad to good)
const ADJECTIVE_COLORS: Record<string, string> = {
  // Level 1 - Critical (red)
  'Frail': '#ef4444',
  'Burned Out': '#ef4444',
  'Neglected': '#ef4444',
  'Struggling': '#ef4444',
  'Unknown': '#ef4444',
  'Broken': '#ef4444',
  // Level 2 - Poor (orange)
  'Weak': '#f97316',
  'Stressed': '#f97316',
  'Plain': '#f97316',
  'Below Average': '#f97316',
  'Obscure': '#f97316',
  'Fragile': '#f97316',
  // Level 3 - Average (yellow)
  'Average': '#eab308',
  'Coping': '#eab308',
  'Presentable': '#eab308',
  'Known': '#eab308',
  'Vulnerable': '#eab308',
  // Level 4 - Good (green)
  'Fit': '#22c55e',
  'Calm': '#22c55e',
  'Attractive': '#22c55e',
  'Smart': '#22c55e',
  'Respected': '#22c55e',
  'Stable': '#22c55e',
  // Level 5 - Great (teal)
  'Athletic': '#14b8a6',
  'Sharp': '#14b8a6',
  'Brilliant': '#14b8a6',
  'Influential': '#14b8a6',
  'Resilient': '#14b8a6',
  // Level 6 - Peak (cyan)
  'Peak': '#06b6d4',
  'Zen': '#06b6d4',
  'Stunning': '#06b6d4',
  'Genius': '#06b6d4',
  'Elite': '#06b6d4',
  'Unshakeable': '#06b6d4',
};

function CompactBadge({ value }: { value: string }) {
  const color = ADJECTIVE_COLORS[value] || '#888';
  return (
    <span 
      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{ color, backgroundColor: color + '22' }}
    >
      {value}
    </span>
  );
}

function AdjectiveBadge({ label, value }: { label: string; value: string }) {
  const color = ADJECTIVE_COLORS[value] || '#888';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span 
        className="text-sm font-medium px-2 py-0.5 rounded"
        style={{ color, backgroundColor: color + '22' }}
      >
        {value}
      </span>
    </div>
  );
}

interface PathInfoPanelProps {
  compact?: boolean;
}

export function PathInfoPanel({ compact = false }: PathInfoPanelProps) {
  const { 
    displayPaths, 
    hoveredPathId, 
    selectedPathId, 
    goldenPath,
    currentYear,
    goalYear,
    userAge,
    viewYear,
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

  const stateAtViewYear = useMemo(() => {
    if (!activePath) return null;
    const yearIndex = viewYear - currentYear;
    if (yearIndex >= 0 && yearIndex < activePath.states.length) {
      return activePath.states[yearIndex];
    }
    return activePath.states[activePath.states.length - 1];
  }, [activePath, viewYear, currentYear]);

  if (!activePath || !stateAtViewYear) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        Hover over a path to see details
      </div>
    );
  }

  const categoryInfo = PATH_CATEGORY_INFO[activePath.category];

  const currentStateVector = new StateVector({
    Wl: stateAtViewYear.Wl,
    We: stateAtViewYear.We,
    V: stateAtViewYear.V,
    I: stateAtViewYear.I,
    S: stateAtViewYear.S,
    R: stateAtViewYear.R,
    vitality: stateAtViewYear.vitality,
  });
  const realUnits = currentStateVector.toRealUnits();

  const initialNetWorth = activePath.netWorthByYear?.get(currentYear) || 0;
  const finalNetWorth = activePath.netWorthByYear?.get(goalYear) || realUnits.netWorth;
  const wealthChange = finalNetWorth - initialNetWorth;
  const milestones = activePath.milestones || [];

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Category + Optimal badge */}
        <div className="flex items-center justify-between">
          <div 
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
            style={{ 
              backgroundColor: categoryInfo.color + '22',
              color: categoryInfo.color,
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categoryInfo.color }} />
            {categoryInfo.label}
          </div>
          {activePath.isGoldenPath && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded">
              Optimal
            </span>
          )}
        </div>

        {/* Net Worth */}
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-gray-500">Net Worth ({viewYear})</span>
            <span className={`text-[10px] ${wealthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {wealthChange >= 0 ? '+' : ''}{formatUSD(wealthChange)}
            </span>
          </div>
          <div className="text-xl font-bold text-white">{formatUSD(realUnits.netWorth)}</div>
        </div>

        {/* Vitality badges */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Vitality</div>
          <div className="flex flex-wrap gap-1">
            <CompactBadge value={realUnits.bodyLabel} />
            <CompactBadge value={realUnits.mindLabel} />
            <CompactBadge value={realUnits.appearanceLabel} />
          </div>
        </div>

        {/* Attributes */}
        <div>
          <div className="text-[10px] text-gray-500 mb-1">Attributes</div>
          <div className="flex flex-wrap gap-1">
            <CompactBadge value={realUnits.intelligenceLabel} />
            <CompactBadge value={realUnits.statusLabel} />
            <CompactBadge value={realUnits.resilienceLabel} />
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800/30 rounded p-1.5">
            <div className="text-[10px] text-gray-500">Prob</div>
            <div className="text-xs font-medium text-white">{(activePath.probability * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/30 rounded p-1.5">
            <div className="text-[10px] text-gray-500">Risk</div>
            <div className={`text-xs font-medium ${activePath.riskScore > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
              {(activePath.riskScore * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-gray-800/30 rounded p-1.5">
            <div className="text-[10px] text-gray-500">Min R</div>
            <div className={`text-xs font-medium ${activePath.minResilience < 0.3 ? 'text-red-400' : 'text-white'}`}>
              {(activePath.minResilience * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Milestones (compact) – 3D icons for first 2, then labels */}
        {milestones.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 mb-1">Milestones ({milestones.length})</div>
            <div className="flex flex-wrap items-center gap-2">
              {milestones.slice(0, 2).map((m) => (
                <MilestoneBadge
                  key={m.id}
                  icon={m.icon}
                  label={m.label}
                  description={m.description}
                  year={m.year}
                />
              ))}
              {milestones.slice(2, 4).map((m) => (
                <span key={m.id} className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                  {m.label}
                </span>
              ))}
              {milestones.length > 4 && (
                <span className="text-[10px] text-gray-500">+{milestones.length - 4}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        {activePath.isGoldenPath && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
            Optimal
          </span>
        )}
      </div>

      <div 
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ 
          backgroundColor: categoryInfo.color + '22',
          border: `1px solid ${categoryInfo.color}44`,
        }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryInfo.color }} />
        <span style={{ color: categoryInfo.color }} className="text-sm font-medium">
          {categoryInfo.label}
        </span>
      </div>

      <p className="text-xs text-gray-400">{categoryInfo.description}</p>

      <div className="bg-gray-800/50 rounded-xl p-3">
        <div className="text-xs text-gray-500 mb-1">Net Worth at {viewYear}</div>
        <div className="text-2xl font-bold text-white mb-2">{formatUSD(realUnits.netWorth)}</div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-gray-500">Liquid: </span>
            <span className="text-green-400">{formatUSD(realUnits.liquidWealth)}</span>
          </div>
          <div>
            <span className="text-gray-500">Equity: </span>
            <span className="text-blue-400">{formatUSD(realUnits.equity)}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-500">Total Change: </span>
          <span className={`text-sm font-medium ${wealthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {wealthChange >= 0 ? '+' : ''}{formatUSD(wealthChange)}
          </span>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vitality</h4>
        <div className="space-y-2">
          <AdjectiveBadge label="Body" value={realUnits.bodyLabel} />
          <AdjectiveBadge label="Mind" value={realUnits.mindLabel} />
          <AdjectiveBadge label="Appearance" value={realUnits.appearanceLabel} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Attributes</h4>
        <div className="space-y-2">
          <AdjectiveBadge label="Intelligence" value={realUnits.intelligenceLabel} />
          <AdjectiveBadge label="Status" value={realUnits.statusLabel} />
          <AdjectiveBadge label="Resilience" value={realUnits.resilienceLabel} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Path Metrics</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Probability</span>
            <span className="text-sm font-medium text-white">{(activePath.probability * 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Risk Score</span>
            <span className={`text-sm font-medium ${activePath.riskScore > 0.5 ? 'text-red-400' : 'text-green-400'}`}>
              {(activePath.riskScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Min Resilience</span>
            <span className={`text-sm font-medium ${activePath.minResilience < 0.3 ? 'text-red-400' : 'text-white'}`}>
              {(activePath.minResilience * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {milestones.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Milestones Reached
          </h4>
          <div className="space-y-2">
            {milestones.slice(0, 5).map((milestone) => (
              <MilestoneBadge
                key={milestone.id}
                icon={milestone.icon}
                label={milestone.label}
                description={milestone.description}
                year={milestone.year}
              />
            ))}
            {milestones.length > 5 && (
              <div className="text-xs text-gray-500 text-center">
                +{milestones.length - 5} more milestones
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-gray-700 text-xs text-gray-500">
        Journey: Age {userAge} → Age {userAge + (goalYear - currentYear)} | Viewing: {viewYear}
      </div>
    </div>
  );
}
