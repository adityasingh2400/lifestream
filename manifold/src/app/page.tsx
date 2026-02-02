'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ControlPanel, StartingPointPanel } from '@/components/controls';
import { ArchetypeTimeline, TimelineScrubber } from '@/components/timeline';
import { OutcomeProbabilities, DimensionRadar, PathInfoPanel } from '@/components/panels';
import { useManifoldStore } from '@/store/useManifoldStore';
import { formatUSD } from '@/engine';

// Dynamic import for Sankey (uses D3, needs client-side only)
const SankeyDiagram = dynamic(
  () => import('@/components/sankey/SankeyDiagram').then(mod => ({ default: mod.SankeyDiagram })),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-900/50 rounded-xl animate-pulse" /> }
);

// Collapsible panel component
function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true,
  className = '',
}: { 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`bg-gray-900/80 backdrop-blur rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { 
    runSimulation, 
    userAge, 
    currentYear, 
    goalYear,
    simulationResult,
    goldenPath,
  } = useManifoldStore();

  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Run initial simulation on mount
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const goalAge = userAge + (goalYear - currentYear);

  return (
    <main className="relative w-screen h-screen bg-gray-950 overflow-hidden flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Lifestream
            </h1>
            <Link 
              href="/explore"
              className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
            >
              Try Explorer →
            </Link>
            <span className="text-gray-500 text-sm hidden sm:inline">
              Age {userAge} → {goalAge} ({goalYear - currentYear} years)
            </span>
          </div>
          
          {/* Quick stats in header */}
          {simulationResult && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Net Worth:</span>
                <span className="font-bold text-white">
                  {formatUSD(simulationResult.statistics.medianFinalNetWorth)}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-gray-500">Success:</span>
                <span className="font-bold text-emerald-400">
                  {Math.round(simulationResult.statistics.successProbability * 100)}%
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-gray-500">Burnout:</span>
                <span className="font-bold text-red-400">
                  {Math.round(simulationResult.statistics.burnoutProbability * 100)}%
                </span>
              </div>
              
              {/* Panel toggles */}
              <div className="flex items-center gap-1 ml-4 border-l border-gray-700 pl-4">
                <button
                  onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                  className={`p-1.5 rounded transition-colors ${leftPanelOpen ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                  title="Toggle Controls"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
                <button
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className={`p-1.5 rounded transition-colors ${rightPanelOpen ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                  title="Toggle Details"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Controls (collapsible) */}
        <div 
          className={`flex-shrink-0 border-r border-gray-800 transition-all duration-300 overflow-hidden ${
            leftPanelOpen ? 'w-72' : 'w-0'
          }`}
        >
          <div className="w-72 h-full p-3 space-y-3 overflow-y-auto">
            <CollapsiblePanel title="Where you are now" defaultOpen={true}>
              <StartingPointPanel />
            </CollapsiblePanel>
            <CollapsiblePanel title="Simulation Settings" defaultOpen={true}>
              <ControlPanel compact />
            </CollapsiblePanel>
            <CollapsiblePanel title="Outcome Probabilities" defaultOpen={true}>
              <OutcomeProbabilities compact />
            </CollapsiblePanel>
          </div>
        </div>

        {/* Center - Main Visualization Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Sankey Visualization - Takes most space */}
          <div className="flex-1 p-3 min-h-0">
            <SankeyDiagram />
          </div>
          
          {/* Archetype Timeline - Compact at bottom of center */}
          <div className="flex-shrink-0 px-3 pb-2">
            <ArchetypeTimeline compact />
          </div>
        </div>

        {/* Right sidebar - Path Details (collapsible) */}
        <div 
          className={`flex-shrink-0 border-l border-gray-800 transition-all duration-300 overflow-hidden ${
            rightPanelOpen ? 'w-72' : 'w-0'
          }`}
        >
          <div className="w-72 h-full p-3 space-y-3 overflow-y-auto">
            <CollapsiblePanel title="Path Details" defaultOpen={true}>
              <PathInfoPanel compact />
            </CollapsiblePanel>
            <CollapsiblePanel title="Dimension Breakdown" defaultOpen={false}>
              <DimensionRadar compact />
            </CollapsiblePanel>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Scrubber - Always visible */}
      <TimelineScrubber />
    </main>
  );
}
