/**
 * Timeline Integration
 * 
 * Functions for building chronological timelines from knowledge graph entities,
 * mapping events to decision tree nodes, and calculating "life chapters".
 */

import {
  PersonalKnowledge,
  Skill,
  Project,
  Goal,
  Decision,
  Person,
  Company,
  TimelineEvent,
  Interest,
  EntityType,
} from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface TimelineEntry {
  id: string;
  entityId: string;
  entityType: EntityType;
  date: Date;
  endDate?: Date;
  label: string;
  description?: string;
  impact?: 'high' | 'medium' | 'low';
  category?: string;
}

export interface LifeChapter {
  id: string;
  name: string;
  startDate: Date;
  endDate?: Date;
  description: string;
  dominantThemes: string[];
  keyEntities: {
    type: EntityType;
    id: string;
    label: string;
  }[];
  significance: 'major' | 'moderate' | 'minor';
}

export interface TimelineStats {
  earliestDate?: Date;
  latestDate?: Date;
  totalEvents: number;
  eventsByType: Record<EntityType, number>;
  eventsByYear: Map<number, number>;
}

// ============================================================================
// TIMELINE BUILDER
// ============================================================================

/**
 * Builds a chronological timeline from all entities with dates
 */
export function buildTimeline(knowledge: PersonalKnowledge): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  
  // Add skills with acquired dates
  for (const skill of knowledge.skills) {
    if (skill.acquiredDate) {
      entries.push({
        id: `timeline-skill-${skill.id}`,
        entityId: skill.id,
        entityType: 'skill',
        date: new Date(skill.acquiredDate),
        label: `Learned ${skill.name}`,
        description: `Acquired ${skill.name} skill (${skill.level})`,
        category: skill.category,
      });
    }
  }
  
  // Add projects with start/end dates
  for (const project of knowledge.projects) {
    if (project.startDate) {
      entries.push({
        id: `timeline-project-start-${project.id}`,
        entityId: project.id,
        entityType: 'project',
        date: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : undefined,
        label: `Started ${project.name}`,
        description: project.description,
      });
    }
    if (project.endDate && project.status === 'completed') {
      entries.push({
        id: `timeline-project-end-${project.id}`,
        entityId: project.id,
        entityType: 'project',
        date: new Date(project.endDate),
        label: `Completed ${project.name}`,
        description: `Finished project: ${project.name}`,
      });
    }
  }
  
  // Add goals with target dates
  for (const goal of knowledge.goals) {
    if (goal.targetDate) {
      entries.push({
        id: `timeline-goal-${goal.id}`,
        entityId: goal.id,
        entityType: 'goal',
        date: new Date(goal.targetDate),
        label: `Goal target: ${goal.description.slice(0, 50)}`,
        description: goal.description,
        category: goal.type,
      });
    }
    if (goal.status === 'achieved' && goal.createdAt) {
      entries.push({
        id: `timeline-goal-achieved-${goal.id}`,
        entityId: goal.id,
        entityType: 'goal',
        date: new Date(goal.createdAt),
        label: `Achieved: ${goal.description.slice(0, 50)}`,
        description: goal.description,
        impact: 'high',
      });
    }
  }
  
  // Add decisions with dates
  for (const decision of knowledge.decisions) {
    if (decision.date) {
      entries.push({
        id: `timeline-decision-${decision.id}`,
        entityId: decision.id,
        entityType: 'decision',
        date: new Date(decision.date),
        label: `Decision: ${decision.description.slice(0, 50)}`,
        description: decision.context,
        impact: decision.impact,
        category: decision.category,
      });
    }
    if (decision.consequenceDate) {
      entries.push({
        id: `timeline-decision-consequence-${decision.id}`,
        entityId: decision.id,
        entityType: 'decision',
        date: new Date(decision.consequenceDate),
        label: `Outcome: ${decision.outcome?.slice(0, 50) || decision.description.slice(0, 50)}`,
        description: decision.outcome,
        impact: decision.impact,
      });
    }
  }
  
  // Add people with first met dates
  for (const person of knowledge.people) {
    if (person.firstMetDate) {
      entries.push({
        id: `timeline-person-${person.id}`,
        entityId: person.id,
        entityType: 'person',
        date: new Date(person.firstMetDate),
        label: `Met ${person.name}`,
        description: person.context,
        category: person.relationship,
      });
    }
  }
  
  // Add companies with start/end dates
  for (const company of knowledge.companies) {
    if (company.startDate) {
      entries.push({
        id: `timeline-company-start-${company.id}`,
        entityId: company.id,
        entityType: 'company',
        date: new Date(company.startDate),
        endDate: company.endDate ? new Date(company.endDate) : undefined,
        label: `Joined ${company.name}`,
        description: company.role ? `Role: ${company.role}` : undefined,
        category: company.relationship,
      });
    }
    if (company.endDate) {
      entries.push({
        id: `timeline-company-end-${company.id}`,
        entityId: company.id,
        entityType: 'company',
        date: new Date(company.endDate),
        label: `Left ${company.name}`,
        description: company.role ? `Ended role: ${company.role}` : undefined,
      });
    }
  }
  
  // Add timeline events
  for (const event of knowledge.events) {
    if (event.date) {
      entries.push({
        id: `timeline-event-${event.id}`,
        entityId: event.id,
        entityType: 'event',
        date: new Date(event.date),
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        label: event.description.slice(0, 50),
        description: event.description,
        impact: event.impact,
        category: event.type,
      });
    }
  }
  
  // Add interests with started dates
  for (const interest of knowledge.interests) {
    if (interest.startedDate) {
      entries.push({
        id: `timeline-interest-${interest.id}`,
        entityId: interest.id,
        entityType: 'interest',
        date: new Date(interest.startedDate),
        label: `Started interest: ${interest.topic}`,
        description: interest.evidence.join(', '),
        category: interest.depth,
      });
    }
  }
  
  // Sort by date (oldest first)
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return entries;
}

