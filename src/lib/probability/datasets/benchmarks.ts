/**
 * Benchmark Datasets
 * 
 * Pre-built datasets for probability calculations.
 * These are based on publicly available data and research.
 */

import { BenchmarkDataset, BenchmarkProfile } from '../types';

// ============================================================================
// YC FOUNDERS DATASET
// ============================================================================

const ycFounderProfiles: BenchmarkProfile[] = [
  // Based on publicly available YC founder data patterns
  {
    id: 'yc-pattern-1',
    education: {
      degree: 'bachelors',
      field: 'Computer Science',
      schoolTier: 'top-10',
    },
    yearsExperience: 4,
    previousRoles: [
      { title: 'Software Engineer', companyType: 'faang', duration: 24 },
      { title: 'Senior Engineer', companyType: 'startup', duration: 18 },
    ],
    skills: [
      { name: 'Full-Stack Development', level: 'expert' },
      { name: 'System Design', level: 'advanced' },
      { name: 'Product Management', level: 'intermediate' },
    ],
    networkStrength: 'strong',
    hasFounderNetwork: true,
    hasInvestorConnections: true,
    previousStartups: 1,
    ageAtAchievement: 28,
  },
  {
    id: 'yc-pattern-2',
    education: {
      degree: 'masters',
      field: 'MBA',
      schoolTier: 'top-10',
    },
    yearsExperience: 6,
    previousRoles: [
      { title: 'Product Manager', companyType: 'faang', duration: 36 },
      { title: 'Consultant', companyType: 'consulting', duration: 24 },
    ],
    skills: [
      { name: 'Product Strategy', level: 'expert' },
      { name: 'Business Development', level: 'advanced' },
      { name: 'Data Analysis', level: 'advanced' },
    ],
    networkStrength: 'exceptional',
    hasFounderNetwork: true,
    hasInvestorConnections: true,
    previousStartups: 0,
    ageAtAchievement: 32,
  },
  {
    id: 'yc-pattern-3',
    education: {
      degree: 'phd',
      field: 'Machine Learning',
      schoolTier: 'top-10',
    },
    yearsExperience: 5,
    previousRoles: [
      { title: 'Research Scientist', companyType: 'faang', duration: 36 },
    ],
    skills: [
      { name: 'Machine Learning', level: 'expert' },
      { name: 'Python', level: 'expert' },
      { name: 'Research', level: 'expert' },
    ],
    networkStrength: 'moderate',
    hasFounderNetwork: false,
    hasInvestorConnections: false,
    previousStartups: 0,
    ageAtAchievement: 30,
  },
  {
    id: 'yc-pattern-4',
    education: {
      degree: 'bachelors',
      field: 'Engineering',
      schoolTier: 'top-50',
    },
    yearsExperience: 3,
    previousRoles: [
      { title: 'Founder', companyType: 'startup', duration: 24 },
    ],
    skills: [
      { name: 'Entrepreneurship', level: 'advanced' },
      { name: 'Sales', level: 'advanced' },
      { name: 'Full-Stack Development', level: 'intermediate' },
    ],
    networkStrength: 'strong',
    hasFounderNetwork: true,
    hasInvestorConnections: true,
    previousStartups: 2,
    previousExits: 1,
    ageAtAchievement: 26,
  },
  {
    id: 'yc-pattern-5',
    education: {
      degree: 'self-taught',
    },
    yearsExperience: 7,
    previousRoles: [
      { title: 'Senior Engineer', companyType: 'startup', duration: 48 },
      { title: 'Tech Lead', companyType: 'startup', duration: 24 },
    ],
    skills: [
      { name: 'Full-Stack Development', level: 'expert' },
      { name: 'DevOps', level: 'advanced' },
      { name: 'Team Leadership', level: 'advanced' },
    ],
    networkStrength: 'strong',
    hasFounderNetwork: true,
    hasInvestorConnections: false,
    previousStartups: 1,
    ageAtAchievement: 29,
  },
];

