/**
 * Monte Carlo Simulation Engine
 * 
 * Generates probability branches by running many simulations
 * with stochastic variance applied at each time step.
 * Supports time-varying archetypes via scheduling.
 * Tracks milestones and outputs real USD values.
 */

import { 
  StateVector, 
  TimestampedState, 
  VitalityBreakdown,
  getNetWorth,
  getWealthTier,
  WealthTier,
  formatUSD,
} from './StateVector';
import { Archetype, applyStackedArchetypes, ARCHETYPES } from './Archetype';

// ============================================================================
// MILESTONE SYSTEM
// ============================================================================

export type MilestoneType = 
  | 'net-worth'    // Financial milestone
  | 'life-event';  // Life event milestone

export interface Milestone {
  id: string;
  type: MilestoneType;
  year: number;
  label: string;
  icon: string;        // Icon identifier for 3D model
  description: string;
  netWorth?: number;   // For net-worth milestones
}

// Net worth milestone thresholds
export const NET_WORTH_MILESTONES = [
  { threshold: 0, label: 'Break Even', icon: 'scale', description: 'No longer in debt' },
  { threshold: 100_000, label: '$100K', icon: 'money-stack', description: 'First $100K saved' },
  { threshold: 500_000, label: '$500K', icon: 'house', description: 'House money' },
  { threshold: 1_000_000, label: '$1M', icon: 'mansion', description: 'Millionaire status' },
  { threshold: 10_000_000, label: '$10M', icon: 'yacht', description: 'Wealthy elite' },
];

// Life event definitions
export const LIFE_EVENT_MILESTONES = {
  'college-student': { label: 'College Student', icon: 'graduation-cap', description: 'Pursuing education' },
  'first-job': { label: 'First Real Job', icon: 'briefcase', description: 'Career begins' },
  'burnout': { label: 'Burnout', icon: 'storm-cloud', description: 'Mental health crisis' },
  'peak-health': { label: 'Peak Health', icon: 'running', description: 'Physical prime' },
  'homeless': { label: 'Homeless', icon: 'cardboard-box', description: 'Lost everything' },
  'recovery': { label: 'Recovery', icon: 'sunrise', description: 'Bouncing back' },
};

// ============================================================================
// PATH CATEGORIES
// ============================================================================

export type PathCategory = 
  | 'wealth-dominant'
  | 'balanced'
  | 'burnout-risk'
  | 'growth-focused'
  | 'health-first';

export const PATH_CATEGORY_INFO: Record<PathCategory, { 
  label: string; 
  color: string; 
  description: string;
}> = {
  'wealth-dominant': {
    label: 'Wealth Dominant',
    color: '#fbbf24',
    description: 'Financial success is the primary outcome',
  },
  'balanced': {
    label: 'Balanced',
    color: '#14b8a6',
    description: 'Even growth across all life dimensions',
  },
  'burnout-risk': {
    label: 'Burnout Risk',
    color: '#ef4444',
    description: 'Resilience drops below safe levels',
  },
  'growth-focused': {
    label: 'Growth Focused',
    color: '#a855f7',
    description: 'Prioritizes skills and social capital',
  },
  'health-first': {
    label: 'Health First',
    color: '#22c55e',
    description: 'Maintains high vitality throughout',
  },
};

// ============================================================================
// SIMULATION INTERFACES
// ============================================================================

export interface SimulationPath {
  id: string;
  states: TimestampedState[];
  probability: number;
  riskScore: number;
  finalMagnitude: number;
  minResilience: number;
  activeArchetypesByYear: Map<number, string[]>;
  // NEW: Milestones reached during this path
  milestones: Milestone[];
  // NEW: Net worth at each year
  netWorthByYear: Map<number, number>;
  // NEW: Wealth tier at each year
  wealthTierByYear: Map<number, WealthTier>;
}