// ============================================================================
// LIFE CHAPTERS
// ============================================================================

/**
 * Calculates "life chapters" based on temporal clustering of events
 */
export function calculateLifeChapters(
  knowledge: PersonalKnowledge,
  minChapterDurationMonths: number = 6
): LifeChapter[] {
  const timeline = buildTimeline(knowledge);
  
  if (timeline.length === 0) {
    return [];
  }
  
  const chapters: LifeChapter[] = [];
  const minDurationMs = minChapterDurationMonths * 30 * 24 * 60 * 60 * 1000;
  
  // Group events by year for initial clustering
  const eventsByYear = new Map<number, TimelineEntry[]>();
  for (const entry of timeline) {
    const year = entry.date.getFullYear();
    const existing = eventsByYear.get(year) || [];
    existing.push(entry);
    eventsByYear.set(year, existing);
  }
  
  // Create chapters from year clusters
  const sortedYears = Array.from(eventsByYear.keys()).sort();
  let currentChapter: {
    startYear: number;
    endYear: number;
    entries: TimelineEntry[];
  } | null = null;
  
  for (const year of sortedYears) {
    const yearEntries = eventsByYear.get(year) || [];
    
    if (!currentChapter) {
      currentChapter = {
        startYear: year,
        endYear: year,
        entries: yearEntries,
      };
    } else {
      // Check if this year should be part of current chapter or start a new one
      const gapYears = year - currentChapter.endYear;
      
      if (gapYears <= 1) {
        // Continue current chapter
        currentChapter.endYear = year;
        currentChapter.entries.push(...yearEntries);
      } else {
        // Finalize current chapter and start new one
        chapters.push(createChapterFromCluster(currentChapter, knowledge));
        currentChapter = {
          startYear: year,
          endYear: year,
          entries: yearEntries,
        };
      }
    }
  }
  
  // Finalize last chapter
  if (currentChapter) {
    chapters.push(createChapterFromCluster(currentChapter, knowledge));
  }
  
  return chapters;
}

