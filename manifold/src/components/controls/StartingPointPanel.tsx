'use client';

import { useState } from 'react';
import { useManifoldStore } from '@/store/useManifoldStore';
import {
  StateVector,
  PRESET_STATES,
  formatUSD,
  normalizedToLiquidUSD,
  normalizedToEquityUSD,
  WEALTH_CONFIG,
} from '@/engine';

const PRESET_OPTIONS: { id: keyof typeof PRESET_STATES; label: string; description: string }[] = [
  { id: 'founder', label: 'Founder', description: 'Low cash, equity potential' },
  { id: 'student', label: 'Student', description: 'Loans, learning, young' },
  { id: 'professional', label: 'Professional', description: 'Stable income, savings' },
  { id: 'homeless', label: 'Homeless', description: 'Debt, poor health' },
  { id: 'rich', label: 'Rich', description: 'High wealth, comfortable' },
];

export function StartingPointPanel() {
  const { currentState, setCurrentState, runSimulation } = useManifoldStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const realLiquid = normalizedToLiquidUSD(currentState.Wl);
  const realEquity = normalizedToEquityUSD(currentState.We);
  const netWorth = realLiquid + realEquity;

  const handlePreset = (presetId: keyof typeof PRESET_STATES) => {
    const preset = PRESET_STATES[presetId];
    if (preset) {
      setCurrentState(preset.clone());
    }
  };

  const handleLiquidChange = (usd: number) => {
    const clamped = Math.max(WEALTH_CONFIG.liquid.min, Math.min(WEALTH_CONFIG.liquid.max, usd));
    const newState = StateVector.fromRealUnits({
      liquidWealth: clamped,
      equity: realEquity,
      vitality: currentState.vitality,
      intelligence: currentState.I,
      status: currentState.S,
      resilience: currentState.R,
    });
    setCurrentState(newState);
  };

  const handleEquityChange = (usd: number) => {
    const clamped = Math.max(0, Math.min(WEALTH_CONFIG.equity.max, usd));
    const newState = StateVector.fromRealUnits({
      liquidWealth: realLiquid,
      equity: clamped,
      vitality: currentState.vitality,
      intelligence: currentState.I,
      status: currentState.S,
      resilience: currentState.R,
    });
    setCurrentState(newState);
  };

  const handleVitalityChange = (key: 'body' | 'mind' | 'appearance', value: number) => {
    const v = Math.max(0, Math.min(1, value));
    const vitality = { ...currentState.vitality, [key]: v };
    const newState = new StateVector({
      ...currentState.toData(),
      vitality,
    });
    setCurrentState(newState);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Where you are now</h3>
        <button
          type="button"
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="text-[10px] text-gray-500 hover:text-gray-400"
        >
          {showHowItWorks ? 'Hide' : 'How net worth works'}
        </button>
      </div>

      {showHowItWorks && (
        <div className="bg-gray-800/60 rounded-lg p-2 text-[10px] text-gray-400 space-y-1 border border-gray-700">
          <p><strong className="text-gray-300">Net worth</strong> = Liquid + Equity (USD).</p>
          <p><strong className="text-gray-300">Liquid:</strong> −$100K to $10M (cash, savings).</p>
          <p><strong className="text-gray-300">Equity:</strong> $0 to $50M (stocks, ownership).</p>
          <p>Values are mapped from 0–1 with an exponential curve (founder-style range). Simulation starts from this state and evolves with your archetype choices.</p>
        </div>
      )}

      {/* Presets */}
      <div>
        <div className="text-[10px] text-gray-500 mb-1">Starting point preset</div>
        <div className="flex flex-wrap gap-1">
          {PRESET_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handlePreset(id)}
              className="px-2 py-1 rounded text-[10px] font-medium transition-all hover:scale-105 bg-gray-700/80 text-gray-300 hover:text-white hover:bg-gray-600"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Current net worth summary */}
      <div className="bg-gray-800/50 rounded-lg p-2">
        <div className="text-[10px] text-gray-500 mb-0.5">Starting net worth</div>
        <div className="text-lg font-bold text-white">{formatUSD(netWorth)}</div>
        <div className="flex gap-3 text-[10px] mt-1">
          <span className="text-green-400">Liquid {formatUSD(realLiquid)}</span>
          <span className="text-blue-400">Equity {formatUSD(realEquity)}</span>
        </div>
      </div>

      {/* Override with USD inputs */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[10px] text-gray-500 hover:text-gray-400 flex items-center gap-1"
        >
          {showAdvanced ? '▼' : '▶'} Override with your numbers
        </button>
        {showAdvanced && (
          <div className="mt-2 space-y-2 pl-1 border-l border-gray-700">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Liquid (USD)</label>
              <input
                type="number"
                value={Math.round(realLiquid)}
                onChange={(e) => handleLiquidChange(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-gray-800 text-white text-xs"
                step={10000}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Equity (USD)</label>
              <input
                type="number"
                value={Math.round(realEquity)}
                onChange={(e) => handleEquityChange(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-gray-800 text-white text-xs"
                min={0}
                step={10000}
              />
            </div>
            <div>
              <div className="text-[10px] text-gray-500 mb-1">Vitality (Body / Mind / Appearance)</div>
              <div className="grid grid-cols-3 gap-1">
                {(['body', 'mind', 'appearance'] as const).map((key) => (
                  <div key={key}>
                    <div className="text-[9px] text-gray-500 capitalize">{key}</div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(currentState.vitality[key] * 100)}
                      onChange={(e) => handleVitalityChange(key, Number(e.target.value) / 100)}
                      className="w-full h-1 bg-gray-700 rounded accent-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