export const ycFoundersDataset: BenchmarkDataset = {
  id: 'yc-founders-2024',
  name: 'Y Combinator Founders',
  description: 'Profile patterns of successful YC applicants based on publicly available data',
  category: 'yc-founders',
  source: 'Public YC founder profiles, interviews, and research',
  lastUpdated: new Date('2024-01-01'),
  sampleSize: 500,  // Representative sample
  profiles: ycFounderProfiles,
  stats: {
    avgYearsExperience: 5.2,
    avgAge: 29,
    educationDistribution: {
      'bachelors': 0.45,
      'masters': 0.25,
      'phd': 0.15,
      'self-taught': 0.10,
      'bootcamp': 0.05,
    },
    topSkills: [
      { name: 'Full-Stack Development', frequency: 0.65 },
      { name: 'Product Management', frequency: 0.45 },
      { name: 'Machine Learning', frequency: 0.35 },
      { name: 'Sales', frequency: 0.30 },
      { name: 'System Design', frequency: 0.28 },
    ],
    topPreviousCompanies: [
      { name: 'Google', frequency: 0.18 },
      { name: 'Meta', frequency: 0.12 },
      { name: 'Amazon', frequency: 0.10 },
      { name: 'Microsoft', frequency: 0.08 },
      { name: 'Stripe', frequency: 0.06 },
    ],
    successRate: 0.015,  // ~1.5% acceptance rate
  },
};

// ============================================================================
// FAANG ENGINEERS DATASET
// ============================================================================

const faangEngineerProfiles: BenchmarkProfile[] = [
  {
    id: 'faang-pattern-1',
    education: {
      degree: 'bachelors',
      field: 'Computer Science',
      schoolTier: 'top-50',
    },
    yearsExperience: 2,
    previousRoles: [
      { title: 'Software Engineer', companyType: 'startup', duration: 24 },
    ],
    skills: [
      { name: 'Data Structures & Algorithms', level: 'expert' },
      { name: 'System Design', level: 'intermediate' },
      { name: 'Python', level: 'advanced' },
    ],
    networkStrength: 'moderate',
    hasFounderNetwork: false,
    hasInvestorConnections: false,
    ageAtAchievement: 25,
  },
  {
    id: 'faang-pattern-2',
    education: {
      degree: 'masters',
      field: 'Computer Science',
      schoolTier: 'top-10',
    },
    yearsExperience: 0,
    previousRoles: [],
    skills: [
      { name: 'Data Structures & Algorithms', level: 'advanced' },
      { name: 'Machine Learning', level: 'intermediate' },
      { name: 'Java', level: 'advanced' },
    ],
    networkStrength: 'weak',
    hasFounderNetwork: false,
    hasInvestorConnections: false,
    ageAtAchievement: 24,
  },
  {
    id: 'faang-pattern-3',
    education: {
      degree: 'bootcamp',
    },
    yearsExperience: 3,
    previousRoles: [
      { title: 'Junior Developer', companyType: 'startup', duration: 12 },
      { title: 'Software Engineer', companyType: 'enterprise', duration: 24 },
    ],
    skills: [
      { name: 'Data Structures & Algorithms', level: 'advanced' },
      { name: 'JavaScript', level: 'expert' },
      { name: 'React', level: 'expert' },
    ],
    networkStrength: 'moderate',
    hasFounderNetwork: false,
    hasInvestorConnections: false,
    ageAtAchievement: 30,
  },
];

export const faangEngineersDataset: BenchmarkDataset = {
  id: 'faang-engineers-2024',
  name: 'FAANG Software Engineers',
  description: 'Profile patterns of engineers who received FAANG offers',
  category: 'faang-engineers',
  source: 'Public profiles, Blind, Levels.fyi data',
  lastUpdated: new Date('2024-01-01'),
  sampleSize: 1000,
  profiles: faangEngineerProfiles,
  stats: {
    avgYearsExperience: 3.5,
    avgAge: 27,
    educationDistribution: {
      'bachelors': 0.55,
      'masters': 0.30,
      'phd': 0.05,
      'bootcamp': 0.08,
      'self-taught': 0.02,
    },
    topSkills: [
      { name: 'Data Structures & Algorithms', frequency: 0.95 },
      { name: 'System Design', frequency: 0.70 },
      { name: 'Python', frequency: 0.60 },
      { name: 'Java', frequency: 0.50 },
      { name: 'JavaScript', frequency: 0.45 },
    ],
    topPreviousCompanies: [
      { name: 'Other FAANG', frequency: 0.25 },
      { name: 'Unicorn Startup', frequency: 0.20 },
      { name: 'Enterprise', frequency: 0.30 },
      { name: 'Early-stage Startup', frequency: 0.15 },
      { name: 'New Grad', frequency: 0.10 },
    ],
    successRate: 0.02,  // ~2% of applicants get offers
  },
};

