'use client';

import { useManifoldStore } from '@/store/useManifoldStore';
import { formatUSD } from '@/engine';

interface OutcomeProbabilitiesProps {
  compact?: boolean;
}

export function OutcomeProbabilities({ compact = false }: OutcomeProbabilitiesProps) {
  const { outcomeStats, simulationResult, goalYear, userAge, currentYear } = useManifoldStore();
  
  const goalAge = userAge + (goalYear - currentYear);

  if (!simulationResult) {
    return (
      <div className="text-gray-500 text-sm text-center py-4">
        Run a simulation to see probabilities
      </div>
    );
  }

  const outcomes = [
    {
      icon: '💰',
      label: 'Wealthy',
      probability: outcomeStats.wealthyOutcome,
      color: '#fbbf24',
    },
    {
      icon: '⚖️',
      label: 'Balanced',
      probability: outcomeStats.balancedOutcome,
      color: '#14b8a6',
    },
    {
      icon: '💪',
      label: 'Healthy',
      probability: outcomeStats.highVitality,
      color: '#22c55e',
    },
    {
      icon: '🔥',
      label: 'Burnout',
      probability: outcomeStats.burnoutRisk,
      color: '#ef4444',
    },
  ];

  const { meanFinalNetWorth, medianFinalNetWorth } = simulationResult.statistics;

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Net Worth Summary */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">Average</div>
            <div className="text-sm font-bold text-white">{formatUSD(meanFinalNetWorth)}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2">
            <div className="text-[10px] text-gray-500">Median</div>
            <div className="text-sm font-bold text-white">{formatUSD(medianFinalNetWorth)}</div>
          </div>
        </div>

        {/* Compact outcome bars */}
        <div className="space-y-2">
          {outcomes.map((outcome) => (
            <div key={outcome.label} className="flex items-center gap-2">
              <span className="text-xs w-4">{outcome.icon}</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${outcome.probability * 100}%`,
                    backgroundColor: outcome.color,
                  }}
                />
              </div>
              <span 
                className="text-xs font-medium w-8 text-right"
                style={{ color: outcome.color }}
              >
                {Math.round(outcome.probability * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Success rate */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-400">Success Rate</span>
          <span className="text-sm font-bold text-emerald-400">
            {Math.round(simulationResult.statistics.successProbability * 100)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Outcome Probabilities</h3>
        <span className="text-xs text-gray-500">at Age {goalAge}</span>
      </div>

      {/* Net Worth Projections */}
      <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
        <div className="text-xs text-gray-500 mb-2">Projected Net Worth</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400">Average</div>
            <div className="text-lg font-bold text-white">{formatUSD(meanFinalNetWorth)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Median</div>
            <div className="text-lg font-bold text-white">{formatUSD(medianFinalNetWorth)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {outcomes.map((outcome) => (
          <div key={outcome.label} className="relative">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{outcome.icon}</span>
                <span className="text-sm text-white">{outcome.label}</span>
              </div>
              <span 
                className="text-sm font-bold"
                style={{ color: outcome.color }}
              >
                {Math.round(outcome.probability * 100)}%
              </span>
            </div>
            
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${outcome.probability * 100}%`,
                  backgroundColor: outcome.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Overall Success Rate</span>
          <span className="text-lg font-bold text-emerald-400">
            {Math.round(simulationResult.statistics.successProbability * 100)}%
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Based on {simulationResult.paths.length} simulated paths
        </div>
      </div>
    </div>
  );
}
