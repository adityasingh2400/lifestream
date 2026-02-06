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
  
  // Knowledge context from personal data
  knowledgeContext: SimulationKnowledgeContext | null;
  
  // Tree state
  tree: DecisionTree | null;
  isGenerating: boolean;
  generationError: string | null;
  useAI: boolean;  // Toggle between AI and template-based
  inactiveNodeIds: Set<string>;  // Nodes that are greyed out (from switched paths)
  newNodeId: string | null;  // Track newly created node for animation
  
  // Actions
  setUserSituation: (situation: string) => void;
  setUserAge: (age: number) => void;
  setUseAI: (useAI: boolean) => void;
  setKnowledgeContext: (context: SimulationKnowledgeContext | null) => void;
  generateTree: () => Promise<void>;
  selectDecision: (nodeId: string, decisionId: string) => Promise<void>;
  switchPath: (nodeId: string, newDecisionId: string) => Promise<void>;
  focusNode: (nodeId: string) => void;
  resetTree: () => void;
  clearNewNodeFlag: () => void;
  
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

// Infer a smart job title based on user context keywords
function inferJobTitle(context: UserContext): string {
  const situation = context.currentSituation.toLowerCase();
  const education = context.education.toLowerCase();
  
  // Check for student status first
  if (situation.includes('student')) {
    if (education.includes('cs') || education.includes('computer science')) return 'CS Student';
    if (education.includes('engineering')) return 'Engineering Student';
    if (education.includes('business') || education.includes('mba')) return 'Business Student';
    if (education.includes('design')) return 'Design Student';
    if (education.includes('data') || education.includes('statistics')) return 'Data Science Student';
    if (education.includes('phd') || education.includes('doctorate')) return 'PhD Candidate';
    if (education.includes('masters') || education.includes('graduate')) return 'Graduate Student';
    return 'College Student';
  }
  
  // Check for founder/entrepreneur
  if (situation.includes('founder') || situation.includes('co-founder')) return 'Startup Founder';
  if (situation.includes('startup') && situation.includes('my')) return 'Startup Founder';
  if (situation.includes('entrepreneur') || situation.includes('building')) return 'Entrepreneur';
  
  // Check for specific roles
  if (situation.includes('software engineer') || situation.includes('swe')) return 'Software Engineer';
  if (situation.includes('engineer') && !situation.includes('student')) return 'Engineer';
  if (situation.includes('developer') || situation.includes('dev')) return 'Software Developer';
  if (situation.includes('product manager') || situation.includes(' pm ')) return 'Product Manager';
  if (situation.includes('designer')) return 'Designer';
  if (situation.includes('data scientist')) return 'Data Scientist';
  if (situation.includes('analyst')) return 'Analyst';
  if (situation.includes('consultant')) return 'Consultant';
  if (situation.includes('manager')) return 'Manager';
  if (situation.includes('intern')) return 'Intern';
  if (situation.includes('freelance') || situation.includes('contractor')) return 'Freelancer';
  if (situation.includes('unemployed') || situation.includes('job hunting')) return 'Job Seeker';
  if (situation.includes('dropped out') || situation.includes('gap year')) return 'Career Explorer';
  
  // Check skills for hints
  const skills = context.skills.map(s => s.toLowerCase()).join(' ');
  if (skills.includes('coding') || skills.includes('programming')) return 'Developer';
  if (skills.includes('design')) return 'Designer';
  if (skills.includes('marketing')) return 'Marketer';
  if (skills.includes('sales')) return 'Sales Professional';
  
  // Default based on income
  if (context.currentIncome > 200000) return 'Senior Professional';
  if (context.currentIncome > 100000) return 'Professional';
  if (context.currentIncome > 0) return 'Working Professional';
  
  return 'Career Explorer';
}

// Knowledge context type for simulation
interface SimulationKnowledgeContext {
  profile?: {
    name: string;
    age?: number;
    currentRole?: string;
    location?: string;
  };
  topSkills?: {
    name: string;
    level: string;
    category: string;
  }[];
  activeProjects?: {
    name: string;
    status: string;
    technologies: string[];
  }[];
  currentGoals?: {
    description: string;
    type: string;
    timeframe: string;
  }[];
  recentDecisions?: {
    description: string;
    category: string;
    outcome?: string;
  }[];
  workHistory?: {
    company: string;
    role?: string;
    relationship: string;
  }[];
  network?: {
    name: string;
    relationship: string;
  }[];
  interests?: {
    topic: string;
    depth: string;
  }[];
  stats?: {
    totalSkills: number;
    totalProjects: number;
    totalGoals: number;
    totalConnections: number;
  };
}

async function fetchAIPaths(
  userContext: UserContext,
  currentOutcome?: PathOutcome,
  depth: number = 0,
  knowledgeContext?: SimulationKnowledgeContext
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
      knowledgeContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate paths');
  }

  const data: GeneratePathsResponse = await response.json();
  return data.paths;
}

// Fetch AI-generated initial narrative for the starting node
async function fetchInitialNarrative(context: UserContext): Promise<{
  narrative: string;
  keyEvents: string[];
  lifestyle: string;
}> {
  const response = await fetch('/api/generate-paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userContext: {
        age: context.age,
        situation: context.currentSituation,
        currentIncome: context.currentIncome,
        currentSavings: context.currentSavings,
        currentDebt: context.currentDebt,
        skills: context.skills,
        education: context.education,
        location: context.location,
        goals: context.goals,
        riskTolerance: context.riskTolerance,
      },
      generateInitialNarrative: true,
    }),
  });

  if (!response.ok) {
    // Return defaults if API fails
    return {
      narrative: `You're ${context.age} years old. ${context.currentSituation}`,
      keyEvents: ['Starting your journey'],
      lifestyle: 'Your current situation',
    };
  }

  const data = await response.json();
  return {
    narrative: data.initialNarrative?.narrative || `You're ${context.age} years old. ${context.currentSituation}`,
    keyEvents: data.initialNarrative?.keyEvents || ['Starting your journey'],
    lifestyle: data.initialNarrative?.lifestyle || 'Your current situation',
  };
}

