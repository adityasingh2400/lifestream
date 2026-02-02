'use client';

import { useState, useEffect } from 'react';
import { useDecisionTreeStore } from '@/store/useDecisionTreeStore';
import { DecisionTreeVisualization } from '@/components/tree';
import { formatUSD } from '@/engine';

// ============================================================================
// AI THINKING MESSAGES
// ============================================================================

const THINKING_PHASES = [
  // Phase 1: Initialization
  {
    messages: [
      "Initializing quantum probability matrices...",
      "Calibrating the multiverse scanner...",
      "Warming up the neural pathways...",
      "Connecting to the cosmic database...",
    ],
    duration: 2000,
  },
  // Phase 2: Analysis
  {
    messages: [
      "Analyzing your unique life signature...",
      "Cross-referencing 10 million career trajectories...",
      "Mapping your skills to opportunity space...",
      "Calculating butterfly effect coefficients...",
      "Scanning parallel timeline outcomes...",
    ],
    duration: 3000,
  },
  // Phase 3: Deep thinking
  {
    messages: [
      "Consulting the oracle of possibilities...",
      "Channeling the wisdom of a thousand mentors...",
      "Simulating 50,000 possible futures...",
      "Bending the probability curves in your favor...",
      "Negotiating with the laws of the universe...",
    ],
    duration: 3000,
  },
  // Phase 4: Synthesis
  {
    messages: [
      "Crystallizing optimal decision pathways...",
      "Weaving your destiny threads together...",
      "Distilling infinite possibilities into actionable paths...",
      "Aligning the stars for maximum potential...",
      "Finalizing your personalized future map...",
    ],
    duration: 2000,
  },
];

const THINKING_EMOJIS = ["🔮", "✨", "🌟", "💫", "🎯", "🚀", "🧠", "⚡", "🌌", "🎲"];

