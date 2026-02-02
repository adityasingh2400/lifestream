import { create } from 'zustand';
import {
  DecisionTree,
  DecisionNode,
  UserContext,
  PathOutcome,
  DecisionOption,
  parseUserContext,
  formatUSD,
} from '@/engine';

// ============================================================================
// API TYPES
// ============================================================================

interface APIDecisionPath {
  id: string;
  label: string;
  description: string;
  probability: number;
  requirements?: string[];
  tradeoffs: string[];
  outcome: PathOutcome;
}

interface GeneratePathsResponse {
  paths: APIDecisionPath[];
  error?: string;
}

// ============================================================================
// STORE TYPES
// ============================================================================

interface DecisionTreeState {
  // User input
  userSituation: string;
  userAge: number;
  userContext: UserContext | null;
  
  // Tree state
  tree: DecisionTree | null;
  isGenerating: boolean;
  generationError: string | null;
  useAI: boolean;  // Toggle between AI and template-based
  
  // Actions
  setUserSituation: (situation: string) => void;
  setUserAge: (age: number) => void;
  setUseAI: (useAI: boolean) => void;
  generateTree: () => Promise<void>;
  selectDecision: (nodeId: string, decisionId: string) => Promise<void>;
  focusNode: (nodeId: string) => void;
  resetTree: () => void;
  
  // Getters
  getFocusedNode: () => DecisionNode | null;
  getPathToFocus: () => DecisionNode[];
}

// ============================================================================
// HELPERS
// ============================================================================

let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

async function fetchAIPaths(
  userContext: UserContext,
  currentOutcome?: PathOutcome,
  depth: number = 0
): Promise<APIDecisionPath[]> {
  const response = await fetch('/api/generate-paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userContext: {
        age: userContext.age,
        situation: userContext.currentSituation,
        currentIncome: userContext.currentIncome,
        currentSavings: userContext.currentSavings,
        currentDebt: userContext.currentDebt,
        skills: userContext.skills,
        education: userContext.education,
        location: userContext.location,
        goals: userContext.goals,
        riskTolerance: userContext.riskTolerance,
      },
      currentOutcome: currentOutcome ? {
        jobTitle: currentOutcome.jobTitle,
        company: currentOutcome.company,
        salary: currentOutcome.salary,
        netWorth: currentOutcome.netWorth,
        narrative: currentOutcome.narrative,
      } : undefined,
      depth,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate paths');
  }

  const data: GeneratePathsResponse = await response.json();
  return data.paths;
}

function createInitialOutcome(context: UserContext): PathOutcome {
  const netWorth = context.currentSavings - context.currentDebt;
  
  return {
    jobTitle: context.currentSituation.toLowerCase().includes('student') ? 'Student' : 'Professional',
    salary: context.currentIncome,
    location: context.location,
    lifestyle: 'Your current situation',
    netWorth,
    monthlyBurn: context.currentIncome > 0 ? context.currentIncome / 12 * 0.7 : 3000,
    savingsRate: context.currentIncome > 0 ? 0.2 : 0,
    workLifeBalance: 'average',
    careerGrowth: 'moderate',
    fulfillment: 'medium',
    stress: 'medium',
    narrative: `You're ${context.age} years old. ${context.currentSituation}. Net worth: ${formatUSD(netWorth)}.`,
    keyEvents: ['Starting point'],
  };
}

// ============================================================================
// STORE
// ============================================================================