function createInitialOutcome(context: UserContext, aiNarrative?: { narrative: string; keyEvents: string[]; lifestyle: string }): PathOutcome {
  const netWorth = context.currentSavings - context.currentDebt;
  const jobTitle = inferJobTitle(context);
  
  return {
    jobTitle,
    salary: context.currentIncome,
    location: context.location,
    lifestyle: aiNarrative?.lifestyle || 'Your current situation',
    netWorth,
    monthlyBurn: context.currentIncome > 0 ? context.currentIncome / 12 * 0.7 : 3000,
    savingsRate: context.currentIncome > 0 ? 0.2 : 0,
    workLifeBalance: 'average',
    careerGrowth: 'moderate',
    fulfillment: 'medium',
    stress: 'medium',
    narrative: aiNarrative?.narrative || `You're ${context.age} years old. ${context.currentSituation}. Net worth: ${formatUSD(netWorth)}.`,
    keyEvents: aiNarrative?.keyEvents || ['Starting point'],
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
  knowledgeContext: null,
  tree: null,
  isGenerating: false,
  generationError: null,
  useAI: true,  // Default to AI mode
  inactiveNodeIds: new Set<string>(),
  newNodeId: null,

  setUserSituation: (situation) => set({ userSituation: situation }),
  
  setUserAge: (age) => set({ userAge: age }),
  
  setUseAI: (useAI) => set({ useAI }),
  
  setKnowledgeContext: (context) => set({ knowledgeContext: context }),
  
  clearNewNodeFlag: () => set({ newNodeId: null }),

  generateTree: async () => {
    const { userSituation, userAge, useAI, knowledgeContext } = get();
    if (!userSituation.trim()) return;

    set({ isGenerating: true, generationError: null });

    try {
      // Parse user context from free text
      const context = parseUserContext(userSituation, userAge);
      
      // Fetch AI-generated initial narrative if using AI
      let aiNarrative: { narrative: string; keyEvents: string[]; lifestyle: string } | undefined;
      if (useAI) {
        aiNarrative = await fetchInitialNarrative(context);
      }
      
      const initialOutcome = createInitialOutcome(context, aiNarrative);
      
      let decisions: DecisionOption[];
      
      if (useAI) {
        // Fetch AI-generated paths with knowledge context
        const aiPaths = await fetchAIPaths(context, undefined, 0, knowledgeContext || undefined);
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
    const { tree, userContext, useAI, knowledgeContext } = get();
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
        const aiPaths = await fetchAIPaths(userContext, outcome, parentNode.depth + 1, knowledgeContext || undefined);
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
        isNew: true,  // Mark as new for animation
      };

      // Update tree
      const newNodes = new Map(tree.nodes);
      newNodes.set(newNode.id, newNode);
      newNodes.set(parentNode.id, {
        ...parentNode,
        childIds: [...parentNode.childIds, newNode.id],
        isExpanded: true,
        selectedDecisionId: decisionId,  // Track which decision was selected
      });

      set({
        tree: {
          ...tree,
          nodes: newNodes,
          currentFocusId: newNode.id,
          exploredPaths: new Set([...Array.from(tree.exploredPaths), newNode.id]),
        },
        isGenerating: false,
        newNodeId: newNode.id,  // Track for animation
      });
      
      // Clear the isNew flag after animation completes
      setTimeout(() => {
        const currentTree = get().tree;
        if (currentTree) {
          const node = currentTree.nodes.get(newNode.id);
          if (node) {
            const updatedNodes = new Map(currentTree.nodes);
            updatedNodes.set(newNode.id, { ...node, isNew: false });
            set({ tree: { ...currentTree, nodes: updatedNodes }, newNodeId: null });
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to expand node:', error);
      set({
        isGenerating: false,
        generationError: error instanceof Error ? error.message : 'Failed to generate paths',
      });
    }
  },

  switchPath: async (nodeId, newDecisionId) => {
    const { tree, userContext, useAI, inactiveNodeIds } = get();
    if (!tree || !userContext) return;

    const parentNode = tree.nodes.get(nodeId);
    if (!parentNode) return;

    // Find all descendants of this node and mark them as inactive
    const getDescendants = (id: string): string[] => {
      const node = tree.nodes.get(id);
      if (!node) return [];
      const descendants: string[] = [];
      for (const childId of node.childIds) {
        descendants.push(childId);
        descendants.push(...getDescendants(childId));
      }
      return descendants;
    };

    const descendantsToDeactivate = getDescendants(nodeId);
    const newInactiveNodeIds = new Set([...Array.from(inactiveNodeIds), ...descendantsToDeactivate]);

    // Update the parent node to clear its children (they're now inactive)
    const newNodes = new Map(tree.nodes);
    newNodes.set(parentNode.id, {
      ...parentNode,
      childIds: [],  // Clear children - they're now inactive
      isExpanded: false,
      selectedDecisionId: undefined,
    });

    set({
      tree: { ...tree, nodes: newNodes },
      inactiveNodeIds: newInactiveNodeIds,
    });

    // Now select the new decision
    const { selectDecision } = get();
    await selectDecision(nodeId, newDecisionId);
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
      inactiveNodeIds: new Set<string>(),
      newNodeId: null,
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