function createChapterFromCluster(
  cluster: { startYear: number; endYear: number; entries: TimelineEntry[] },
  knowledge: PersonalKnowledge
): LifeChapter {
  // Analyze dominant themes
  const typeCounts = new Map<EntityType, number>();
  const categoryCounts = new Map<string, number>();
  
  for (const entry of cluster.entries) {
    typeCounts.set(entry.entityType, (typeCounts.get(entry.entityType) || 0) + 1);
    if (entry.category) {
      categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
    }
  }
  
  // Get top themes
  const sortedTypes = Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);
  
  const sortedCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => cat);
  
  // Generate chapter name based on dominant themes
  const chapterName = generateChapterName(sortedTypes, sortedCategories, cluster.startYear, cluster.endYear);
  
  // Get key entities (high impact or most connected)
  const keyEntities = cluster.entries
    .filter(e => e.impact === 'high')
    .slice(0, 5)
    .map(e => ({
      type: e.entityType,
      id: e.entityId,
      label: e.label,
    }));
  
  // Determine significance based on number of high-impact events
  const highImpactCount = cluster.entries.filter(e => e.impact === 'high').length;
  const significance: LifeChapter['significance'] = 
    highImpactCount >= 3 ? 'major' : 
    highImpactCount >= 1 ? 'moderate' : 'minor';
  
  return {
    id: `chapter-${cluster.startYear}-${cluster.endYear}`,
    name: chapterName,
    startDate: new Date(cluster.startYear, 0, 1),
    endDate: new Date(cluster.endYear, 11, 31),
    description: `${cluster.entries.length} events from ${cluster.startYear} to ${cluster.endYear}`,
    dominantThemes: [...sortedTypes, ...sortedCategories],
    keyEntities,
    significance,
  };
}

function generateChapterName(
  types: EntityType[],
  categories: string[],
  startYear: number,
  endYear: number
): string {
  const yearRange = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
  
  // Generate descriptive name based on dominant themes
  if (types.includes('company') && categories.includes('employer')) {
    return `Career Chapter (${yearRange})`;
  }
  if (types.includes('project') && types.includes('skill')) {
    return `Growth & Building (${yearRange})`;
  }
  if (types.includes('decision') && types.includes('event')) {
    return `Transitions (${yearRange})`;
  }
  if (types.includes('goal')) {
    return `Aspirations (${yearRange})`;
  }
  if (types.includes('person')) {
    return `Connections (${yearRange})`;
  }
  
  return `Life Chapter (${yearRange})`;
}

// ============================================================================
// TIMELINE STATISTICS
// ============================================================================

/**
 * Calculates statistics about the timeline
 */
export function getTimelineStats(knowledge: PersonalKnowledge): TimelineStats {
  const timeline = buildTimeline(knowledge);
  
  if (timeline.length === 0) {
    return {
      totalEvents: 0,
      eventsByType: {
        skill: 0,
        project: 0,
        goal: 0,
        decision: 0,
        person: 0,
        company: 0,
        event: 0,
        interest: 0,
      },
      eventsByYear: new Map(),
    };
  }
  
  const eventsByType: Record<EntityType, number> = {
    skill: 0,
    project: 0,
    goal: 0,
    decision: 0,
    person: 0,
    company: 0,
    event: 0,
    interest: 0,
  };
  
  const eventsByYear = new Map<number, number>();
  let earliestDate: Date | undefined;
  let latestDate: Date | undefined;
  
  for (const entry of timeline) {
    // Count by type
    eventsByType[entry.entityType]++;
    
    // Count by year
    const year = entry.date.getFullYear();
    eventsByYear.set(year, (eventsByYear.get(year) || 0) + 1);
    
    // Track date range
    if (!earliestDate || entry.date < earliestDate) {
      earliestDate = entry.date;
    }
    if (!latestDate || entry.date > latestDate) {
      latestDate = entry.date;
    }
  }
  
  return {
    earliestDate,
    latestDate,
    totalEvents: timeline.length,
    eventsByType,
    eventsByYear,
  };
}

// ============================================================================
// DECISION TREE MAPPING
// ============================================================================

/**
 * Maps timeline events to potential decision tree nodes
 * This helps connect the knowledge graph to the decision engine
 */
export function mapToDecisionPoints(knowledge: PersonalKnowledge): {
  pastDecisions: Decision[];
  upcomingGoals: Goal[];
  activeProjects: Project[];
} {
  const now = new Date();
  
  // Get past decisions sorted by date
  const pastDecisions = knowledge.decisions
    .filter(d => d.date && new Date(d.date) <= now)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  
  // Get upcoming goals with target dates
  const upcomingGoals = knowledge.goals
    .filter(g => g.status === 'active' && g.targetDate && new Date(g.targetDate) > now)
    .sort((a, b) => {
      const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return dateA - dateB; // Soonest first
    });
  
  // Get active projects
  const activeProjects = knowledge.projects
    .filter(p => p.status === 'in-progress')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA; // Most recently started first
    });
  
  return {
    pastDecisions,
    upcomingGoals,
    activeProjects,
  };
}
