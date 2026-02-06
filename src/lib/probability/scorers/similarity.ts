/**
 * Profile Similarity Scorer
 * 
 * Calculates how similar a user's profile is to benchmark profiles.
 */

import { BenchmarkProfile, BenchmarkDataset, ProbabilityFactor } from '../types';
import { SimulationContext } from '@/store/useKnowledgeStore';

// ============================================================================
// SIMILARITY SCORING
// ============================================================================

interface SimilarityResult {
  overallScore: number;  // 0-1
  factors: ProbabilityFactor[];
  matchingProfiles: number;
  percentile: number;
}

/**
 * Calculate education similarity score
 */
function scoreEducation(
  userEducation: string | undefined,
  benchmarkProfile: BenchmarkProfile
): { score: number; evidence: string } {
  if (!userEducation) {
    return { score: 0.3, evidence: 'Education not specified' };
  }
  
  const userEd = userEducation.toLowerCase();
  const benchEd = benchmarkProfile.education;
  
  // Check degree level match
  let degreeScore = 0;
  if (userEd.includes('phd') || userEd.includes('doctorate')) {
    degreeScore = benchEd.degree === 'phd' ? 1 : 0.7;
  } else if (userEd.includes('master') || userEd.includes('mba')) {
    degreeScore = benchEd.degree === 'masters' ? 1 : 0.6;
  } else if (userEd.includes('bachelor') || userEd.includes('bs') || userEd.includes('ba')) {
    degreeScore = benchEd.degree === 'bachelors' ? 1 : 0.5;
  } else if (userEd.includes('bootcamp')) {
    degreeScore = benchEd.degree === 'bootcamp' ? 1 : 0.4;
  } else if (userEd.includes('self-taught') || userEd.includes('self taught')) {
    degreeScore = benchEd.degree === 'self-taught' ? 1 : 0.3;
  } else {
    degreeScore = 0.4;
  }
  
  // Check school tier (if mentioned)
  let tierBonus = 0;
  const topSchools = ['stanford', 'mit', 'harvard', 'berkeley', 'cmu', 'caltech', 'princeton', 'yale', 'columbia'];
  if (topSchools.some(s => userEd.includes(s))) {
    tierBonus = benchEd.schoolTier === 'top-10' ? 0.2 : 0.1;
  }
  
  const finalScore = Math.min(1, degreeScore + tierBonus);
  
  return {
    score: finalScore,
    evidence: `Education: ${userEducation} vs benchmark ${benchEd.degree}`,
  };
}

/**
 * Calculate skills similarity score
 */
function scoreSkills(
  userSkills: { name: string; level: string }[],
  benchmarkProfile: BenchmarkProfile
): { score: number; evidence: string; matchedSkills: string[] } {
  if (!userSkills || userSkills.length === 0) {
    return { score: 0.2, evidence: 'No skills data available', matchedSkills: [] };
  }
  
  const benchSkills = benchmarkProfile.skills;
  const matchedSkills: string[] = [];
  let totalScore = 0;
  
  // Normalize skill names for comparison
  const normalizeSkill = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const benchSkill of benchSkills) {
    const benchNorm = normalizeSkill(benchSkill.name);
    
    // Find matching user skill
    const matchingUserSkill = userSkills.find(us => {
      const userNorm = normalizeSkill(us.name);
      return userNorm.includes(benchNorm) || benchNorm.includes(userNorm);
    });
    
    if (matchingUserSkill) {
      matchedSkills.push(benchSkill.name);
      
      // Score based on level match
      const levelOrder = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
      const userLevel = levelOrder[matchingUserSkill.level as keyof typeof levelOrder] || 2;
      const benchLevel = levelOrder[benchSkill.level] || 2;
      
      // Higher score if user level >= benchmark level
      const levelScore = userLevel >= benchLevel ? 1 : userLevel / benchLevel;
      totalScore += levelScore;
    }
  }
  
  const avgScore = benchSkills.length > 0 ? totalScore / benchSkills.length : 0;
  
  return {
    score: avgScore,
    evidence: `Matched ${matchedSkills.length}/${benchSkills.length} key skills`,
    matchedSkills,
  };
}

/**
 * Calculate experience similarity score
 */
function scoreExperience(
  userWorkHistory: { company: string; role?: string }[],
  yearsExperience: number | undefined,
  benchmarkProfile: BenchmarkProfile
): { score: number; evidence: string } {
  let score = 0;
  const evidence: string[] = [];
  
  // Years of experience
  const userYears = yearsExperience || userWorkHistory.length * 2;  // Estimate if not provided
  const benchYears = benchmarkProfile.yearsExperience;
  
  if (userYears >= benchYears) {
    score += 0.4;
    evidence.push(`${userYears}+ years experience (meets ${benchYears} year benchmark)`);
  } else {
    score += 0.4 * (userYears / benchYears);
    evidence.push(`${userYears} years experience (benchmark: ${benchYears})`);
  }
  
  // Company type match
  const faangCompanies = ['google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix'];
  const consultingCompanies = ['mckinsey', 'bcg', 'bain', 'deloitte', 'accenture'];
  
  const userCompanyTypes = new Set<string>();
  for (const job of userWorkHistory) {
    const companyLower = job.company.toLowerCase();
    if (faangCompanies.some(f => companyLower.includes(f))) {
      userCompanyTypes.add('faang');
    } else if (consultingCompanies.some(c => companyLower.includes(c))) {
      userCompanyTypes.add('consulting');
    } else if (companyLower.includes('startup') || companyLower.includes('founded')) {
      userCompanyTypes.add('startup');
    }
  }
  
  // Check if user has similar company background
  for (const benchRole of benchmarkProfile.previousRoles) {
    if (benchRole.companyType && userCompanyTypes.has(benchRole.companyType)) {
      score += 0.3;
      evidence.push(`Has ${benchRole.companyType} experience`);
      break;
    }
  }
  
  // Role seniority
  const seniorRoles = ['senior', 'lead', 'principal', 'staff', 'director', 'vp', 'head', 'manager'];
  const hasSeniorRole = userWorkHistory.some(job => 
    job.role && seniorRoles.some(s => job.role!.toLowerCase().includes(s))
  );
  
  if (hasSeniorRole) {
    score += 0.3;
    evidence.push('Has senior-level experience');
  }
  
  return {
    score: Math.min(1, score),
    evidence: evidence.join('; ') || 'Limited work history data',
  };
}

