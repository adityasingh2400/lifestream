/**
 * Probability Engine Types
 * 
 * Types for the data-driven probability calculation system.
 */

// ============================================================================
// BENCHMARK PROFILE
// ============================================================================

export interface BenchmarkProfile {
  id: string;
  name?: string;  // Anonymous if not available
  
  // Background
  education: {
    degree: 'high-school' | 'bachelors' | 'masters' | 'phd' | 'bootcamp' | 'self-taught';
    field?: string;
    school?: string;
    schoolTier?: 'top-10' | 'top-50' | 'top-100' | 'other';
  };
  
  // Experience at time of achievement
  yearsExperience: number;
  previousRoles: {
    title: string;
    company?: string;
    companyType?: 'faang' | 'unicorn' | 'startup' | 'enterprise' | 'consulting' | 'other';
    duration: number;  // months
  }[];
  
  // Skills
  skills: {
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }[];
  
  // Network
  networkStrength: 'weak' | 'moderate' | 'strong' | 'exceptional';
  hasFounderNetwork: boolean;
  hasInvestorConnections: boolean;
  
  // Track record
  previousStartups?: number;
  previousExits?: number;
  previousFunding?: number;  // total raised before
  
  // Demographics (optional, for statistical purposes)
  ageAtAchievement?: number;
  location?: string;
}

// ============================================================================
// BENCHMARK DATASET
// ============================================================================

export interface BenchmarkDataset {
  id: string;
  name: string;
  description: string;
  category: 'yc-founders' | 'faang-engineers' | 'unicorn-founders' | 'successful-pivots' | 'career-changers' | 'custom';
  
  // Metadata
  source: string;
  lastUpdated: Date;
  sampleSize: number;
  
  // Profiles
  profiles: BenchmarkProfile[];
  
  // Aggregate statistics
  stats: {
    avgYearsExperience: number;
    avgAge?: number;
    educationDistribution: Record<string, number>;
    topSkills: { name: string; frequency: number }[];
    topPreviousCompanies: { name: string; frequency: number }[];
    successRate?: number;  // If applicable
  };
}

// ============================================================================
// PROBABILITY FACTORS
// ============================================================================

export interface ProbabilityFactor {
  name: string;
  weight: number;  // 0-1, how much this factor contributes
  score: number;   // 0-1, user's score on this factor
  evidence: string;
  comparison?: {
    userValue: string | number;
    benchmarkAvg: string | number;
    percentile: number;
  };
}

export interface ProbabilityBreakdown {
  // Overall probability
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  
  // Factor breakdown
  factors: ProbabilityFactor[];
  
  // Comparison to benchmark
  benchmarkComparison: {
    datasetUsed: string;
    sampleSize: number;
    userPercentile: number;  // Where user falls in the distribution
    similarProfiles: number; // How many similar profiles achieved this
  };
  
  // Recommendations
  recommendations: {
    factor: string;
    currentScore: number;
    targetScore: number;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
  }[];
}

// ============================================================================
// GOAL TYPES (for probability calculation)
// ============================================================================

export type GoalType = 
  | 'yc-acceptance'
  | 'faang-offer'
  | 'startup-funding'
  | 'promotion'
  | 'career-change'
  | 'salary-increase'
  | 'founding-company'
  | 'acquisition'
  | 'ipo'
  | 'custom';

export interface GoalDefinition {
  type: GoalType;
  name: string;
  description: string;
  relevantDatasets: string[];  // Dataset IDs
  keyFactors: {
    name: string;
    weight: number;
    description: string;
  }[];
}
