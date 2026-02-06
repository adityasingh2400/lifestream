/**
 * Knowledge Graph Types
 * 
 * Type definitions for the personal knowledge graph.
 */

// ============================================================================
// SUB-CATEGORY TYPE (for hierarchical grouping)
// ============================================================================

export interface SubCategory {
  id: string;
  name: string;
  parentCategory: EntityType;  // e.g., 'skill', 'project', etc.
  description?: string;
  color?: string;              // Optional custom color for visualization
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROFICIENCY HISTORY (for tracking skill growth over time)
// ============================================================================

export interface ProficiencyEntry {
  date: Date;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  note?: string;
}

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: 'technical' | 'soft' | 'domain' | 'language';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  evidence: string[];
  acquiredDate?: Date;          // When skill was first learned
  lastUsed?: Date;
  proficiencyHistory?: ProficiencyEntry[];  // Track skill growth over time
  relatedProjects: string[];  // Project IDs
  relatedSkills: string[];    // Skill IDs
  sources: string[];          // Source IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'idea' | 'in-progress' | 'completed' | 'abandoned';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  technologies: string[];
  outcomes: string[];
  learnings: string[];
  startDate?: Date;
  endDate?: Date;
  timeframe?: string;
  relatedSkills: string[];    // Skill IDs
  relatedPeople: string[];    // Person IDs
  relatedCompanies: string[]; // Company IDs
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  description: string;
  type: 'career' | 'financial' | 'personal' | 'learning' | 'health';
  timeframe: 'short-term' | 'medium-term' | 'long-term';
  status: 'active' | 'achieved' | 'abandoned' | 'paused';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  targetDate?: Date;            // When goal should be achieved
  progress?: string;
  milestones: string[];
  blockers: string[];
  relatedSkills: string[];
  relatedProjects: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Decision {
  id: string;
  description: string;
  date?: Date;
  context: string;
  choice?: string;
  outcome?: string;
  reflection?: string;
  category: 'career' | 'education' | 'financial' | 'personal' | 'technical';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  impact: 'high' | 'medium' | 'low';
  consequenceDate?: Date;       // When outcome was realized
  relatedGoals: string[];
  relatedProjects: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: string;
  name: string;
  relationship: 'colleague' | 'mentor' | 'friend' | 'family' | 'professional-contact' | 'other';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  context: string;
  company?: string;
  role?: string;
  firstMetDate?: Date;          // When first met this person
  interactions: string[];     // Brief notes about interactions
  relatedProjects: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  relationship: 'employer' | 'client' | 'partner' | 'target' | 'competitor' | 'other';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  role?: string;
  startDate?: Date;
  endDate?: Date;
  timeframe?: string;
  description?: string;
  relatedPeople: string[];
  relatedProjects: string[];
  relatedSkills: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimelineEvent {
  id: string;
  description: string;
  date?: Date;
  endDate?: Date;               // For events that span a period
  type: 'milestone' | 'achievement' | 'setback' | 'transition' | 'learning';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  impact: 'high' | 'medium' | 'low';
  relatedEntities: {
    type: 'skill' | 'project' | 'goal' | 'decision' | 'person' | 'company';
    id: string;
  }[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Interest {
  id: string;
  topic: string;
  depth: 'casual' | 'moderate' | 'deep';
  subCategory?: string;         // SubCategory ID for hierarchical grouping
  startedDate?: Date;           // When interest began
  evidence: string[];
  relatedSkills: string[];
  sources: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CONTENT CHUNK (for semantic search)
// ============================================================================

export interface ContentChunk {
  id: string;
  text: string;
  source: {
    type: 'notion' | 'chatgpt' | 'document';
    filename: string;
    path?: string;
  };
  embedding?: number[];       // Vector embedding for semantic search
  entities: {
    type: string;
    id: string;
  }[];
  createdAt: Date;
}

// ============================================================================
// DATA SOURCE
// ============================================================================

export interface DataSource {
  id: string;
  type: 'notion' | 'chatgpt' | 'document';
  filename: string;
  uploadedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  stats: {
    totalChunks: number;
    entitiesExtracted: number;
  };
}

// ============================================================================
// PROFILE
// ============================================================================

export interface Profile {
  id: string;
  name: string;
  currentRole?: string;
  location?: string;
  age?: number;
  bio?: string;
  updatedAt: Date;
}

// ============================================================================
// PERSONAL KNOWLEDGE (aggregate)
// ============================================================================

export interface PersonalKnowledge {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  goals: Goal[];
  decisions: Decision[];
  people: Person[];
  companies: Company[];
  events: TimelineEvent[];
  interests: Interest[];
  subCategories: SubCategory[];  // Hierarchical grouping buckets
  chunks: ContentChunk[];
  sources: DataSource[];
  lastUpdated: Date;
}

// ============================================================================
// GRAPH TYPES (for visualization)
// ============================================================================

export type EntityType = 'skill' | 'project' | 'goal' | 'decision' | 'person' | 'company' | 'event' | 'interest';

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  data: Skill | Project | Goal | Decision | Person | Company | TimelineEvent | Interest;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;       // e.g., 'uses', 'knows', 'worked-at', 'led-to'
  weight?: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