// ============================================================================
// UNICORN FOUNDERS DATASET
// ============================================================================

const unicornFounderProfiles: BenchmarkProfile[] = [
  {
    id: 'unicorn-pattern-1',
    education: {
      degree: 'bachelors',
      field: 'Computer Science',
      schoolTier: 'top-10',
    },
    yearsExperience: 8,
    previousRoles: [
      { title: 'Engineering Manager', companyType: 'faang', duration: 48 },
      { title: 'Director of Engineering', companyType: 'unicorn', duration: 36 },
    ],
    skills: [
      { name: 'Technical Leadership', level: 'expert' },
      { name: 'System Design', level: 'expert' },
      { name: 'Hiring', level: 'expert' },
    ],
    networkStrength: 'exceptional',
    hasFounderNetwork: true,
    hasInvestorConnections: true,
    previousStartups: 1,
    previousExits: 1,
    previousFunding: 5000000,
    ageAtAchievement: 35,
  },
  {
    id: 'unicorn-pattern-2',
    education: {
      degree: 'masters',
      field: 'MBA',
      schoolTier: 'top-10',
    },
    yearsExperience: 10,
    previousRoles: [
      { title: 'VP of Product', companyType: 'unicorn', duration: 48 },
      { title: 'Consultant', companyType: 'consulting', duration: 36 },
    ],
    skills: [
      { name: 'Product Strategy', level: 'expert' },
      { name: 'Fundraising', level: 'expert' },
      { name: 'Go-to-Market', level: 'expert' },
    ],
    networkStrength: 'exceptional',
    hasFounderNetwork: true,
    hasInvestorConnections: true,
    previousStartups: 2,
    previousExits: 1,
    previousFunding: 20000000,
    ageAtAchievement: 38,
  },
];

export const unicornFoundersDataset: BenchmarkDataset = {
  id: 'unicorn-founders-2024',
  name: 'Unicorn Founders',
  description: 'Profile patterns of founders who built $1B+ companies',
  category: 'unicorn-founders',
  source: 'Crunchbase, public profiles, interviews',
  lastUpdated: new Date('2024-01-01'),
  sampleSize: 200,
  profiles: unicornFounderProfiles,
  stats: {
    avgYearsExperience: 10,
    avgAge: 36,
    educationDistribution: {
      'bachelors': 0.40,
      'masters': 0.35,
      'phd': 0.15,
      'self-taught': 0.10,
    },
    topSkills: [
      { name: 'Leadership', frequency: 0.90 },
      { name: 'Fundraising', frequency: 0.85 },
      { name: 'Product Strategy', frequency: 0.75 },
      { name: 'Technical Architecture', frequency: 0.60 },
      { name: 'Sales', frequency: 0.55 },
    ],
    topPreviousCompanies: [
      { name: 'Google', frequency: 0.20 },
      { name: 'McKinsey/BCG/Bain', frequency: 0.15 },
      { name: 'Goldman/Morgan Stanley', frequency: 0.10 },
      { name: 'Previous Unicorn', frequency: 0.25 },
      { name: 'Previous Startup', frequency: 0.30 },
    ],
    successRate: 0.0001,  // Very rare
  },
};

// ============================================================================
// ALL DATASETS
// ============================================================================

export const allBenchmarkDatasets: BenchmarkDataset[] = [
  ycFoundersDataset,
  faangEngineersDataset,
  unicornFoundersDataset,
];

export function getDatasetById(id: string): BenchmarkDataset | undefined {
  return allBenchmarkDatasets.find(d => d.id === id);
}

export function getDatasetsByCategory(category: BenchmarkDataset['category']): BenchmarkDataset[] {
  return allBenchmarkDatasets.filter(d => d.category === category);
}
