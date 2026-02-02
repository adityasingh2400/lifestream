// StateVector exports
export { 
  StateVector, 
  PRESET_STATES, 
  STATE_DIMENSIONS,
  // Wealth conversion utilities
  normalizedToLiquidUSD,
  liquidUSDToNormalized,
  normalizedToEquityUSD,
  equityUSDToNormalized,
  formatUSD,
  getNetWorth,
  getWealthTier,
  getWealthTierInfo,
  WEALTH_CONFIG,
  WEALTH_TIERS,
  // Vitality adjective functions
  getBodyAdjective,
  getMindAdjective,
  getAppearanceAdjective,
  getIntelligenceAdjective,
  getStatusAdjective,
  getResilienceAdjective,
  // Adjective arrays for UI
  BODY_ADJECTIVES,
  MIND_ADJECTIVES,
  APPEARANCE_ADJECTIVES,
  INTELLIGENCE_ADJECTIVES,
  STATUS_ADJECTIVES,
  RESILIENCE_ADJECTIVES,
} from './StateVector';

export type { 
  StateVectorData, 
  TimestampedState, 
  StateDimension,
  VitalityBreakdown,
  ExtendedStateData,
  RealUnitsState,
  WealthTier,
  BodyAdjective,
  MindAdjective,
  AppearanceAdjective,
  IntelligenceAdjective,
  StatusAdjective,
  ResilienceAdjective,
} from './StateVector';

// Decision Tree exports
export {
  createDecisionTree,
  createInitialNode,
  expandNode,
  addNodeToTree,
  parseUserContext,
} from './DecisionTree';

export type {
  UserContext,
  DecisionOption,
  PathOutcome,
  DecisionNode,
  DecisionTree,
} from './DecisionTree';

// Archetype exports
export { 
  ARCHETYPES, 
  getAllArchetypes, 
  getArchetypeById, 
  applyArchetype, 
  applyStackedArchetypes 
} from './Archetype';
export type { Archetype, ArchetypeModifiers } from './Archetype';

// Monte Carlo exports
export { 
  runSimulation, 
  runSimulationWithSchedule,
  sampleRepresentativePaths,
  categorizePath,
  PATH_CATEGORY_INFO,
  NET_WORTH_MILESTONES,
  LIFE_EVENT_MILESTONES,
} from './MonteCarlo';

export type { 
  SimulationPath, 
  SimulationResult, 
  SimulationConfig,
  ScheduledSimulationConfig,
  ArchetypeScheduleEntry,
  PathCategory,
  Milestone,
  MilestoneType,
} from './MonteCarlo';
