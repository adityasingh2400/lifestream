/**
 * Decision Tree Engine
 * 
 * Generates explorable branching paths based on user context.
 * Each node represents a decision point with concrete outcomes.
 * Users can explore one branch at a time, drilling down into possibilities.
 */

import { StateVector, formatUSD, getNetWorth } from './StateVector';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface UserContext {
  // Parsed from free-text input
  age: number;
  currentSituation: string;           // e.g., "CS student at Stanford"
  currentIncome: number;              // Annual USD
  currentSavings: number;             // USD
  currentDebt: number;                // USD (student loans, etc.)
  skills: string[];                   // e.g., ["programming", "machine learning"]
  education: string;                  // e.g., "BS Computer Science (in progress)"
  location: string;                   // e.g., "San Francisco Bay Area"
  goals: string[];                    // e.g., ["start a company", "financial freedom"]
  constraints: string[];              // e.g., ["visa restrictions", "family obligations"]
  health: 'poor' | 'average' | 'good' | 'excellent';
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface DecisionOption {
  id: string;
  label: string;                      // e.g., "Take the FAANG offer"
  description: string;                // Detailed description
  probability: number;                // 0-1, likelihood this path is available/successful
  requirements?: string[];            // What's needed to take this path
  tradeoffs: string[];                // What you give up
}

export interface PathOutcome {
  // Concrete, specific outcomes
  jobTitle?: string;                  // e.g., "Senior Software Engineer"
  company?: string;                   // e.g., "Google"
  companyType?: string;               // e.g., "FAANG", "Startup", "Finance"
  salary: number;                     // Annual USD
  equity?: number;                    // USD value or potential
  location?: string;
  lifestyle: string;                  // e.g., "High stress, long hours, good pay"
  
  // Life metrics
  netWorth: number;
  monthlyBurn: number;
  savingsRate: number;                // 0-1
  
  // Qualitative
  workLifeBalance: 'poor' | 'average' | 'good' | 'excellent';
  careerGrowth: 'stagnant' | 'slow' | 'moderate' | 'fast' | 'explosive';
  fulfillment: 'low' | 'medium' | 'high';
  stress: 'low' | 'medium' | 'high' | 'extreme';
  
  // Narrative
  narrative: string;                  // "You're a senior engineer at Google making $400K..."
  keyEvents: string[];                // ["Promoted to L5", "Bought a house", "Got married"]
}

export interface DecisionNode {
  id: string;
  year: number;                       // When this decision point occurs
  age: number;                        // User's age at this point
  
  // Current state at this node
  situation: string;                  // e.g., "You're a junior engineer at a startup"
  outcome: PathOutcome;
  
  // Branching options from this node
  decisions: DecisionOption[];
  selectedDecisionId?: string;        // Which decision was chosen (if expanded)
  
  // Tree structure
  parentId: string | null;
  childIds: string[];
  depth: number;
  
  // Metadata
  isExpanded: boolean;                // Has user explored children?
  isTerminal: boolean;                // End of this branch?
  pathProbability: number;            // Cumulative probability to reach this node
  isNew?: boolean;                    // Was this node just created? (for animation)
}

export interface DecisionTree {
  rootId: string;
  nodes: Map<string, DecisionNode>;
  userContext: UserContext;
  currentFocusId: string;             // Which node user is viewing
  exploredPaths: Set<string>;         // Which branches have been expanded
}

// ============================================================================
// DECISION TEMPLATES (Based on user context)
// ============================================================================

interface DecisionTemplate {
  id: string;
  trigger: (ctx: UserContext, outcome: PathOutcome) => boolean;
  label: string;
  description: (ctx: UserContext, outcome: PathOutcome) => string;
  probability: (ctx: UserContext, outcome: PathOutcome) => number;
  requirements?: string[];
  tradeoffs: string[];
  generateOutcome: (ctx: UserContext, parentOutcome: PathOutcome) => PathOutcome;
}

// Tech career decisions
const TECH_DECISIONS: DecisionTemplate[] = [
  {
    id: 'faang-offer',
    trigger: (ctx) => ctx.skills.some(s => ['programming', 'software', 'engineering', 'cs'].includes(s.toLowerCase())),
    label: 'Join a FAANG company',
    description: (ctx) => `Apply to big tech companies like Google, Meta, Amazon. Your ${ctx.skills.join(', ')} skills are in demand.`,
    probability: (ctx) => ctx.education.toLowerCase().includes('stanford') || ctx.education.toLowerCase().includes('mit') ? 0.7 : 0.4,
    requirements: ['Pass technical interviews', 'Leetcode preparation'],
    tradeoffs: ['Less ownership', 'Corporate bureaucracy', 'May feel like a cog'],
    generateOutcome: (ctx, parent) => {
      const companies = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft'];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const baseSalary = 180000 + Math.random() * 70000;
      const equity = 200000 + Math.random() * 300000; // 4-year vest
      const bonus = baseSalary * 0.15;
      const totalComp = baseSalary + bonus + equity / 4;
      
      return {
        jobTitle: 'Software Engineer L4',
        company,
        companyType: 'FAANG',
        salary: Math.round(totalComp),
        equity: Math.round(equity),
        location: company === 'Amazon' ? 'Seattle' : 'Bay Area',
        lifestyle: 'Comfortable but demanding. Good benefits, free food, but expected to be always on.',
        netWorth: parent.netWorth + totalComp * 0.4 - 80000, // After taxes and living
        monthlyBurn: 6000,
        savingsRate: 0.4,
        workLifeBalance: 'average',
        careerGrowth: 'moderate',
        fulfillment: 'medium',
        stress: 'high',
        narrative: `You land a role at ${company} as a Software Engineer. Starting salary is $${Math.round(baseSalary/1000)}K base + $${Math.round(equity/1000)}K equity over 4 years. You're working on ${['Search', 'Ads', 'Cloud', 'AI/ML', 'Infrastructure'][Math.floor(Math.random() * 5)]}. The work is interesting but you're one of thousands of engineers.`,
        keyEvents: [`Joined ${company}`, 'Completed onboarding', 'First performance review'],
      };
    },
  },
  {
    id: 'startup-early',
    trigger: (ctx) => ctx.riskTolerance !== 'low' && ctx.skills.length > 0,
    label: 'Join an early-stage startup',
    description: () => 'Take a bet on a Series A/B startup. Lower salary but significant equity.',
    probability: () => 0.6,
    requirements: ['Comfortable with ambiguity', 'Willing to wear many hats'],
    tradeoffs: ['Lower base salary', 'Higher risk', 'Less stability'],
    generateOutcome: (ctx, parent) => {
      const startupNames = ['Quantum AI', 'DataFlow', 'CloudScale', 'NeuralPath', 'ByteForge'];
      const company = startupNames[Math.floor(Math.random() * startupNames.length)];
      const baseSalary = 120000 + Math.random() * 40000;
      const equityPercent = 0.1 + Math.random() * 0.4; // 0.1% - 0.5%
      const potentialValue = equityPercent * (50000000 + Math.random() * 200000000); // $50M-$250M potential
      
      return {
        jobTitle: 'Founding Engineer',
        company,
        companyType: 'Startup (Series A)',
        salary: Math.round(baseSalary),
        equity: Math.round(potentialValue),
        location: 'San Francisco',
        lifestyle: 'Intense but exciting. You\'re building something from scratch with a small team.',
        netWorth: parent.netWorth + baseSalary * 0.25 - 60000,
        monthlyBurn: 5000,
        savingsRate: 0.25,
        workLifeBalance: 'poor',
        careerGrowth: 'explosive',
        fulfillment: 'high',
        stress: 'extreme',
        narrative: `You join ${company} as employee #${5 + Math.floor(Math.random() * 15)}. Base is $${Math.round(baseSalary/1000)}K but you get ${equityPercent.toFixed(2)}% equity. If they hit a $200M exit, that's $${Math.round(equityPercent * 200000000 / 1000)}K. The team is small, the problems are hard, and you're shipping features daily.`,
        keyEvents: [`Joined ${company} as founding engineer`, 'Shipped v1.0', 'First all-nighter'],
      };
    },
  },
  {
    id: 'start-company',
    trigger: (ctx) => ctx.riskTolerance === 'high' && ctx.goals.some(g => g.toLowerCase().includes('start') || g.toLowerCase().includes('found')),
    label: 'Start your own company',
    description: (ctx) => `You have skills in ${ctx.skills.slice(0, 2).join(' and ')}. Build something yourself.`,
    probability: (ctx) => ctx.currentSavings > 50000 ? 0.5 : 0.3,
    requirements: ['Runway (savings or funding)', 'A viable idea', 'Willingness to sacrifice'],
    tradeoffs: ['No salary initially', 'Extreme stress', 'High failure rate (90%)'],
    generateOutcome: (ctx, parent) => {
      const ideas = ['AI-powered productivity tool', 'B2B SaaS platform', 'Developer tools', 'Fintech app'];
      const idea = ideas[Math.floor(Math.random() * ideas.length)];
      const runway = ctx.currentSavings;
      
      return {
        jobTitle: 'Founder & CEO',
        company: 'Your Startup',
        companyType: 'Pre-seed Startup',
        salary: 0,
        equity: 10000000, // 100% of nothing, but potential
        location: ctx.location,
        lifestyle: 'All-consuming. You eat, sleep, and breathe your startup.',
        netWorth: parent.netWorth - 30000, // Burning savings
        monthlyBurn: 8000,
        savingsRate: -0.5, // Negative - burning runway
        workLifeBalance: 'poor',
        careerGrowth: 'explosive',
        fulfillment: 'high',
        stress: 'extreme',
        narrative: `You quit everything to build ${idea}. You have $${Math.round(runway/1000)}K runway - about ${Math.round(runway/8000)} months. You're coding, selling, and doing everything. It's terrifying and exhilarating.`,
        keyEvents: ['Quit job to start company', 'Built MVP', 'First customer conversation'],
      };
    },
  },
  {
    id: 'grad-school',
    trigger: (ctx) => ctx.age < 30 && !ctx.education.toLowerCase().includes('phd'),
    label: 'Go to graduate school',
    description: () => 'Pursue a Master\'s or PhD. Delay earnings but gain credentials and depth.',
    probability: () => 0.7,
    requirements: ['GRE scores', 'Research experience helps', 'Letters of recommendation'],
    tradeoffs: ['2-6 years of low/no income', 'Opportunity cost', 'Academic politics'],
    generateOutcome: (ctx, parent) => {
      const schools = ['Stanford', 'MIT', 'Berkeley', 'CMU', 'Georgia Tech'];
      const school = schools[Math.floor(Math.random() * schools.length)];
      const stipend = 35000 + Math.random() * 15000;
      
      return {
        jobTitle: 'PhD Student',
        company: school,
        companyType: 'Academia',
        salary: Math.round(stipend),
        equity: 0,
        location: school === 'MIT' ? 'Boston' : school === 'CMU' ? 'Pittsburgh' : 'Bay Area',
        lifestyle: 'Intellectually stimulating but financially constrained. Freedom to explore ideas.',
        netWorth: parent.netWorth - 20000,
        monthlyBurn: 3000,
        savingsRate: 0,
        workLifeBalance: 'good',
        careerGrowth: 'slow',
        fulfillment: 'high',
        stress: 'medium',
        narrative: `You're accepted to ${school} for a PhD in ${ctx.skills[0] || 'Computer Science'}. Stipend is $${Math.round(stipend/1000)}K/year. You'll spend 5 years going deep on research. The credential opens doors to research labs, professorships, or senior industry roles.`,
        keyEvents: [`Started PhD at ${school}`, 'Passed qualifying exams', 'First paper submitted'],
      };
    },
  },
  {
    id: 'finance-pivot',
    trigger: (ctx) => ctx.skills.some(s => ['programming', 'math', 'statistics'].includes(s.toLowerCase())),
    label: 'Pivot to quantitative finance',
    description: () => 'Use your technical skills in hedge funds or trading firms. Highest pay ceiling.',
    probability: (ctx) => ctx.education.toLowerCase().includes('stanford') || ctx.education.toLowerCase().includes('mit') ? 0.4 : 0.2,
    requirements: ['Strong math/stats', 'Competitive interviews', 'Willingness to relocate to NYC'],
    tradeoffs: ['Cutthroat culture', 'Long hours', 'Golden handcuffs'],
    generateOutcome: (ctx, parent) => {
      const firms = ['Jane Street', 'Two Sigma', 'Citadel', 'DE Shaw', 'HRT'];
      const firm = firms[Math.floor(Math.random() * firms.length)];
      const baseSalary = 200000 + Math.random() * 100000;
      const bonus = baseSalary * (0.5 + Math.random() * 1.5); // 50-200% bonus
      const totalComp = baseSalary + bonus;
      
      return {
        jobTitle: 'Quantitative Researcher',
        company: firm,
        companyType: 'Hedge Fund',
        salary: Math.round(totalComp),
        equity: 0,
        location: 'New York City',
        lifestyle: 'Intense, competitive, lucrative. You\'re surrounded by brilliant people.',
        netWorth: parent.netWorth + totalComp * 0.35 - 100000,
        monthlyBurn: 8000,
        savingsRate: 0.35,
        workLifeBalance: 'poor',
        careerGrowth: 'fast',
        fulfillment: 'medium',
        stress: 'extreme',
        narrative: `You land a quant role at ${firm}. First year comp is $${Math.round(totalComp/1000)}K. You're building trading strategies and models. The money is incredible but the pressure is relentless.`,
        keyEvents: [`Joined ${firm}`, 'First profitable strategy', 'Survived first bonus cycle'],
      };
    },
  },
];

// Life decisions (non-career)
const LIFE_DECISIONS: DecisionTemplate[] = [
  {
    id: 'stay-course',
    trigger: () => true,
    label: 'Stay the course',
    description: (ctx, outcome) => `Continue in your current role at ${outcome.company || 'your company'}. Focus on growth and stability.`,
    probability: () => 0.9,
    tradeoffs: ['May miss other opportunities', 'Comfort zone'],
    generateOutcome: (ctx, parent) => {
      const salaryGrowth = 1.05 + Math.random() * 0.1; // 5-15% raise
      const newSalary = Math.round(parent.salary * salaryGrowth);
      const promoted = Math.random() > 0.6;
      
      return {
        ...parent,
        jobTitle: promoted ? parent.jobTitle?.replace('Junior', 'Senior').replace('L4', 'L5').replace('Engineer', 'Senior Engineer') : parent.jobTitle,
        salary: newSalary,
        netWorth: parent.netWorth + newSalary * parent.savingsRate,
        narrative: promoted 
          ? `You got promoted! New title: ${parent.jobTitle?.replace('Junior', 'Senior')}. Salary bumped to $${Math.round(newSalary/1000)}K.`
          : `Another year at ${parent.company}. Steady progress, salary now $${Math.round(newSalary/1000)}K.`,
        keyEvents: promoted ? ['Promoted!', 'Salary increase'] : ['Annual review', 'Steady progress'],
      };
    },
  },
  {
    id: 'relocate',
    trigger: (ctx, outcome) => outcome.location !== 'Remote',
    label: 'Relocate for opportunity',
    description: () => 'Move to a different city for better opportunities or lower cost of living.',
    probability: () => 0.7,
    tradeoffs: ['Leave your network', 'Moving costs', 'Starting over socially'],
    generateOutcome: (ctx, parent) => {
      const destinations = [
        { city: 'Austin', costMultiplier: 0.7, salaryMultiplier: 0.85 },
        { city: 'Seattle', costMultiplier: 0.9, salaryMultiplier: 1.0 },
        { city: 'NYC', costMultiplier: 1.2, salaryMultiplier: 1.1 },
        { city: 'Denver', costMultiplier: 0.65, salaryMultiplier: 0.8 },
        { city: 'Remote', costMultiplier: 0.5, salaryMultiplier: 0.9 },
      ];
      const dest = destinations[Math.floor(Math.random() * destinations.length)];
      const newSalary = Math.round(parent.salary * dest.salaryMultiplier);
      const newBurn = Math.round(parent.monthlyBurn * dest.costMultiplier);
      
      return {
        ...parent,
        salary: newSalary,
        location: dest.city,
        monthlyBurn: newBurn,
        netWorth: parent.netWorth - 15000 + (parent.salary - newBurn * 12) * 0.3,
        narrative: `You relocated to ${dest.city}. ${dest.city === 'Remote' ? 'Working from anywhere now.' : `New city, new chapter.`} Cost of living is ${dest.costMultiplier < 1 ? 'lower' : 'higher'}, salary adjusted to $${Math.round(newSalary/1000)}K.`,
        keyEvents: [`Moved to ${dest.city}`, 'Found new apartment', 'Building new network'],
      };
    },
  },
];

const ALL_DECISIONS = [...TECH_DECISIONS, ...LIFE_DECISIONS];

// ============================================================================
// TREE GENERATION
// ============================================================================

let nodeIdCounter = 0;
function generateNodeId(): string {
  return `node-${++nodeIdCounter}`;
}

export function createInitialNode(context: UserContext): DecisionNode {
  const netWorth = context.currentSavings - context.currentDebt;
  
  const initialOutcome: PathOutcome = {
    jobTitle: context.currentSituation.includes('student') ? 'Student' : 'Professional',
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

  // Generate available decisions based on context
  const availableDecisions = ALL_DECISIONS
    .filter(d => d.trigger(context, initialOutcome))
    .map(d => ({
      id: d.id,
      label: d.label,
      description: d.description(context, initialOutcome),
      probability: d.probability(context, initialOutcome),
      requirements: d.requirements,
      tradeoffs: d.tradeoffs,
    }));

  return {
    id: generateNodeId(),
    year: new Date().getFullYear(),
    age: context.age,
    situation: context.currentSituation,
    outcome: initialOutcome,
    decisions: availableDecisions,
    parentId: null,
    childIds: [],
    depth: 0,
    isExpanded: false,
    isTerminal: false,
    pathProbability: 1,
  };
}

export function expandNode(
  tree: DecisionTree,
  nodeId: string,
  decisionId: string
): DecisionNode | null {
  const parentNode = tree.nodes.get(nodeId);
  if (!parentNode) return null;

  const decision = parentNode.decisions.find(d => d.id === decisionId);
  if (!decision) return null;

  const template = ALL_DECISIONS.find(d => d.id === decisionId);
  if (!template) return null;

  // Generate the outcome for this decision
  const newOutcome = template.generateOutcome(tree.userContext, parentNode.outcome);
  
  // Generate new decisions available from this state
  const newDecisions = ALL_DECISIONS
    .filter(d => d.trigger(tree.userContext, newOutcome))
    .map(d => ({
      id: d.id,
      label: d.label,
      description: d.description(tree.userContext, newOutcome),
      probability: d.probability(tree.userContext, newOutcome),
      requirements: d.requirements,
      tradeoffs: d.tradeoffs,
    }));

  const newNode: DecisionNode = {
    id: generateNodeId(),
    year: parentNode.year + 1,
    age: parentNode.age + 1,
    situation: `After: ${decision.label}`,
    outcome: newOutcome,
    decisions: newDecisions,
    parentId: parentNode.id,
    childIds: [],
    depth: parentNode.depth + 1,
    isExpanded: false,
    isTerminal: parentNode.depth >= 10, // Max 10 years out
    pathProbability: parentNode.pathProbability * decision.probability,
  };

  return newNode;
}

export function createDecisionTree(context: UserContext): DecisionTree {
  const rootNode = createInitialNode(context);
  const nodes = new Map<string, DecisionNode>();
  nodes.set(rootNode.id, rootNode);

  return {
    rootId: rootNode.id,
    nodes,
    userContext: context,
    currentFocusId: rootNode.id,
    exploredPaths: new Set(),
  };
}

export function addNodeToTree(tree: DecisionTree, node: DecisionNode): DecisionTree {
  const newNodes = new Map(tree.nodes);
  newNodes.set(node.id, node);

  // Update parent's childIds
  if (node.parentId) {
    const parent = newNodes.get(node.parentId);
    if (parent) {
      newNodes.set(node.parentId, {
        ...parent,
        childIds: [...parent.childIds, node.id],
        isExpanded: true,
      });
    }
  }

  return {
    ...tree,
    nodes: newNodes,
    exploredPaths: new Set([...Array.from(tree.exploredPaths), node.id]),
  };
}

// ============================================================================
// CONTEXT PARSING (Simple version - can be enhanced with LLM)
// ============================================================================

export function parseUserContext(freeText: string, age: number = 22): UserContext {
  const text = freeText.toLowerCase();
  
  // Extract skills
  const skillKeywords = ['programming', 'software', 'engineering', 'machine learning', 'ai', 'data science', 'design', 'product', 'marketing', 'sales', 'finance', 'math', 'statistics'];
  const skills = skillKeywords.filter(s => text.includes(s));
  if (skills.length === 0) skills.push('general');

  // Extract education
  let education = 'Unknown';
  if (text.includes('stanford')) education = 'Stanford University';
  else if (text.includes('mit')) education = 'MIT';
  else if (text.includes('berkeley')) education = 'UC Berkeley';
  else if (text.includes('phd')) education = 'PhD';
  else if (text.includes('master')) education = "Master's degree";
  else if (text.includes('college') || text.includes('university') || text.includes('student')) education = 'College (in progress)';

  // Extract location
  let location = 'Unknown';
  if (text.includes('sf') || text.includes('san francisco') || text.includes('bay area')) location = 'San Francisco Bay Area';
  else if (text.includes('nyc') || text.includes('new york')) location = 'New York City';
  else if (text.includes('seattle')) location = 'Seattle';
  else if (text.includes('austin')) location = 'Austin';

  // Extract financial info (rough estimates)
  let currentIncome = 0;
  let currentSavings = 5000;
  let currentDebt = 0;

  if (text.includes('student')) {
    currentIncome = 0;
    currentDebt = 50000; // Assume student loans
    currentSavings = 2000;
  } else if (text.includes('engineer') || text.includes('developer')) {
    currentIncome = 150000;
    currentSavings = 50000;
  } else if (text.includes('intern')) {
    currentIncome = 80000; // Annualized
    currentSavings = 10000;
  }

  // Extract goals
  const goals: string[] = [];
  if (text.includes('start') || text.includes('found') || text.includes('entrepreneur')) goals.push('start a company');
  if (text.includes('rich') || text.includes('wealth') || text.includes('money')) goals.push('financial freedom');
  if (text.includes('impact') || text.includes('change')) goals.push('make an impact');
  if (goals.length === 0) goals.push('career growth');

  // Risk tolerance
  let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
  if (text.includes('safe') || text.includes('stable') || text.includes('secure')) riskTolerance = 'low';
  if (text.includes('risk') || text.includes('bet') || text.includes('startup') || text.includes('entrepreneur')) riskTolerance = 'high';

  return {
    age,
    currentSituation: freeText.slice(0, 100),
    currentIncome,
    currentSavings,
    currentDebt,
    skills,
    education,
    location,
    goals,
    constraints: [],
    health: 'good',
    riskTolerance,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { DecisionTemplate };
