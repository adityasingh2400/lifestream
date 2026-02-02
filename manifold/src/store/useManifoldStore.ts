import { create } from 'zustand';
import { 
  StateVector, 
  PRESET_STATES, 
  Archetype, 
  ARCHETYPES,
  SimulationResult,
  runSimulationWithSchedule,
  sampleRepresentativePaths,
  SimulationPath,
  categorizePath,
  PathCategory,
} from '@/engine';

/**
 * Archetype schedule - defines when an archetype is active
 */
export interface ArchetypeSchedule {
  id: string;           // Unique ID for this schedule entry
  archetypeId: string;  // Reference to archetype
  startYear: number;    // e.g., 2026
  endYear: number;      // e.g., 2028
}

/**
 * Categorized path with additional metadata
 */
export interface CategorizedPath extends SimulationPath {
  category: PathCategory;
  isGoldenPath: boolean;
  isTopPath: boolean;
  yearlyStates: Map<number, number>; // year -> state index mapping
}

interface ManifoldState {
  // User profile
  userAge: number;
  currentYear: number;
  goalYear: number;
  userName: string;
  
  // Initial state
  currentState: StateVector;
  setCurrentState: (state: StateVector) => void;
  
  // Archetype scheduling (replaces simple activeArchetypes)
  archetypeSchedule: ArchetypeSchedule[];
  addArchetypeSchedule: (schedule: Omit<ArchetypeSchedule, 'id'>) => void;
  removeArchetypeSchedule: (id: string) => void;
  updateArchetypeSchedule: (id: string, updates: Partial<ArchetypeSchedule>) => void;
  
  // Legacy support - get active archetypes for a given year
  getArchetypesForYear: (year: number) => Archetype[];
  
  // Simulation parameters
  effortMultiplier: number;
  setEffortMultiplier: (effort: number) => void;
  
  riskTolerance: number;
  setRiskTolerance: (risk: number) => void;
  
  // Simulation results
  simulationResult: SimulationResult | null;
  displayPaths: CategorizedPath[];
  goldenPath: CategorizedPath | null;
  topPaths: CategorizedPath[];
  isSimulating: boolean;
  
  // Actions
  runSimulation: () => void;
  
  // Timeline navigation
  viewYear: number;
  setViewYear: (year: number) => void;
  
  // Path selection/hover
  hoveredPathId: string | null;
  setHoveredPathId: (id: string | null) => void;
  selectedPathId: string | null;
  setSelectedPathId: (id: string | null) => void;
  
  // Get path by ID
  getPathById: (id: string) => CategorizedPath | null;
  
  // Outcome statistics
  outcomeStats: {
    wealthyOutcome: number;      // % paths with high Wl+We
    balancedOutcome: number;     // % paths with balanced dimensions
    burnoutRisk: number;         // % paths where R < 0.3
    highVitality: number;        // % paths with V > 0.7
  };
  