export const useDecisionTreeStore = create<DecisionTreeState>((set, get) => ({
  // Initial state
  userSituation: '',
  userAge: 22,
  userContext: null,
  tree: null,
  isGenerating: false,
  generationError: null,
  useAI: true,  // Default to AI mode

  setUserSituation: (situation) => set({ userSituation: situation }),
  
  setUserAge: (age) => set({ userAge: age }),
  
  setUseAI: (useAI) => set({ useAI }),

  generateTree: async () => {
    const { userSituation, userAge, useAI } = get();
    if (!userSituation.trim()) return;

    set({ isGenerating: true, generationError: null });

    try {
      // Parse user context from free text
      const context = parseUserContext(userSituation, userAge);
      const initialOutcome = createInitialOutcome(context);
      
      let decisions: DecisionOption[];
      
      if (useAI) {
        // Fetch AI-generated paths
        const aiPaths = await fetchAIPaths(context, undefined, 0);
        decisions = aiPaths.map(p => ({
          id: p.id,
          label: p.label,
          description: p.description,
          probability: p.probability,
          requirements: p.requirements,
          tradeoffs: p.tradeoffs,
          // Store the full outcome for later use
          _outcome: p.outcome,
        })) as DecisionOption[];
      } else {
        // Use template-based fallback (import from DecisionTree.ts if needed)
        decisions = [
          {
            id: 'fallback-1',
            label: 'Continue current path',
            description: 'Stay the course and see where it leads.',
            probability: 0.9,
            tradeoffs: ['May miss opportunities'],
          },
        ];
      }

      // Create root node
      const rootNode: DecisionNode = {
        id: generateNodeId(),
        year: new Date().getFullYear(),
        age: context.age,
        situation: context.currentSituation,
        outcome: initialOutcome,
        decisions,
        parentId: null,
        childIds: [],
        depth: 0,
        isExpanded: false,
        isTerminal: false,
        pathProbability: 1,
      };

      const nodes = new Map<string, DecisionNode>();
      nodes.set(rootNode.id, rootNode);

      const tree: DecisionTree = {
        rootId: rootNode.id,
        nodes,
        userContext: context,
        currentFocusId: rootNode.id,
        exploredPaths: new Set(),
      };

      set({
        userContext: context,
        tree,
        isGenerating: false,
      });
    } catch (error) {
      console.error('Failed to generate tree:', error);
      set({
        isGenerating: false,
        generationError: error instanceof Error ? error.message : 'Failed to generate paths',
      });
    }
  },

  selectDecision: async (nodeId, decisionId) => {
    const { tree, userContext, useAI } = get();
    if (!tree || !userContext) return;

    const parentNode = tree.nodes.get(nodeId);
    if (!parentNode) return;

    // Check if already expanded
    const existingChild = parentNode.childIds
      .map(id => tree.nodes.get(id))
      .find(n => n?.situation.includes(decisionId));
    
    if (existingChild) {
      set({ tree: { ...tree, currentFocusId: existingChild.id } });
      return;
    }

    // Find the selected decision
    const decision = parentNode.decisions.find(d => d.id === decisionId);
    if (!decision) return;

    set({ isGenerating: true, generationError: null });

    try {
      // Get the outcome for this decision
      // @ts-expect-error - _outcome is added dynamically
      let outcome: PathOutcome = (decision as { _outcome?: PathOutcome })._outcome;
      
      if (!outcome) {
        // If no pre-computed outcome, generate one
        outcome = {
          ...parentNode.outcome,
          jobTitle: decision.label,
          narrative: decision.description,
          keyEvents: [`Chose: ${decision.label}`],
        };
      }

      // Generate new decisions for this node
      let newDecisions: DecisionOption[];
      
      if (useAI && parentNode.depth < 10) {
        const aiPaths = await fetchAIPaths(userContext, outcome, parentNode.depth + 1);
        newDecisions = aiPaths.map(p => ({
          id: p.id,
          label: p.label,
          description: p.description,
          probability: p.probability,
          requirements: p.requirements,
          tradeoffs: p.tradeoffs,
          _outcome: p.outcome,
        })) as DecisionOption[];
      } else {
        newDecisions = [];
      }

      // Create new node
      const newNode: DecisionNode = {
        id: generateNodeId(),
        year: parentNode.year + 1,
        age: parentNode.age + 1,
        situation: `After: ${decision.label}`,
        outcome,
        decisions: newDecisions,
        parentId: parentNode.id,
        childIds: [],
        depth: parentNode.depth + 1,
        isExpanded: false,
        isTerminal: parentNode.depth >= 10 || newDecisions.length === 0,
        pathProbability: parentNode.pathProbability * decision.probability,
      };

      // Update tree
      const newNodes = new Map(tree.nodes);
      newNodes.set(newNode.id, newNode);
      newNodes.set(parentNode.id, {
        ...parentNode,
        childIds: [...parentNode.childIds, newNode.id],
        isExpanded: true,
      });

      set({
        tree: {
          ...tree,
          nodes: newNodes,
          currentFocusId: newNode.id,
          exploredPaths: new Set([...Array.from(tree.exploredPaths), newNode.id]),
        },
        isGenerating: false,
      });
    } catch (error) {
      console.error('Failed to expand node:', error);
      set({
        isGenerating: false,
        generationError: error instanceof Error ? error.message : 'Failed to generate paths',
      });
    }
  },

  focusNode: (nodeId) => {
    const { tree } = get();
    if (!tree || !tree.nodes.has(nodeId)) return;
    set({ tree: { ...tree, currentFocusId: nodeId } });
  },

  resetTree: () => {
    set({
      tree: null,
      userContext: null,
      userSituation: '',
      generationError: null,
    });
  },

  getFocusedNode: () => {
    const { tree } = get();
    if (!tree) return null;
    return tree.nodes.get(tree.currentFocusId) || null;
  },

  getPathToFocus: () => {
    const { tree } = get();
    if (!tree) return [];

    const path: DecisionNode[] = [];
    let currentId: string | null = tree.currentFocusId;

    while (currentId) {
      const node = tree.nodes.get(currentId);
      if (node) {
        path.unshift(node);
        currentId = node.parentId;
      } else {
        break;
      }
    }

    return path;
  },
}));
