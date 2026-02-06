/**
 * Probability Calculator
 * 
 * Main engine for calculating data-driven probabilities for various goals.
 */

import { 
  ProbabilityBreakdown, 
  GoalType, 
  GoalDefinition,
  BenchmarkDataset,
} from '../types';
import { 
  allBenchmarkDatasets, 
  ycFoundersDataset, 
  faangEngineersDataset,
  unicornFoundersDataset,
} from '../datasets';
import { calculateProfileSimilarity } from './similarity';
import { SimulationContext } from '@/store/useKnowledgeStore';

// ============================================================================
// GOAL DEFINITIONS
// ============================================================================

const goalDefinitions: Record<GoalType, GoalDefinition> = {
  'yc-acceptance': {
    type: 'yc-acceptance',
    name: 'Y Combinator Acceptance',
    description: 'Get accepted into Y Combinator accelerator',
    relevantDatasets: ['yc-founders-2024'],
    keyFactors: [
      { name: 'Technical Skills', weight: 0.25, description: 'Strong technical foundation' },
      { name: 'Previous Startup Experience', weight: 0.20, description: 'Prior founding or early-stage experience' },
      { name: 'Network', weight: 0.15, description: 'Connections to founders and investors' },
      { name: 'Education', weight: 0.10, description: 'Educational background' },
      { name: 'Idea Quality', weight: 0.30, description: 'Market size, traction, uniqueness' },
    ],
  },
  'faang-offer': {
    type: 'faang-offer',
    name: 'FAANG Job Offer',
    description: 'Receive an offer from a FAANG company',
    relevantDatasets: ['faang-engineers-2024'],
    keyFactors: [
      { name: 'DSA Skills', weight: 0.35, description: 'Data structures and algorithms proficiency' },
      { name: 'System Design', weight: 0.25, description: 'Ability to design scalable systems' },
      { name: 'Work Experience', weight: 0.20, description: 'Relevant industry experience' },
      { name: 'Education', weight: 0.10, description: 'CS degree or equivalent' },
      { name: 'Communication', weight: 0.10, description: 'Behavioral interview skills' },
    ],
  },
  'startup-funding': {
    type: 'startup-funding',
    name: 'Raise Seed Funding',
    description: 'Successfully raise seed round funding',
    relevantDatasets: ['yc-founders-2024', 'unicorn-founders-2024'],
    keyFactors: [
      { name: 'Traction', weight: 0.30, description: 'Revenue, users, or growth metrics' },
      { name: 'Team', weight: 0.25, description: 'Founder backgrounds and chemistry' },
      { name: 'Market', weight: 0.20, description: 'Market size and timing' },
      { name: 'Network', weight: 0.15, description: 'Investor connections' },
      { name: 'Pitch', weight: 0.10, description: 'Ability to communicate vision' },
    ],
  },
  'promotion': {
    type: 'promotion',
    name: 'Get Promoted',
    description: 'Receive a promotion at current company',
    relevantDatasets: ['faang-engineers-2024'],
    keyFactors: [
      { name: 'Performance', weight: 0.35, description: 'Consistent high performance' },
      { name: 'Visibility', weight: 0.25, description: 'Work visibility to leadership' },
      { name: 'Scope', weight: 0.20, description: 'Taking on larger scope projects' },
      { name: 'Relationships', weight: 0.15, description: 'Manager and peer relationships' },
      { name: 'Timing', weight: 0.05, description: 'Company growth and openings' },
    ],
  },
  'career-change': {
    type: 'career-change',
    name: 'Career Change',
    description: 'Successfully transition to a new career',
    relevantDatasets: [],
    keyFactors: [
      { name: 'Transferable Skills', weight: 0.30, description: 'Skills that apply to new field' },
      { name: 'Learning', weight: 0.25, description: 'Ability to learn new skills' },
      { name: 'Network', weight: 0.20, description: 'Connections in target field' },
      { name: 'Financial Runway', weight: 0.15, description: 'Savings to support transition' },
      { name: 'Commitment', weight: 0.10, description: 'Dedication to the change' },
    ],
  },
  'salary-increase': {
    type: 'salary-increase',
    name: 'Significant Salary Increase',
    description: 'Achieve 20%+ salary increase',
    relevantDatasets: ['faang-engineers-2024'],
    keyFactors: [
      { name: 'Market Value', weight: 0.30, description: 'Skills in demand' },
      { name: 'Negotiation', weight: 0.25, description: 'Negotiation skills' },
      { name: 'Competing Offers', weight: 0.25, description: 'Leverage from other offers' },
      { name: 'Performance', weight: 0.15, description: 'Track record of results' },
      { name: 'Timing', weight: 0.05, description: 'Market conditions' },
    ],
  },
  'founding-company': {
    type: 'founding-company',
    name: 'Found a Company',
    description: 'Start your own company',
    relevantDatasets: ['yc-founders-2024'],
    keyFactors: [
      { name: 'Idea', weight: 0.25, description: 'Problem worth solving' },
      { name: 'Skills', weight: 0.25, description: 'Technical or domain expertise' },
      { name: 'Financial Runway', weight: 0.20, description: 'Savings to bootstrap' },
      { name: 'Co-founder', weight: 0.15, description: 'Finding the right partner' },
      { name: 'Risk Tolerance', weight: 0.15, description: 'Willingness to take risk' },
    ],
  },
  'acquisition': {
    type: 'acquisition',
    name: 'Company Acquisition',
    description: 'Have your company acquired',
    relevantDatasets: ['unicorn-founders-2024'],
    keyFactors: [
      { name: 'Revenue', weight: 0.30, description: 'Sustainable revenue' },
      { name: 'Strategic Value', weight: 0.25, description: 'Value to acquirer' },
      { name: 'Team', weight: 0.20, description: 'Talent acquirer wants' },
      { name: 'Market Position', weight: 0.15, description: 'Competitive moat' },
      { name: 'Timing', weight: 0.10, description: 'M&A market conditions' },
    ],
  },
  'ipo': {
    type: 'ipo',
    name: 'IPO',
    description: 'Take company public',
    relevantDatasets: ['unicorn-founders-2024'],
    keyFactors: [
      { name: 'Scale', weight: 0.30, description: '$100M+ revenue' },
      { name: 'Growth', weight: 0.25, description: 'Consistent growth trajectory' },
      { name: 'Profitability Path', weight: 0.20, description: 'Clear path to profitability' },
      { name: 'Market', weight: 0.15, description: 'Large addressable market' },
      { name: 'Team', weight: 0.10, description: 'Public company ready team' },
    ],
  },
  'custom': {
    type: 'custom',
    name: 'Custom Goal',
    description: 'User-defined goal',
    relevantDatasets: [],
    keyFactors: [],
  },
};