function AIThinkingOverlay({ isInitial = false }: { isInitial?: boolean }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [emoji, setEmoji] = useState(THINKING_EMOJIS[0]);

  useEffect(() => {
    // Cycle through messages within current phase
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => {
        const phase = THINKING_PHASES[phaseIndex];
        return (prev + 1) % phase.messages.length;
      });
      setEmoji(THINKING_EMOJIS[Math.floor(Math.random() * THINKING_EMOJIS.length)]);
    }, 1500);

    return () => clearInterval(messageInterval);
  }, [phaseIndex]);

  useEffect(() => {
    // Progress through phases
    let totalDuration = 0;
    const phaseDurations = THINKING_PHASES.map(p => p.duration);
    const totalTime = phaseDurations.reduce((a, b) => a + b, 0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = Math.min(prev + 1, 95); // Cap at 95% until actually done
        
        // Calculate which phase we should be in
        let accumulated = 0;
        for (let i = 0; i < phaseDurations.length; i++) {
          accumulated += (phaseDurations[i] / totalTime) * 100;
          if (newProgress < accumulated) {
            setPhaseIndex(i);
            break;
          }
        }
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, []);

  const currentPhase = THINKING_PHASES[phaseIndex];
  const currentMessage = currentPhase.messages[messageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-md">
      <div className="max-w-lg w-full mx-4">
        {/* Main card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 p-8 shadow-2xl">
          {/* Animated emoji */}
          <div className="text-center mb-6">
            <div className="text-6xl animate-bounce">{emoji}</div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center mb-2">
            {isInitial ? "Exploring Your Future" : "Calculating New Paths"}
          </h2>
          
          {/* Current thinking message */}
          <div className="h-12 flex items-center justify-center">
            <p className="text-purple-400 text-center animate-pulse">
              {currentMessage}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-6 mb-4">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Phase {phaseIndex + 1} of {THINKING_PHASES.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
          </div>

          {/* Phase indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {THINKING_PHASES.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < phaseIndex 
                    ? 'bg-green-500' 
                    : i === phaseIndex 
                      ? 'bg-purple-500 animate-pulse scale-125' 
                      : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Fun facts */}
          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="text-xs text-gray-600 text-center">
              {phaseIndex === 0 && "Did you know? The average person makes 35,000 decisions per day."}
              {phaseIndex === 1 && "Fun fact: Your career path has more branches than a redwood tree."}
              {phaseIndex === 2 && "Interesting: Small decisions today create massive differences in 10 years."}
              {phaseIndex === 3 && "Almost there: Your personalized paths are being crafted just for you."}
            </div>
          </div>
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) translateX(20px);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// CONTEXT INPUT PANEL
// ============================================================================

function ContextInputPanel() {
  const { 
    userSituation, 
    setUserSituation, 
    userAge, 
    setUserAge,
    generateTree,
    isGenerating,
    generationError,
    userContext,
    useAI,
    setUseAI,
  } = useDecisionTreeStore();

  const [isExpanded, setIsExpanded] = useState(true);

  const examplePrompts = [
    "I'm a 22-year-old CS student at Stanford, graduating in 3 months. I have $50K in student loans but also have internship experience at Google. I want to either start a company or join a high-paying job.",
    "I'm a 28-year-old software engineer at a mid-size startup making $150K. I have $80K saved and no debt. Thinking about joining FAANG or starting my own thing.",
    "I'm 19, just dropped out of college to pursue my startup idea. I have $10K in savings and my parents are supportive. High risk tolerance.",
    "I'm a 35-year-old product manager at Amazon making $300K. Burned out and considering a career change. Have $500K saved.",
  ];

  const handleGenerate = async () => {
    await generateTree();
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm font-semibold text-white">Your Situation</span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Age input */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Your Age</label>
            <input
              type="number"
              value={userAge}
              onChange={(e) => setUserAge(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
              min={16}
              max={80}
            />
          </div>

          {/* Situation textarea */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Describe your current situation, goals, and constraints
            </label>
            <textarea
              value={userSituation}
              onChange={(e) => setUserSituation(e.target.value)}
              placeholder="I'm a 22-year-old CS student at Stanford..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
              rows={4}
            />
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">AI-Powered Paths</div>
              <div className="text-[10px] text-gray-600">Uses Claude via AWS Bedrock</div>
            </div>
            <button
              onClick={() => setUseAI(!useAI)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useAI ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  useAI ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Example prompts */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Or try an example:</div>
            <div className="space-y-2">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setUserSituation(prompt)}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-gray-400 hover:text-white transition-colors line-clamp-2"
                >
                  {prompt.slice(0, 80)}...
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {generationError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-xs text-red-400 font-medium">Error generating paths</div>
              <div className="text-xs text-red-300 mt-1">{generationError}</div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!userSituation.trim() || isGenerating}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {useAI ? 'AI is thinking...' : 'Generating...'}
              </>
            ) : (
              <>
                {useAI && <span className="text-purple-200">✨</span>}
                Explore My Future
              </>
            )}
          </button>

          {/* Parsed context preview */}
          {userContext && (
            <div className="pt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Parsed from your input:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Skills</div>
                  <div className="text-white">{userContext.skills.join(', ')}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Education</div>
                  <div className="text-white">{userContext.education}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Location</div>
                  <div className="text-white">{userContext.location}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Risk Tolerance</div>
                  <div className="text-white capitalize">{userContext.riskTolerance}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Net Worth</div>
                  <div className={userContext.currentSavings - userContext.currentDebt >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {formatUSD(userContext.currentSavings - userContext.currentDebt)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-500">Goals</div>
                  <div className="text-white">{userContext.goals.join(', ')}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PATH SUMMARY PANEL
// ============================================================================

function PathSummaryPanel() {
  const { tree, getPathToFocus, getFocusedNode, isGenerating } = useDecisionTreeStore();
  const path = getPathToFocus();
  const focusedNode = getFocusedNode();

  if (!tree || !focusedNode) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-xl border border-gray-800 p-4">
        <div className="text-gray-500 text-sm text-center">
          Enter your situation and generate paths to see a summary
        </div>
      </div>
    );
  }

  const startNetWorth = path[0]?.outcome.netWorth || 0;
  const currentNetWorth = focusedNode.outcome.netWorth;
  const netWorthChange = currentNetWorth - startNetWorth;

  return (
    <div className="bg-gray-900/80 backdrop-blur rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">Path Summary</h3>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Loading overlay */}
        {isGenerating && (
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating new paths...
          </div>
        )}

        {/* Current position */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Current Position</div>
          <div className="text-lg font-semibold text-white">{focusedNode.outcome.jobTitle}</div>
          {focusedNode.outcome.company && (
            <div className="text-sm text-gray-400">{focusedNode.outcome.company}</div>
          )}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Net Worth</div>
            <div className={`text-lg font-bold ${currentNetWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatUSD(currentNetWorth)}
            </div>
            <div className={`text-xs ${netWorthChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netWorthChange >= 0 ? '+' : ''}{formatUSD(netWorthChange)} from start
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-500">Annual Income</div>
            <div className="text-lg font-bold text-white">
              {formatUSD(focusedNode.outcome.salary)}
            </div>
          </div>
        </div>

        {/* Path probability */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Path Probability</div>
            <div className="text-sm font-medium text-white">
              {Math.round(focusedNode.pathProbability * 100)}%
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              style={{ width: `${focusedNode.pathProbability * 100}%` }}
            />
          </div>
        </div>

        {/* Journey so far */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Journey ({path.length} steps)</div>
          <div className="space-y-1">
            {path.map((node, i) => (
              <div key={node.id} className="flex items-center gap-2 text-xs">
                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                  {i + 1}
                </div>
                <span className="text-gray-400">Year {node.year}:</span>
                <span className="text-white">{node.outcome.jobTitle}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Available paths */}
        <div className="pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-1">
            {focusedNode.decisions.length} possible paths from here
          </div>
          <div className="flex flex-wrap gap-1">
            {focusedNode.decisions.slice(0, 3).map((d) => (
              <span key={d.id} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                {d.label}
              </span>
            ))}
            {focusedNode.decisions.length > 3 && (
              <span className="text-xs text-gray-500">+{focusedNode.decisions.length - 3} more</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ExplorePage() {
  const { tree, selectDecision, focusNode, resetTree, isGenerating, useAI } = useDecisionTreeStore();
  const [showInitialLoading, setShowInitialLoading] = useState(false);

  // Track if this is the initial generation (no tree yet)
  useEffect(() => {
    if (isGenerating && !tree && useAI) {
      setShowInitialLoading(true);
    } else if (!isGenerating) {
      // Delay hiding to let animation complete
      const timeout = setTimeout(() => setShowInitialLoading(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [isGenerating, tree, useAI]);

  const handleSelectDecision = async (nodeId: string, decisionId: string) => {
    await selectDecision(nodeId, decisionId);
  };

  return (
    <main className="relative w-screen h-screen bg-gray-950 overflow-hidden flex flex-col">
      {/* Full-screen AI thinking overlay for initial generation */}
      {showInitialLoading && useAI && <AIThinkingOverlay isInitial={true} />}

      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Lifestream
              </h1>
              {useAI && (
                <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded-full">
                  AI-Powered
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Explore your possible futures</p>
          </div>
          {tree && (
            <button
              onClick={resetTree}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Input */}
        <div className="w-80 flex-shrink-0 p-4 space-y-4 overflow-y-auto border-r border-gray-800">
          <ContextInputPanel />
          <PathSummaryPanel />
        </div>

        {/* Center - Tree visualization */}
        <div className="flex-1 overflow-hidden relative">
          {/* Loading overlay for subsequent generations */}
          {isGenerating && tree && useAI && (
            <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <AIThinkingOverlay isInitial={false} />
            </div>
          )}

          {tree ? (
            <DecisionTreeVisualization
              tree={tree}
              onSelectDecision={handleSelectDecision}
              onFocusNode={focusNode}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-8">
                <div className="text-6xl mb-4">🌳</div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Explore Your Decision Tree
                </h2>
                <p className="text-gray-400 mb-6">
                  Enter your current situation on the left. {useAI ? 'Claude AI will generate' : 'We\'ll generate'} personalized paths 
                  and outcomes based on your skills, goals, and constraints. Each decision 
                  branches into new possibilities.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Specific job titles, companies, and salaries</p>
                  <p>• Concrete outcomes with probabilities</p>
                  <p>• Explore one branch at a time</p>
                  <p>• See tradeoffs for each decision</p>
                  {useAI && <p className="text-purple-400">• Powered by Claude AI via AWS Bedrock</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
