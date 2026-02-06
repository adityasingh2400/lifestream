/**
 * Archetype - A modifier matrix that applies gravitational pull
 * toward specific life outcomes.
 * 
 * Archetypes stack multiplicatively and can be combined.
 */

import { StateVector, StateVectorData, StateDimension, STATE_DIMENSIONS } from './StateVector';

export interface ArchetypeModifiers {
  // Multipliers affect the variance/spread of outcomes
  multipliers: Partial<Record<StateDimension, number>>;
  // Deltas are per-tick changes (positive or negative drift)
  deltas: Partial<Record<StateDimension, number>>;
  // Variance affects the stochastic spread
  variance: Partial<Record<StateDimension, number>>;
}

export interface Archetype extends ArchetypeModifiers {
  id: string;
  name: string;
  description: string;
  color: string;  // For UI visualization
}

/**
 * Apply a single archetype to a state vector for one time tick
 */
export function applyArchetype(
  state: StateVector,
  archetype: Archetype,
  randomFactor: number = Math.random()
): StateVector {
  const newData: Partial<StateVectorData> = {};

  for (const dim of STATE_DIMENSIONS) {
    const currentValue = state[dim];
    const delta = archetype.deltas[dim] ?? 0;
    const variance = archetype.variance[dim] ?? 1;
    
    // Apply deterministic delta + stochastic variance
    const stochasticShift = (randomFactor - 0.5) * 2 * variance * 0.1;
    newData[dim] = currentValue + delta + stochasticShift;
  }

  return new StateVector(newData);
}

/**
 * Apply multiple stacked archetypes to a state vector
 */
export function applyStackedArchetypes(
  state: StateVector,
  archetypes: Archetype[],
  randomFactors?: number[]
): StateVector {
  let currentState = state.clone();

  for (let i = 0; i < archetypes.length; i++) {
    const randomFactor = randomFactors?.[i] ?? Math.random();
    currentState = applyArchetype(currentState, archetypes[i], randomFactor);
  }

  return currentState;
}

/**
 * Calculate combined variance multiplier for a dimension
 */
export function getCombinedVariance(
  archetypes: Archetype[],
  dimension: StateDimension
): number {
  return archetypes.reduce((acc, arch) => {
    return acc * (arch.variance[dimension] ?? 1);
  }, 1);
}

/**
 * Calculate combined delta for a dimension
 */
export function getCombinedDelta(
  archetypes: Archetype[],
  dimension: StateDimension
): number {
  return archetypes.reduce((acc, arch) => {
    return acc + (arch.deltas[dimension] ?? 0);
  }, 0);
}

/**
 * Built-in archetype definitions
 */
export const ARCHETYPES: Record<string, Archetype> = {
  founder: {
    id: 'founder',
    name: 'Founder',
    description: 'High risk, high reward. Equity potential explodes but resilience drains.',
    color: '#f59e0b', // Amber
    multipliers: {
      We: 10,  // 10x equity variance
      Wl: 0.5, // Lower liquid wealth stability
    },
    deltas: {
      We: 0.02,   // Equity grows over time
      R: -0.02,   // Resilience drains
      S: 0.01,    // Network grows
      I: 0.005,   // Skills improve
    },
    variance: {
      We: 2.0,  // High equity variance
      Wl: 1.5,  // Moderate wealth variance
      R: 0.8,   // Lower resilience variance
    },
  },

  csStudent: {
    id: 'csStudent',
    name: 'CS Student',
    description: 'Steady skill growth with moderate stability.',
    color: '#3b82f6', // Blue
    multipliers: {
      I: 1.5,
      We: 1.2,
    },
    deltas: {
      I: 0.015,   // Intelligence grows
      R: 0.01,    // Resilience recovers
      Wl: -0.005, // Slight wealth drain (tuition)
      S: 0.005,   // Network grows slowly
    },
    variance: {
      I: 0.5,   // Low intelligence variance
      We: 0.8,  // Low equity variance
      R: 0.6,   // Low resilience variance
    },
  },

  fitnessEnthusiast: {
    id: 'fitnessEnthusiast',
    name: 'Fitness Enthusiast',
    description: 'Boosts vitality and resilience with consistent effort.',
    color: '#10b981', // Emerald
    multipliers: {
      V: 1.3,
      R: 1.2,
    },
    deltas: {
      V: 0.02,    // Vitality improves
      R: 0.015,   // Resilience improves
      S: 0.005,   // Social gains
    },
    variance: {
      V: 0.4,   // Low vitality variance (consistent)
      R: 0.5,   // Low resilience variance
    },
  },

  networker: {
    id: 'networker',
    name: 'Networker',
    description: 'Focuses on building social capital and status.',
    color: '#8b5cf6', // Violet
    multipliers: {
      S: 2.0,
    },
    deltas: {
      S: 0.025,   // Status grows fast
      R: -0.005,  // Slight resilience drain
      Wl: -0.005, // Networking costs money
    },
    variance: {
      S: 1.5,   // High status variance
    },
  },

  grinder: {
    id: 'grinder',
    name: 'Grinder',
    description: 'Maximum effort, trades health for wealth and skills.',
    color: '#ef4444', // Red
    multipliers: {
      Wl: 1.5,
      I: 1.3,
    },
    deltas: {
      Wl: 0.02,   // Wealth grows
      I: 0.01,    // Skills improve
      V: -0.015,  // Health declines
      R: -0.025,  // Burnout risk
    },
    variance: {
      Wl: 1.2,
      R: 1.5,   // High resilience variance
    },
  },
};

/**
 * Get all available archetypes as an array
 */
export function getAllArchetypes(): Archetype[] {
  return Object.values(ARCHETYPES);
}

/**
 * Get archetype by ID
 */
export function getArchetypeById(id: string): Archetype | undefined {
  return ARCHETYPES[id];
}
