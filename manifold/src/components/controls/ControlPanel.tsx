'use client';

import { useManifoldStore } from '@/store/useManifoldStore';

interface ControlPanelProps {
  compact?: boolean;
}

export function ControlPanel({ compact = false }: ControlPanelProps) {
  const {
    effortMultiplier,
    setEffortMultiplier,
    riskTolerance,
    setRiskTolerance,
    userAge,
    setUserAge,
    isSimulating,
    runSimulation,
  } = useManifoldStore();

  if (compact) {
    return (
      <div className="space-y-3">
        {/* User Age */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Age</span>
            <span className="text-white font-medium">{userAge}</span>
          </div>
          <input
            type="range"
            min="16"
            max="50"
            value={userAge}
            onChange={(e) => setUserAge(Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Effort Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Effort</span>
            <span className="text-white font-medium">{Math.round(effortMultiplier * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={effortMultiplier * 100}
            onChange={(e) => setEffortMultiplier(Number(e.target.value) / 100)}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Risk Tolerance Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Risk</span>
            <span className="text-white font-medium">{Math.round(riskTolerance * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={riskTolerance * 100}
            onChange={(e) => setRiskTolerance(Number(e.target.value) / 100)}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Re-run button */}
        <button
          onClick={() => runSimulation()}
          disabled={isSimulating}
          className="w-full py-1.5 px-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium text-xs hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
        >
          {isSimulating ? 'Running...' : 'Re-run'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
      <h2 className="text-lg font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Simulation Settings
      </h2>

      {/* User Age */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Your Age: {userAge}
        </label>
        <input
          type="range"
          min="16"
          max="50"
          value={userAge}
          onChange={(e) => setUserAge(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>

      {/* Effort Slider */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Effort Level: {Math.round(effortMultiplier * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={effortMultiplier * 100}
          onChange={(e) => setEffortMultiplier(Number(e.target.value) / 100)}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Relaxed</span>
          <span>Intense</span>
        </div>
      </div>

      {/* Risk Tolerance Slider */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Risk Tolerance: {Math.round(riskTolerance * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={riskTolerance * 100}
          onChange={(e) => setRiskTolerance(Number(e.target.value) / 100)}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Conservative</span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* Re-run button */}
      <button
        onClick={() => runSimulation()}
        disabled={isSimulating}
        className="w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSimulating ? 'Simulating...' : 'Re-run Simulation'}
      </button>

      {/* Help text */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Drag archetypes on the timeline below</p>
          <p>• Hover paths to see details</p>
          <p>• Golden path = optimal outcome</p>
        </div>
      </div>
    </div>
  );
}