export interface SimulationResult {
  paths: SimulationPath[];
  meanPath: TimestampedState[];
  highProbabilityPath: SimulationPath;
  bestOutcomePath: SimulationPath;
  worstOutcomePath: SimulationPath;
  mostLikelyPath: SimulationPath;
  statistics: {
    meanFinalMagnitude: number;
    stdFinalMagnitude: number;
    meanRisk: number;
    successProbability: number;
    burnoutProbability: number;
    wealthyProbability: number;
    // NEW: Net worth statistics
    meanFinalNetWorth: number;
    medianFinalNetWorth: number;
  };
  // NEW: Aggregated milestone probabilities
  milestoneProbabilities: Map<string, number>;
}

export interface ArchetypeScheduleEntry {
  id: string;
  archetypeId: string;
  startYear: number;
  endYear: number;
}

export interface ScheduledSimulationConfig {
  initialState: StateVector;
  archetypeSchedule: ArchetypeScheduleEntry[];
  startYear: number;
  endYear: number;
  numPaths: number;
  effortMultiplier: number;
  riskTolerance: number;
}

export interface SimulationConfig {
  initialState: StateVector;
  archetypes: Archetype[];
  timeHorizon: number;
  numPaths: number;
  effortMultiplier: number;
  riskTolerance: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generatePathId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateMilestoneId(): string {
  return 'ms-' + Math.random().toString(36).substring(2, 7);
}

function getArchetypesForYear(
  schedule: ArchetypeScheduleEntry[],
  year: number
): Archetype[] {
  const activeIds = schedule
    .filter(s => year >= s.startYear && year <= s.endYear)
    .map(s => s.archetypeId);
  
  return activeIds
    .map(id => ARCHETYPES[id])
    .filter((a): a is Archetype => a !== undefined);
}

/**
 * Check for net worth milestones crossed between two values
 */
function checkNetWorthMilestones(
  prevNetWorth: number,
  currentNetWorth: number,
  year: number,
  existingMilestones: Set<number>
): Milestone[] {
  const newMilestones: Milestone[] = [];
  
  for (const { threshold, label, icon, description } of NET_WORTH_MILESTONES) {
    if (prevNetWorth < threshold && currentNetWorth >= threshold && !existingMilestones.has(threshold)) {
      newMilestones.push({
        id: generateMilestoneId(),
        type: 'net-worth',
        year,
        label,
        icon,
        description,
        netWorth: threshold,
      });
      existingMilestones.add(threshold);
    }
  }
  
  return newMilestones;
}

/**
 * Check for life event milestones based on state
 */
function checkLifeEventMilestones(
  prevState: TimestampedState,
  currentState: TimestampedState,
  year: number,
  archetypes: string[],
  existingEvents: Set<string>
): Milestone[] {
  const newMilestones: Milestone[] = [];
  
  // Check for burnout (resilience drops below 0.25)
  if (prevState.R >= 0.25 && currentState.R < 0.25 && !existingEvents.has('burnout')) {
    const event = LIFE_EVENT_MILESTONES['burnout'];
    newMilestones.push({
      id: generateMilestoneId(),
      type: 'life-event',
      year,
      ...event,
    });
    existingEvents.add('burnout');
  }
  
  // Check for recovery (resilience rises above 0.6 after being low)
  if (prevState.R < 0.4 && currentState.R >= 0.6 && !existingEvents.has('recovery')) {
    const event = LIFE_EVENT_MILESTONES['recovery'];
    newMilestones.push({
      id: generateMilestoneId(),
      type: 'life-event',
      year,
      ...event,
    });
    existingEvents.add('recovery');
  }
  
  // Check for peak health (vitality above 0.85)
  if (prevState.V < 0.85 && currentState.V >= 0.85 && !existingEvents.has('peak-health')) {
    const event = LIFE_EVENT_MILESTONES['peak-health'];
    newMilestones.push({
      id: generateMilestoneId(),
      type: 'life-event',
      year,
      ...event,
    });
    existingEvents.add('peak-health');
  }
  
  // Check for homeless (very low wealth + low resilience)
  const currentNetWorth = getNetWorth(currentState.Wl, currentState.We);
  if (currentNetWorth < -50000 && currentState.R < 0.3 && !existingEvents.has('homeless')) {
    const event = LIFE_EVENT_MILESTONES['homeless'];
    newMilestones.push({
      id: generateMilestoneId(),
      type: 'life-event',
      year,
      ...event,
    });
    existingEvents.add('homeless');
  }
  
  return newMilestones;
}

// ============================================================================
// SIMULATION FUNCTIONS
// ============================================================================

function simulateScheduledPath(
  config: ScheduledSimulationConfig,
  seed?: number
): SimulationPath {
  const { initialState, archetypeSchedule, startYear, endYear, effortMultiplier } = config;
  const timeHorizon = endYear - startYear;
  
  const states: TimestampedState[] = [{
    ...initialState.toData(),
    timestamp: 0,
    vitality: initialState.vitality,
  }];

  let currentState = initialState.clone();
  let totalRisk = 0;
  let minResilience = currentState.R;
  const activeArchetypesByYear = new Map<number, string[]>();
  const milestones: Milestone[] = [];
  const netWorthByYear = new Map<number, number>();
  const wealthTierByYear = new Map<number, WealthTier>();
  
  // Track which milestones have been reached
  const reachedNetWorthMilestones = new Set<number>();
  const reachedLifeEvents = new Set<string>();

  // Initial net worth
  let prevNetWorth = currentState.getNetWorth();
  netWorthByYear.set(startYear, prevNetWorth);
  wealthTierByYear.set(startYear, getWealthTier(prevNetWorth));

  const random = seed !== undefined 
    ? (() => {
        let s = seed;
        return () => {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          return s / 0x7fffffff;
        };
      })()
    : Math.random;

  for (let t = 1; t <= timeHorizon; t++) {
    const currentYear = startYear + t;
    const prevState = states[states.length - 1];
    
    // Get archetypes active for this year
    const archetypes = getArchetypesForYear(archetypeSchedule, currentYear);
    const archetypeIds = archetypes.map(a => a.id);
    activeArchetypesByYear.set(currentYear, archetypeIds);
    
    if (archetypes.length === 0) {
      const drift = (random() - 0.5) * 0.02;
      currentState = currentState.applyDelta({
        Wl: drift, We: drift, V: drift, I: drift, S: drift, R: drift
      });
    } else {
      const randomFactors = archetypes.map(() => random());
      
      const modifiedArchetypes = archetypes.map(arch => ({
        ...arch,
        deltas: Object.fromEntries(
          Object.entries(arch.deltas).map(([k, v]) => [k, (v ?? 0) * effortMultiplier])
        ),
      })) as Archetype[];

      currentState = applyStackedArchetypes(currentState, modifiedArchetypes, randomFactors);
    }
    
    totalRisk += currentState.riskScore();
    minResilience = Math.min(minResilience, currentState.R);

    const currentTimestampedState: TimestampedState = {
      ...currentState.toData(),
      timestamp: t,
      vitality: currentState.vitality,
    };
    states.push(currentTimestampedState);
    
    // Track net worth and wealth tier
    const currentNetWorth = currentState.getNetWorth();
    netWorthByYear.set(currentYear, currentNetWorth);
    wealthTierByYear.set(currentYear, getWealthTier(currentNetWorth));
    
    // Check for milestones
    const netWorthMilestones = checkNetWorthMilestones(
      prevNetWorth, currentNetWorth, currentYear, reachedNetWorthMilestones
    );
    milestones.push(...netWorthMilestones);
    
    const lifeEventMilestones = checkLifeEventMilestones(
      prevState, currentTimestampedState, currentYear, archetypeIds, reachedLifeEvents
    );
    milestones.push(...lifeEventMilestones);
    
    prevNetWorth = currentNetWorth;
  }

  const avgRisk = totalRisk / timeHorizon;
  const finalMagnitude = currentState.magnitude();

  return {
    id: generatePathId(),
    states,
    probability: 1,
    riskScore: avgRisk,
    finalMagnitude,
    minResilience,
    activeArchetypesByYear,
    milestones,
    netWorthByYear,
    wealthTierByYear,
  };
}

export function categorizePath(path: SimulationPath): PathCategory {
  const finalState = path.states[path.states.length - 1];
  
  if (path.minResilience < 0.3) {
    return 'burnout-risk';
  }
  
  const wealthScore = (finalState.Wl + finalState.We) / 2;
  const growthScore = (finalState.I + finalState.S) / 2;
  
  const values = [finalState.Wl, finalState.We, finalState.V, finalState.I, finalState.S, finalState.R];
  const avg = values.reduce((a, b) => a + b, 0) / 6;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / 6;
  const isBalanced = variance < 0.04;
  
  if (finalState.V > 0.75 && finalState.R > 0.6) {
    return 'health-first';
  }
  
  if (isBalanced && avg > 0.5) {
    return 'balanced';
  }
  
  if (wealthScore > 0.65) {
    return 'wealth-dominant';
  }
  
  if (growthScore > 0.65) {
    return 'growth-focused';
  }
  
  return 'balanced';
}

function calculateMeanPath(paths: SimulationPath[]): TimestampedState[] {
  if (paths.length === 0) return [];
  
  const timeHorizon = paths[0].states.length;
  const meanPath: TimestampedState[] = [];

  for (let t = 0; t < timeHorizon; t++) {
    const meanState: TimestampedState = {
      Wl: 0, We: 0, V: 0, I: 0, S: 0, R: 0,
      timestamp: t,
    };

    for (const path of paths) {
      const state = path.states[t];
      meanState.Wl += state.Wl;
      meanState.We += state.We;
      meanState.V += state.V;
      meanState.I += state.I;
      meanState.S += state.S;
      meanState.R += state.R;
    }

    const n = paths.length;
    meanState.Wl /= n;
    meanState.We /= n;
    meanState.V /= n;
    meanState.I /= n;
    meanState.S /= n;
    meanState.R /= n;

    meanPath.push(meanState);
  }

  return meanPath;
}

export function runSimulationWithSchedule(config: ScheduledSimulationConfig): SimulationResult {
  const paths: SimulationPath[] = [];

  for (let i = 0; i < config.numPaths; i++) {
    const seed = i * 12345;
    const path = simulateScheduledPath(config, seed);
    paths.push(path);
  }

  // Calculate statistics
  const finalMagnitudes = paths.map(p => p.finalMagnitude);
  const meanFinalMagnitude = finalMagnitudes.reduce((a, b) => a + b, 0) / paths.length;
  const variance = finalMagnitudes.reduce((acc, m) => acc + Math.pow(m - meanFinalMagnitude, 2), 0) / paths.length;
  const stdFinalMagnitude = Math.sqrt(variance);

  const meanRisk = paths.reduce((acc, p) => acc + p.riskScore, 0) / paths.length;
  
  const successCount = paths.filter(p => p.finalMagnitude > 0.6).length;
  const successProbability = successCount / paths.length;
  
  const burnoutCount = paths.filter(p => p.minResilience < 0.3).length;
  const burnoutProbability = burnoutCount / paths.length;
  
  const wealthyCount = paths.filter(p => {
    const final = p.states[p.states.length - 1];
    return (final.Wl + final.We) / 2 > 0.6;
  }).length;
  const wealthyProbability = wealthyCount / paths.length;

  // Calculate net worth statistics
  const finalNetWorths = paths.map(p => {
    const lastYear = Math.max(...Array.from(p.netWorthByYear.keys()));
    return p.netWorthByYear.get(lastYear) || 0;
  });
  const meanFinalNetWorth = finalNetWorths.reduce((a, b) => a + b, 0) / paths.length;
  const sortedNetWorths = [...finalNetWorths].sort((a, b) => a - b);
  const medianFinalNetWorth = sortedNetWorths[Math.floor(sortedNetWorths.length / 2)];

  // Calculate milestone probabilities
  const milestoneCounts = new Map<string, number>();
  for (const path of paths) {
    const seenMilestones = new Set<string>();
    for (const milestone of path.milestones) {
      const key = milestone.type === 'net-worth' 
        ? `nw-${milestone.netWorth}` 
        : `le-${milestone.icon}`;
      if (!seenMilestones.has(key)) {
        milestoneCounts.set(key, (milestoneCounts.get(key) || 0) + 1);
        seenMilestones.add(key);
      }
    }
  }
  const milestoneProbabilities = new Map<string, number>();
  milestoneCounts.forEach((count, key) => {
    milestoneProbabilities.set(key, count / paths.length);
  });

  // Assign probabilities
  const { riskTolerance } = config;
  for (const path of paths) {
    const riskPenalty = path.riskScore * (1 - riskTolerance);
    path.probability = Math.exp(-riskPenalty * 5);
  }

  const totalProb = paths.reduce((acc, p) => acc + p.probability, 0);
  for (const path of paths) {
    path.probability /= totalProb;
  }

  // Find special paths
  const highProbabilityPath = paths.reduce((best, current) => 
    current.probability > best.probability ? current : best
  );
  
  const bestOutcomePath = paths.reduce((best, current) =>
    current.finalMagnitude > best.finalMagnitude ? current : best
  );
  
  const worstOutcomePath = paths.reduce((worst, current) =>
    current.finalMagnitude < worst.finalMagnitude ? current : worst
  );
  
  const mostLikelyPath = paths.reduce((closest, current) => {
    const currentDiff = Math.abs(current.finalMagnitude - meanFinalMagnitude);
    const closestDiff = Math.abs(closest.finalMagnitude - meanFinalMagnitude);
    return currentDiff < closestDiff ? current : closest;
  });

  const meanPath = calculateMeanPath(paths);

  return {
    paths,
    meanPath,
    highProbabilityPath,
    bestOutcomePath,
    worstOutcomePath,
    mostLikelyPath,
    statistics: {
      meanFinalMagnitude,
      stdFinalMagnitude,
      meanRisk,
      successProbability,
      burnoutProbability,
      wealthyProbability,
      meanFinalNetWorth,
      medianFinalNetWorth,
    },
    milestoneProbabilities,
  };
}

export function runSimulation(config: SimulationConfig): SimulationResult {
  const { initialState, archetypes, timeHorizon, numPaths, effortMultiplier, riskTolerance } = config;
  
  const currentYear = new Date().getFullYear();
  const schedule: ArchetypeScheduleEntry[] = archetypes.map((arch, i) => ({
    id: `legacy-${i}`,
    archetypeId: arch.id,
    startYear: currentYear,
    endYear: currentYear + timeHorizon,
  }));
  
  return runSimulationWithSchedule({
    initialState,
    archetypeSchedule: schedule,
    startYear: currentYear,
    endYear: currentYear + timeHorizon,
    numPaths,
    effortMultiplier,
    riskTolerance,
  });
}

export function sampleRepresentativePaths(
  result: SimulationResult,
  numSamples: number = 50
): SimulationPath[] {
  const { paths, highProbabilityPath, bestOutcomePath, worstOutcomePath, mostLikelyPath } = result;
  
  if (!paths || paths.length === 0) return [];
  if (paths.length <= numSamples) return paths;

  const specialPathIds = [
    highProbabilityPath?.id,
    bestOutcomePath?.id,
    worstOutcomePath?.id,
    mostLikelyPath?.id,
  ].filter((id): id is string => id !== undefined);
  
  const specialPaths = new Set(specialPathIds);

  const sorted = [...paths].sort((a, b) => a.finalMagnitude - b.finalMagnitude);
  
  const sampled: SimulationPath[] = [];
  
  for (const path of paths) {
    if (path && specialPaths.has(path.id)) {
      sampled.push(path);
    }
  }
  
  const remainingSlots = numSamples - sampled.length;
  if (remainingSlots <= 0) return sampled;
  
  const step = Math.max(1, Math.floor(sorted.length / remainingSlots));
  
  for (let i = 0; sampled.length < numSamples && i < sorted.length; i += step) {
    const path = sorted[i];
    if (path && !specialPaths.has(path.id)) {
      sampled.push(path);
    }
  }

  return sampled;
}