/**
 * Calculate network strength score
 */
function scoreNetwork(
  userNetwork: { name: string; relationship: string }[],
  benchmarkProfile: BenchmarkProfile
): { score: number; evidence: string } {
  const networkSize = userNetwork.length;
  
  // Count relationship types
  const mentors = userNetwork.filter(n => n.relationship === 'mentor').length;
  const professionals = userNetwork.filter(n => 
    n.relationship === 'colleague' || n.relationship === 'professional-contact'
  ).length;
  
  let score = 0;
  const evidence: string[] = [];
  
  // Network size
  if (networkSize >= 20) {
    score += 0.3;
    evidence.push('Strong network size');
  } else if (networkSize >= 10) {
    score += 0.2;
    evidence.push('Moderate network size');
  } else if (networkSize >= 5) {
    score += 0.1;
    evidence.push('Growing network');
  }
  
  // Mentor relationships
  if (mentors >= 2) {
    score += 0.3;
    evidence.push(`${mentors} mentor relationships`);
  } else if (mentors >= 1) {
    score += 0.15;
    evidence.push('Has mentor');
  }
  
  // Professional connections
  if (professionals >= 10) {
    score += 0.4;
    evidence.push('Strong professional network');
  } else if (professionals >= 5) {
    score += 0.2;
    evidence.push('Growing professional network');
  }
  
  // Compare to benchmark
  const benchStrength = benchmarkProfile.networkStrength;
  const strengthOrder = { weak: 1, moderate: 2, strong: 3, exceptional: 4 };
  const benchStrengthNum = strengthOrder[benchStrength];
  
  // Estimate user strength
  let userStrengthNum = 1;
  if (score >= 0.8) userStrengthNum = 4;
  else if (score >= 0.5) userStrengthNum = 3;
  else if (score >= 0.3) userStrengthNum = 2;
  
  const networkMatch = userStrengthNum / benchStrengthNum;
  
  return {
    score: Math.min(1, score * networkMatch),
    evidence: evidence.join('; ') || 'Limited network data',
  };
}

// ============================================================================
// MAIN SCORER
// ============================================================================

/**
 * Calculate overall similarity between user profile and benchmark dataset
 */
export function calculateProfileSimilarity(
  userContext: SimulationContext,
  dataset: BenchmarkDataset
): SimilarityResult {
  const factors: ProbabilityFactor[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  // Score against each benchmark profile and average
  const profileScores: number[] = [];
  
  for (const benchProfile of dataset.profiles) {
    let profileScore = 0;
    
    // Education (weight: 0.15)
    const eduResult = scoreEducation(
      userContext.profile.currentRole,  // Using role as proxy for education context
      benchProfile
    );
    profileScore += eduResult.score * 0.15;
    
    // Skills (weight: 0.35)
    const skillsResult = scoreSkills(
      userContext.topSkills,
      benchProfile
    );
    profileScore += skillsResult.score * 0.35;
    
    // Experience (weight: 0.30)
    const expResult = scoreExperience(
      userContext.workHistory,
      undefined,  // Could be derived from profile
      benchProfile
    );
    profileScore += expResult.score * 0.30;
    
    // Network (weight: 0.20)
    const networkResult = scoreNetwork(
      userContext.network,
      benchProfile
    );
    profileScore += networkResult.score * 0.20;
    
    profileScores.push(profileScore);
  }
  
  // Calculate average and percentile
  const avgScore = profileScores.reduce((a, b) => a + b, 0) / profileScores.length;
  const matchingProfiles = profileScores.filter(s => s >= 0.5).length;
  
  // Build factor breakdown (using first profile as representative)
  if (dataset.profiles.length > 0) {
    const benchProfile = dataset.profiles[0];
    
    const eduResult = scoreEducation(userContext.profile.currentRole, benchProfile);
    factors.push({
      name: 'Education',
      weight: 0.15,
      score: eduResult.score,
      evidence: eduResult.evidence,
    });
    
    const skillsResult = scoreSkills(userContext.topSkills, benchProfile);
    factors.push({
      name: 'Technical Skills',
      weight: 0.35,
      score: skillsResult.score,
      evidence: skillsResult.evidence,
    });
    
    const expResult = scoreExperience(userContext.workHistory, undefined, benchProfile);
    factors.push({
      name: 'Work Experience',
      weight: 0.30,
      score: expResult.score,
      evidence: expResult.evidence,
    });
    
    const networkResult = scoreNetwork(userContext.network, benchProfile);
    factors.push({
      name: 'Network Strength',
      weight: 0.20,
      score: networkResult.score,
      evidence: networkResult.evidence,
    });
  }
  
  // Calculate percentile (simplified)
  const percentile = Math.round(avgScore * 100);
  
  return {
    overallScore: avgScore,
    factors,
    matchingProfiles,
    percentile,
  };
}