// ============================================================================
// PROBABILITY CALCULATOR
// ============================================================================

/**
 * Calculate probability for a specific goal based on user's profile
 */
export function calculateProbability(
  goalType: GoalType,
  userContext: SimulationContext
): ProbabilityBreakdown {
  const goalDef = goalDefinitions[goalType];
  
  // Get relevant datasets
  const datasets = goalDef.relevantDatasets
    .map(id => allBenchmarkDatasets.find(d => d.id === id))
    .filter((d): d is BenchmarkDataset => d !== undefined);
  
  if (datasets.length === 0) {
    // No benchmark data - return estimate based on general factors
    return createEstimatedProbability(goalType, userContext, goalDef);
  }
  
  // Calculate similarity against each dataset
  const similarities = datasets.map(dataset => 
    calculateProfileSimilarity(userContext, dataset)
  );
  
  // Combine results
  const avgSimilarity = similarities.reduce((sum, s) => sum + s.overallScore, 0) / similarities.length;
  
  // Combine all factors
  const allFactors = similarities.flatMap(s => s.factors);
  const uniqueFactors = new Map<string, typeof allFactors[0]>();
  for (const factor of allFactors) {
    if (!uniqueFactors.has(factor.name) || factor.score > uniqueFactors.get(factor.name)!.score) {
      uniqueFactors.set(factor.name, factor);
    }
  }
  
  // Calculate base probability from dataset success rate
  const baseSuccessRate = datasets.reduce((sum, d) => sum + (d.stats.successRate || 0.1), 0) / datasets.length;
  
  // Adjust probability based on similarity
  // Higher similarity = closer to benchmark success rate
  // Lower similarity = much lower probability
  const adjustedProbability = baseSuccessRate * Math.pow(avgSimilarity, 0.5) * 10;
  const finalProbability = Math.min(0.95, Math.max(0.01, adjustedProbability));
  
  // Generate recommendations
  const recommendations = generateRecommendations(Array.from(uniqueFactors.values()), goalDef);
  
  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (userContext.stats.totalSkills < 3 || userContext.workHistory.length === 0) {
    confidence = 'low';
  } else if (userContext.stats.totalSkills >= 10 && userContext.workHistory.length >= 3) {
    confidence = 'high';
  }
  
  return {
    probability: finalProbability,
    confidence,
    factors: Array.from(uniqueFactors.values()),
    benchmarkComparison: {
      datasetUsed: datasets.map(d => d.name).join(', '),
      sampleSize: datasets.reduce((sum, d) => sum + d.sampleSize, 0),
      userPercentile: Math.round(avgSimilarity * 100),
      similarProfiles: similarities.reduce((sum, s) => sum + s.matchingProfiles, 0),
    },
    recommendations,
  };
}