  // User profile actions
  setUserAge: (age: number) => void;
  setGoalYear: (year: number) => void;
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Calculate years from age
const currentRealYear = new Date().getFullYear();

export const useManifoldStore = create<ManifoldState>((set, get) => ({
  // User profile - default to 19-year-old
  userAge: 19,
  currentYear: currentRealYear,
  goalYear: currentRealYear + 10, // 10 years into future
  userName: 'You',
  
  // Initial state - Founder preset
  currentState: PRESET_STATES.founder,
  setCurrentState: (state) => {
    set({ currentState: state });
    get().runSimulation();
  },
  
  // Default archetype schedule
  archetypeSchedule: [
    {
      id: generateId(),
      archetypeId: 'founder',
      startYear: currentRealYear,
      endYear: currentRealYear + 10,
    },
    {
      id: generateId(),
      archetypeId: 'csStudent',
      startYear: currentRealYear,
      endYear: currentRealYear + 2, // Graduate in 2 years
    },
  ],
  
  addArchetypeSchedule: (schedule) => {
    const newSchedule: ArchetypeSchedule = {
      ...schedule,
      id: generateId(),
    };
    set(state => ({
      archetypeSchedule: [...state.archetypeSchedule, newSchedule],
    }));
    get().runSimulation();
  },
  
  removeArchetypeSchedule: (id) => {
    set(state => ({
      archetypeSchedule: state.archetypeSchedule.filter(s => s.id !== id),
    }));
    get().runSimulation();
  },
  
  updateArchetypeSchedule: (id, updates) => {
    set(state => ({
      archetypeSchedule: state.archetypeSchedule.map(s =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
    get().runSimulation();
  },
  
  getArchetypesForYear: (year) => {
    const { archetypeSchedule } = get();
    const activeIds = archetypeSchedule
      .filter(s => year >= s.startYear && year <= s.endYear)
      .map(s => s.archetypeId);
    return activeIds.map(id => ARCHETYPES[id]).filter(Boolean);
  },
  
  // Simulation parameters
  effortMultiplier: 0.7,
  setEffortMultiplier: (effort) => {
    set({ effortMultiplier: effort });
    get().runSimulation();
  },
  
  riskTolerance: 0.5,
  setRiskTolerance: (risk) => {
    set({ riskTolerance: risk });
    get().runSimulation();
  },
  
  // Simulation results
  simulationResult: null,
  displayPaths: [],
  goldenPath: null,
  topPaths: [],
  isSimulating: false,
  
  outcomeStats: {
    wealthyOutcome: 0,
    balancedOutcome: 0,
    burnoutRisk: 0,
    highVitality: 0,
  },
  
  runSimulation: () => {
    const { 
      currentState, 
      archetypeSchedule, 
      currentYear, 
      goalYear,
      effortMultiplier, 
      riskTolerance 
    } = get();
    
    if (archetypeSchedule.length === 0) {
      set({ 
        simulationResult: null, 
        displayPaths: [], 
        goldenPath: null,
        topPaths: [],
      });
      return;
    }
    
    set({ isSimulating: true });
    
    // Calculate time horizon in years
    const timeHorizon = goalYear - currentYear;
    
    // Run simulation with scheduled archetypes
    const result = runSimulationWithSchedule({
      initialState: currentState,
      archetypeSchedule,
      startYear: currentYear,
      endYear: goalYear,
      numPaths: 200,
      effortMultiplier,
      riskTolerance,
    });
    
    // Sample and categorize paths
    const sampledPaths = sampleRepresentativePaths(result, 50);
    
    // Categorize each path
    const categorizedPaths: CategorizedPath[] = sampledPaths.map((path, index) => {
      const category = categorizePath(path);
      const yearlyStates = new Map<number, number>();
      
      // Map timestamps to years
      path.states.forEach((state, stateIndex) => {
        const year = currentYear + state.timestamp;
        yearlyStates.set(year, stateIndex);
      });
      
      return {
        ...path,
        category,
        isGoldenPath: path.id === result.highProbabilityPath.id,
        isTopPath: index < 10,
        yearlyStates,
      };
    });
    
    // Find golden path
    const goldenPath = categorizedPaths.find(p => p.isGoldenPath) || null;
    
    // Get top 10 paths
    const topPaths = categorizedPaths.filter(p => p.isTopPath);
    
    // Calculate outcome statistics
    const totalPaths = result.paths.length;
    const outcomeStats = {
      wealthyOutcome: result.paths.filter(p => {
        const final = p.states[p.states.length - 1];
        return (final.Wl + final.We) / 2 > 0.6;
      }).length / totalPaths,
      balancedOutcome: result.paths.filter(p => {
        const final = p.states[p.states.length - 1];
        const values = [final.Wl, final.We, final.V, final.I, final.S, final.R];
        const avg = values.reduce((a, b) => a + b, 0) / 6;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / 6;
        return variance < 0.05; // Low variance = balanced
      }).length / totalPaths,
      burnoutRisk: result.paths.filter(p => {
        return p.states.some(s => s.R < 0.3);
      }).length / totalPaths,
      highVitality: result.paths.filter(p => {
        const final = p.states[p.states.length - 1];
        return final.V > 0.7;
      }).length / totalPaths,
    };
    
    set({ 
      simulationResult: result, 
      displayPaths: categorizedPaths,
      goldenPath,
      topPaths,
      isSimulating: false,
      outcomeStats,
    });
  },
  
  // Timeline navigation
  viewYear: currentRealYear,
  setViewYear: (year) => set({ viewYear: year }),
  
  // Path selection
  hoveredPathId: null,
  setHoveredPathId: (id) => set({ hoveredPathId: id }),
  selectedPathId: null,
  setSelectedPathId: (id) => set({ selectedPathId: id }),
  
  getPathById: (id) => {
    const { displayPaths } = get();
    return displayPaths.find(p => p.id === id) || null;
  },
  
  // User profile actions
  setUserAge: (age) => {
    set({ userAge: age });
    get().runSimulation();
  },
  setGoalYear: (year) => {
    set({ goalYear: year });
    get().runSimulation();
  },
}));