/**
 * Create estimated probability when no benchmark data is available
 */
function createEstimatedProbability(
  goalType: GoalType,
  userContext: SimulationContext,
  goalDef: GoalDefinition
): ProbabilityBreakdown {
  // Estimate based on general factors
  let baseScore = 0.3;  // Start with 30% base
  
  // Adjust based on skills
  if (userContext.stats.totalSkills >= 10) baseScore += 0.15;
  else if (userContext.stats.totalSkills >= 5) baseScore += 0.1;
  
  // Adjust based on experience
  if (userContext.workHistory.length >= 3) baseScore += 0.15;
  else if (userContext.workHistory.length >= 1) baseScore += 0.1;
  
  // Adjust based on network
  if (userContext.stats.totalConnections >= 10) baseScore += 0.1;
  
  // Adjust based on goals alignment
  const hasRelatedGoal = userContext.currentGoals.some(g => 
    g.description.toLowerCase().includes(goalType.replace('-', ' '))
  );
  if (hasRelatedGoal) baseScore += 0.1;
  
  return {
    probability: Math.min(0.8, baseScore),
    confidence: 'low',
    factors: goalDef.keyFactors.map(f => ({
      name: f.name,
      weight: f.weight,
      score: 0.5,  // Unknown
      evidence: 'Insufficient data for accurate scoring',
    })),
    benchmarkComparison: {
      datasetUsed: 'None (estimated)',
      sampleSize: 0,
      userPercentile: 50,
      similarProfiles: 0,
    },
    recommendations: [
      {
        factor: 'Data',
        currentScore: 0,
        targetScore: 1,
        suggestion: 'Import more personal data to improve prediction accuracy',
        impact: 'high',
      },
    ],
  };
}

/**
 * Generate actionable recommendations based on factor scores
 */
function generateRecommendations(
  factors: ProbabilityBreakdown['factors'],
  goalDef: GoalDefinition
): ProbabilityBreakdown['recommendations'] {
  const recommendations: ProbabilityBreakdown['recommendations'] = [];
  
  // Sort factors by potential impact (weight * gap)
  const sortedFactors = [...factors].sort((a, b) => {
    const gapA = (1 - a.score) * a.weight;
    const gapB = (1 - b.score) * b.weight;
    return gapB - gapA;
  });
  
  // Generate recommendations for top 3 improvement areas
  for (const factor of sortedFactors.slice(0, 3)) {
    if (factor.score >= 0.8) continue;  // Already strong
    
    const suggestion = getSuggestionForFactor(factor.name, factor.score);
    const impact = factor.weight >= 0.25 ? 'high' : factor.weight >= 0.15 ? 'medium' : 'low';
    
    recommendations.push({
      factor: factor.name,
      currentScore: factor.score,
      targetScore: Math.min(1, factor.score + 0.3),
      suggestion,
      impact,
    });
  }
  
  return recommendations;
}

/**
 * Get specific suggestion for improving a factor
 */
function getSuggestionForFactor(factorName: string, currentScore: number): string {
  const suggestions: Record<string, string[]> = {
    'Technical Skills': [
      'Build more projects to demonstrate your skills',
      'Contribute to open source projects',
      'Get certifications in key technologies',
    ],
    'Education': [
      'Consider relevant online courses or certifications',
      'Pursue advanced degree if beneficial for your goals',
      'Attend workshops and conferences',
    ],
    'Work Experience': [
      'Seek opportunities at companies aligned with your goals',
      'Take on more senior responsibilities',
      'Document your achievements and impact',
    ],
    'Network Strength': [
      'Attend industry events and meetups',
      'Reach out to people in your target field',
      'Find mentors who have achieved similar goals',
    ],
    'DSA Skills': [
      'Practice on LeetCode or HackerRank daily',
      'Study common patterns and algorithms',
      'Do mock interviews',
    ],
    'System Design': [
      'Study system design case studies',
      'Read engineering blogs from top companies',
      'Practice designing systems end-to-end',
    ],
  };
  
  const factorSuggestions = suggestions[factorName] || [
    `Focus on improving your ${factorName.toLowerCase()}`,
    `Seek resources and mentorship for ${factorName.toLowerCase()}`,
  ];
  
  // Return suggestion based on current score
  const index = currentScore < 0.3 ? 0 : currentScore < 0.6 ? 1 : 2;
  return factorSuggestions[Math.min(index, factorSuggestions.length - 1)];
}

// ============================================================================
// EXPORTS
// ============================================================================

export { goalDefinitions };
export type { GoalDefinition };
