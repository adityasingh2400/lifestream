/**
 * Content Processing Service
 * 
 * Simplified single-pass processing that sends full document to LLM
 * and processes relationship mappings.
 */

import { parseNotionExport, extractAllText as extractNotionText } from '@/lib/parsers/notion';
import { parseChatGPTExport, extractAllText as extractChatGPTText } from '@/lib/parsers/chatgpt';
import { parseDocument } from '@/lib/parsers/documents';
import { knowledgeStore, generateId } from '@/lib/knowledge/store';
import { 
  Skill, 
  Project, 
  Goal, 
  Decision, 
  Person, 
  Company, 
  TimelineEvent, 
  Interest,
  DataSource,
  Profile,
} from '@/lib/knowledge/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessingResult {
  success: boolean;
  sourceId: string;
  stats: {
    entitiesExtracted: {
      skills: number;
      projects: number;
      goals: number;
      decisions: number;
      people: number;
      companies: number;
      events: number;
      interests: number;
      relationships: number;
    };
  };
  errors: string[];
}

export interface ProcessingProgress {
  stage: 'parsing' | 'extracting' | 'storing' | 'complete' | 'error';
  progress: number;
  message: string;
}

type ProgressCallback = (progress: ProcessingProgress) => void;

// ============================================================================
// CONSTANTS - Increased limits for large documents
// ============================================================================

const MAX_CONTENT_LENGTH = 500000; // 500KB of text content
const MIN_CONTENT_LENGTH = 20;

// ============================================================================
// ENTITY EXTRACTION (Single Pass)
// ============================================================================

interface ExtractedRelationship {
  from: string;
  to: string;
  type: string;
  context?: string;
}

interface ExtractedEntities {
  profile: {
    name: string;
    currentRole?: string;
    location?: string;
    age?: number;
    summary: string;
    coreIdentity: string[];
  };
  skills: { id: string; name: string; level: string; category: string; evidence: string; yearsOfExperience?: number; acquiredDate?: string; confidence?: number }[];
  projects: { id: string; name: string; description: string; status: string; technologies: string[]; outcomes: string[]; timeframe?: string; startDate?: string; endDate?: string; role?: string; impact?: string; confidence?: number }[];
  goals: { id: string; description: string; type: string; timeframe: string; targetDate?: string; motivation?: string; progress?: string; confidence?: number }[];
  decisions: { id: string; description: string; date?: string; context: string; outcome?: string; consequenceDate?: string; category: string; impact: string; lessonsLearned?: string; confidence?: number }[];
  people: { id: string; name: string; relationship: string; context: string; firstMetDate?: string; influence?: string; confidence?: number }[];
  companies: { id: string; name: string; relationship: string; role?: string; timeframe?: string; startDate?: string; endDate?: string; achievements?: string[]; confidence?: number }[];
  events: { id: string; description: string; date?: string; endDate?: string; type: string; impact: string; significance: string; confidence?: number }[];
  interests: { id: string; topic: string; depth: string; startedDate?: string; evidence: string; relatedTo?: string; confidence?: number }[];
  relationships: ExtractedRelationship[];
}

// ============================================================================
// ENTITY VALIDATION
// ============================================================================

const MIN_CONFIDENCE = 0.7;
const MIN_NAME_LENGTH = 3;

/**
 * Validates and filters entities based on quality rules
 */
function validateEntities(entities: ExtractedEntities): ExtractedEntities {
  return {
    profile: entities.profile,
    skills: entities.skills.filter(s => validateSkill(s)),
    projects: entities.projects.filter(p => validateProject(p)),
    goals: entities.goals.filter(g => validateGoal(g)),
    decisions: entities.decisions.filter(d => validateDecision(d)),
    people: entities.people.filter(p => validatePerson(p)),
    companies: entities.companies.filter(c => validateCompany(c)),
    events: entities.events.filter(e => validateEvent(e)),
    interests: entities.interests.filter(i => validateInterest(i)),
    relationships: entities.relationships,
  };
}

function validateSkill(skill: ExtractedEntities['skills'][0]): boolean {
  // Check confidence threshold
  if (skill.confidence !== undefined && skill.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered skill "${skill.name}" - low confidence: ${skill.confidence}`);
    return false;
  }
  
  // Check name length
  if (!skill.name || skill.name.trim().length < MIN_NAME_LENGTH) {
    console.log(`Filtered skill "${skill.name}" - name too short`);
    return false;
  }
  
  // Check for incomplete/fragment names
  if (isIncompleteFragment(skill.name)) {
    console.log(`Filtered skill "${skill.name}" - appears to be incomplete fragment`);
    return false;
  }
  
  // Check for evidence
  if (!skill.evidence || skill.evidence.trim().length < 10) {
    console.log(`Filtered skill "${skill.name}" - insufficient evidence`);
    return false;
  }
  
  return true;
}

function validateProject(project: ExtractedEntities['projects'][0]): boolean {
  if (project.confidence !== undefined && project.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered project "${project.name}" - low confidence: ${project.confidence}`);
    return false;
  }
  
  if (!project.name || project.name.trim().length < MIN_NAME_LENGTH) {
    console.log(`Filtered project "${project.name}" - name too short`);
    return false;
  }
  
  if (isIncompleteFragment(project.name)) {
    console.log(`Filtered project "${project.name}" - appears to be incomplete fragment`);
    return false;
  }
  
  if (!project.description || project.description.trim().length < 10) {
    console.log(`Filtered project "${project.name}" - insufficient description`);
    return false;
  }
  
  return true;
}

function validateGoal(goal: ExtractedEntities['goals'][0]): boolean {
  if (goal.confidence !== undefined && goal.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered goal "${goal.description?.slice(0, 30)}" - low confidence: ${goal.confidence}`);
    return false;
  }
  
  if (!goal.description || goal.description.trim().length < 10) {
    console.log(`Filtered goal - description too short`);
    return false;
  }
  
  if (isIncompleteFragment(goal.description)) {
    console.log(`Filtered goal "${goal.description?.slice(0, 30)}" - appears to be incomplete fragment`);
    return false;
  }
  
  return true;
}

function validateDecision(decision: ExtractedEntities['decisions'][0]): boolean {
  if (decision.confidence !== undefined && decision.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered decision "${decision.description?.slice(0, 30)}" - low confidence: ${decision.confidence}`);
    return false;
  }
  
  if (!decision.description || decision.description.trim().length < 10) {
    console.log(`Filtered decision - description too short`);
    return false;
  }
  
  if (!decision.context || decision.context.trim().length < 5) {
    console.log(`Filtered decision "${decision.description?.slice(0, 30)}" - insufficient context`);
    return false;
  }
  
  return true;
}

function validatePerson(person: ExtractedEntities['people'][0]): boolean {
  if (person.confidence !== undefined && person.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered person "${person.name}" - low confidence: ${person.confidence}`);
    return false;
  }
  
  if (!person.name || person.name.trim().length < MIN_NAME_LENGTH) {
    console.log(`Filtered person "${person.name}" - name too short`);
    return false;
  }
  
  // Check for generic/placeholder names
  const genericNames = ['someone', 'a person', 'they', 'them', 'user', 'unknown'];
  if (genericNames.includes(person.name.toLowerCase().trim())) {
    console.log(`Filtered person "${person.name}" - generic/placeholder name`);
    return false;
  }
  
  if (!person.context || person.context.trim().length < 5) {
    console.log(`Filtered person "${person.name}" - insufficient context`);
    return false;
  }
  
  return true;
}

function validateCompany(company: ExtractedEntities['companies'][0]): boolean {
  if (company.confidence !== undefined && company.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered company "${company.name}" - low confidence: ${company.confidence}`);
    return false;
  }
  
  if (!company.name || company.name.trim().length < MIN_NAME_LENGTH) {
    console.log(`Filtered company "${company.name}" - name too short`);
    return false;
  }
  
  if (isIncompleteFragment(company.name)) {
    console.log(`Filtered company "${company.name}" - appears to be incomplete fragment`);
    return false;
  }
  
  return true;
}

function validateEvent(event: ExtractedEntities['events'][0]): boolean {
  if (event.confidence !== undefined && event.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered event "${event.description?.slice(0, 30)}" - low confidence: ${event.confidence}`);
    return false;
  }
  
  if (!event.description || event.description.trim().length < 10) {
    console.log(`Filtered event - description too short`);
    return false;
  }
  
  if (!event.significance || event.significance.trim().length < 5) {
    console.log(`Filtered event "${event.description?.slice(0, 30)}" - insufficient significance`);
    return false;
  }
  
  return true;
}

function validateInterest(interest: ExtractedEntities['interests'][0]): boolean {
  if (interest.confidence !== undefined && interest.confidence < MIN_CONFIDENCE) {
    console.log(`Filtered interest "${interest.topic}" - low confidence: ${interest.confidence}`);
    return false;
  }
  
  if (!interest.topic || interest.topic.trim().length < MIN_NAME_LENGTH) {
    console.log(`Filtered interest "${interest.topic}" - topic too short`);
    return false;
  }
  
  if (isIncompleteFragment(interest.topic)) {
    console.log(`Filtered interest "${interest.topic}" - appears to be incomplete fragment`);
    return false;
  }
  
  if (!interest.evidence || interest.evidence.trim().length < 5) {
    console.log(`Filtered interest "${interest.topic}" - insufficient evidence`);
    return false;
  }
  
  return true;
}

/**
 * Checks if a string appears to be an incomplete fragment
 */
function isIncompleteFragment(text: string): boolean {
  if (!text) return true;
  
  const trimmed = text.trim();
  
  // Check for strings that are just articles or prepositions
  const fragmentPatterns = [
    /^(the|a|an|of|in|on|at|to|for|with|by|from)\s*$/i,
    /^(and|or|but|so|yet|nor)\s*$/i,
    /^\.\.\./,
    /\.\.\.$/,
    /^[a-z]$/i,  // Single letter
    /^[a-z]{1,2}$/i,  // 1-2 letters only
  ];
  
  for (const pattern of fragmentPatterns) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  // Check if it ends mid-word (no space before truncation indicator)
  if (/[a-z]\.\.\.$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Deduplicates entities by normalizing and comparing names
 */
function deduplicateEntities(entities: ExtractedEntities): ExtractedEntities {
  return {
    profile: entities.profile,
    skills: deduplicateByName(entities.skills, 'name'),
    projects: deduplicateByName(entities.projects, 'name'),
    goals: deduplicateByName(entities.goals, 'description'),
    decisions: deduplicateByName(entities.decisions, 'description'),
    people: deduplicateByName(entities.people, 'name'),
    companies: deduplicateByName(entities.companies, 'name'),
    events: deduplicateByName(entities.events, 'description'),
    interests: deduplicateByName(entities.interests, 'topic'),
    relationships: entities.relationships,
  };
}

function deduplicateByName<T extends Record<string, unknown>>(items: T[], nameField: keyof T): T[] {
  const seen = new Map<string, T>();
  
  for (const item of items) {
    const name = String(item[nameField] || '');
    const normalized = normalizeName(name);
    
    if (!seen.has(normalized)) {
      seen.set(normalized, item);
    } else {
      // Keep the one with higher confidence if available
      const existing = seen.get(normalized)!;
      const existingConfidence = (existing as { confidence?: number }).confidence ?? 0.5;
      const newConfidence = (item as { confidence?: number }).confidence ?? 0.5;
      
      if (newConfidence > existingConfidence) {
        seen.set(normalized, item);
      }
    }
  }
  
  return Array.from(seen.values());
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')  // Remove non-alphanumeric
    .replace(/\s+/g, '');        // Remove spaces
}

async function extractEntities(
  content: string, 
  source: 'notion' | 'chatgpt' | 'document',
  profileName?: string
): Promise<ExtractedEntities | null> {
  try {
    // Truncate content if too long for API
    const truncatedContent = content.length > MAX_CONTENT_LENGTH 
      ? content.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to size...]'
      : content;
    
    console.log(`Sending ${truncatedContent.length} characters to extraction API`);
    
    const response = await fetch('/api/extract-entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: truncatedContent, source, profileName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Entity extraction failed:', error);
      return null;
    }
    
    const data = await response.json();
    return data.entities;
  } catch (error) {
    console.error('Entity extraction error:', error);
    return null;
  }
}

// ============================================================================
// RELATIONSHIP PROCESSING (Non-recursive)
// ============================================================================

interface EntityMaps {
  skills: Map<string, string>;
  projects: Map<string, string>;
  goals: Map<string, string>;
  decisions: Map<string, string>;
  people: Map<string, string>;
  companies: Map<string, string>;
  events: Map<string, string>;
  interests: Map<string, string>;
}

function processRelationships(
  relationships: ExtractedRelationship[],
  entityMaps: EntityMaps,
  storedEntities: {
    skills: Skill[];
    projects: Project[];
    goals: Goal[];
    decisions: Decision[];
    people: Person[];
    companies: Company[];
    events: TimelineEvent[];
    interests: Interest[];
  }
): void {
  // Process each relationship once, adding both directions
  for (const rel of relationships) {
    const fromType = rel.from.split('_')[0];
    const toType = rel.to.split('_')[0];
    
    const fromStoredId = getStoredId(rel.from, fromType, entityMaps);
    const toStoredId = getStoredId(rel.to, toType, entityMaps);
    
    if (!fromStoredId || !toStoredId) continue;
    
    // Add forward relationship
    addSingleRelationship(fromType, fromStoredId, toType, toStoredId, storedEntities);
    
    // Add reverse relationship (non-recursive)
    if (fromType !== toType) {
      addSingleRelationship(toType, toStoredId, fromType, fromStoredId, storedEntities);
    }
  }
}

function getStoredId(extractedId: string, type: string, maps: EntityMaps): string | null {
  switch (type) {
    case 'skill': return maps.skills.get(extractedId) || null;
    case 'project': return maps.projects.get(extractedId) || null;
    case 'goal': return maps.goals.get(extractedId) || null;
    case 'decision': return maps.decisions.get(extractedId) || null;
    case 'person': return maps.people.get(extractedId) || null;
    case 'company': return maps.companies.get(extractedId) || null;
    case 'event': return maps.events.get(extractedId) || null;
    case 'interest': return maps.interests.get(extractedId) || null;
    default: return null;
  }
}

// Non-recursive single relationship adder
function addSingleRelationship(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
  entities: {
    skills: Skill[];
    projects: Project[];
    goals: Goal[];
    decisions: Decision[];
    people: Person[];
    companies: Company[];
    events: TimelineEvent[];
    interests: Interest[];
  }
): void {
  switch (fromType) {
    case 'skill': {
      const skill = entities.skills.find(s => s.id === fromId);
      if (skill) {
        if (toType === 'project' && !skill.relatedProjects.includes(toId)) {
          skill.relatedProjects.push(toId);
        } else if (toType === 'skill' && fromId !== toId && !skill.relatedSkills.includes(toId)) {
          skill.relatedSkills.push(toId);
        }
      }
      break;
    }
    case 'project': {
      const project = entities.projects.find(p => p.id === fromId);
      if (project) {
        if (toType === 'skill' && !project.relatedSkills.includes(toId)) {
          project.relatedSkills.push(toId);
        } else if (toType === 'person' && !project.relatedPeople.includes(toId)) {
          project.relatedPeople.push(toId);
        } else if (toType === 'company' && !project.relatedCompanies.includes(toId)) {
          project.relatedCompanies.push(toId);
        }
      }
      break;
    }
    case 'goal': {
      const goal = entities.goals.find(g => g.id === fromId);
      if (goal) {
        if (toType === 'skill' && !goal.relatedSkills.includes(toId)) {
          goal.relatedSkills.push(toId);
        } else if (toType === 'project' && !goal.relatedProjects.includes(toId)) {
          goal.relatedProjects.push(toId);
        }
      }
      break;
    }
    case 'decision': {
      const decision = entities.decisions.find(d => d.id === fromId);
      if (decision) {
        if (toType === 'goal' && !decision.relatedGoals.includes(toId)) {
          decision.relatedGoals.push(toId);
        } else if (toType === 'project' && !decision.relatedProjects.includes(toId)) {
          decision.relatedProjects.push(toId);
        }
      }
      break;
    }
    case 'person': {
      const person = entities.people.find(p => p.id === fromId);
      if (person) {
        if (toType === 'project' && !person.relatedProjects.includes(toId)) {
          person.relatedProjects.push(toId);
        }
      }
      break;
    }
    case 'company': {
      const company = entities.companies.find(c => c.id === fromId);
      if (company) {
        if (toType === 'person' && !company.relatedPeople.includes(toId)) {
          company.relatedPeople.push(toId);
        } else if (toType === 'project' && !company.relatedProjects.includes(toId)) {
          company.relatedProjects.push(toId);
        } else if (toType === 'skill' && !company.relatedSkills.includes(toId)) {
          company.relatedSkills.push(toId);
        }
      }
      break;
    }
    case 'event': {
      const event = entities.events.find(e => e.id === fromId);
      if (event) {
        const validTypes = ['skill', 'project', 'goal', 'decision', 'person', 'company'];
        if (validTypes.includes(toType)) {
          const existing = event.relatedEntities.find(r => r.id === toId);
          if (!existing) {
            event.relatedEntities.push({ 
              type: toType as 'skill' | 'project' | 'goal' | 'decision' | 'person' | 'company', 
              id: toId 
            });
          }
        }
      }
      break;
    }
    case 'interest': {
      const interest = entities.interests.find(i => i.id === fromId);
      if (interest) {
        if (toType === 'skill' && !interest.relatedSkills.includes(toId)) {
          interest.relatedSkills.push(toId);
        }
      }
      break;
    }
  }
}

// ============================================================================
// STORAGE
// ============================================================================

async function storeEntities(
  extracted: ExtractedEntities, 
  sourceId: string
): Promise<{ entities: ReturnType<typeof createStoredEntities>; maps: EntityMaps }> {
  const now = new Date();
  const maps: EntityMaps = {
    skills: new Map(),
    projects: new Map(),
    goals: new Map(),
    decisions: new Map(),
    people: new Map(),
    companies: new Map(),
    events: new Map(),
    interests: new Map(),
  };
  
  // Validate and deduplicate entities before storing
  console.log('Validating extracted entities...');
  const validated = validateEntities(extracted);
  console.log('Deduplicating entities...');
  const deduplicated = deduplicateEntities(validated);
  
  console.log(`After validation: ${deduplicated.skills.length} skills, ${deduplicated.projects.length} projects, ${deduplicated.goals.length} goals`);
  
  // Create stored entities with new IDs
  const stored = createStoredEntities(deduplicated, sourceId, now, maps);
  
  // Process relationships to populate relatedX arrays (non-recursive)
  processRelationships(extracted.relationships || [], maps, stored);
  
  // Save profile
  const profile: Profile = {
    id: 'user-profile',
    name: extracted.profile.name,
    currentRole: extracted.profile.currentRole,
    location: extracted.profile.location,
    age: extracted.profile.age,
    bio: extracted.profile.summary,
    updatedAt: now,
  };
  await knowledgeStore.saveProfile(profile);
  
  // Save all entities
  await Promise.all([
    knowledgeStore.saveSkills(stored.skills),
    knowledgeStore.saveProjects(stored.projects),
    knowledgeStore.saveGoals(stored.goals),
    knowledgeStore.saveDecisions(stored.decisions),
    knowledgeStore.savePeople(stored.people),
    knowledgeStore.saveCompanies(stored.companies),
    knowledgeStore.saveEvents(stored.events),
    knowledgeStore.saveInterests(stored.interests),
  ]);
  
  return { entities: stored, maps };
}

function createStoredEntities(
  extracted: ExtractedEntities,
  sourceId: string,
  now: Date,
  maps: EntityMaps
) {
  // Helper to parse date strings
  const parseDate = (dateStr?: string): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  };
  
  // Skills
  const skills: Skill[] = (extracted.skills || []).map(s => {
    const id = generateId('skill');
    maps.skills.set(s.id, id);
    return {
      id,
      name: s.name,
      level: s.level as Skill['level'],
      category: s.category as Skill['category'],
      evidence: [s.evidence],
      acquiredDate: parseDate(s.acquiredDate),
      relatedProjects: [],
      relatedSkills: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Projects
  const projects: Project[] = (extracted.projects || []).map(p => {
    const id = generateId('project');
    maps.projects.set(p.id, id);
    return {
      id,
      name: p.name,
      description: p.description,
      status: p.status as Project['status'],
      technologies: p.technologies || [],
      outcomes: p.outcomes || [],
      learnings: [],
      timeframe: p.timeframe,
      startDate: parseDate(p.startDate),
      endDate: parseDate(p.endDate),
      relatedSkills: [],
      relatedPeople: [],
      relatedCompanies: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Goals
  const goals: Goal[] = (extracted.goals || []).map(g => {
    const id = generateId('goal');
    maps.goals.set(g.id, id);
    return {
      id,
      description: g.description,
      type: g.type as Goal['type'],
      timeframe: g.timeframe as Goal['timeframe'],
      status: 'active' as const,
      targetDate: parseDate(g.targetDate),
      progress: g.progress,
      milestones: [],
      blockers: [],
      relatedSkills: [],
      relatedProjects: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Decisions
  const decisions: Decision[] = (extracted.decisions || []).map(d => {
    const id = generateId('decision');
    maps.decisions.set(d.id, id);
    return {
      id,
      description: d.description,
      date: parseDate(d.date),
      context: d.context,
      outcome: d.outcome,
      consequenceDate: parseDate(d.consequenceDate),
      category: d.category as Decision['category'],
      impact: d.impact as Decision['impact'],
      relatedGoals: [],
      relatedProjects: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // People
  const people: Person[] = (extracted.people || []).map(p => {
    const id = generateId('person');
    maps.people.set(p.id, id);
    return {
      id,
      name: p.name,
      relationship: p.relationship as Person['relationship'],
      context: p.context,
      firstMetDate: parseDate(p.firstMetDate),
      interactions: [],
      relatedProjects: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Companies
  const companies: Company[] = (extracted.companies || []).map(c => {
    const id = generateId('company');
    maps.companies.set(c.id, id);
    return {
      id,
      name: c.name,
      relationship: c.relationship as Company['relationship'],
      role: c.role,
      timeframe: c.timeframe,
      startDate: parseDate(c.startDate),
      endDate: parseDate(c.endDate),
      relatedPeople: [],
      relatedProjects: [],
      relatedSkills: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Events
  const events: TimelineEvent[] = (extracted.events || []).map(e => {
    const id = generateId('event');
    maps.events.set(e.id, id);
    return {
      id,
      description: e.description,
      date: parseDate(e.date),
      endDate: parseDate(e.endDate),
      type: e.type as TimelineEvent['type'],
      impact: e.impact as TimelineEvent['impact'],
      relatedEntities: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  // Interests
  const interests: Interest[] = (extracted.interests || []).map(i => {
    const id = generateId('interest');
    maps.interests.set(i.id, id);
    return {
      id,
      topic: i.topic,
      depth: i.depth as Interest['depth'],
      startedDate: parseDate(i.startedDate),
      evidence: [i.evidence],
      relatedSkills: [],
      sources: [sourceId],
      createdAt: now,
      updatedAt: now,
    };
  });
  
  return { skills, projects, goals, decisions, people, companies, events, interests };
}

// ============================================================================
// MAIN PROCESSING FUNCTIONS
// ============================================================================

export async function processNotionExport(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessingResult> {
  const errors: string[] = [];
  const sourceId = generateId('source');
  
  try {
    const dataSource: DataSource = {
      id: sourceId,
      type: 'notion',
      filename: file.name,
      uploadedAt: new Date(),
      status: 'processing',
      stats: { totalChunks: 0, entitiesExtracted: 0 },
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'parsing', progress: 10, message: 'Parsing Notion export...' });
    const parsed = await parseNotionExport(file);
    errors.push(...parsed.parseErrors);
    
    const text = extractNotionText(parsed);
    console.log(`Extracted ${text.length} characters from Notion export`);
    
    if (text.length < MIN_CONTENT_LENGTH) {
      throw new Error('Insufficient content extracted from Notion export');
    }
    
    onProgress?.({ stage: 'extracting', progress: 30, message: 'Analyzing content with AI...' });
    const entities = await extractEntities(text, 'notion');
    
    if (!entities) {
      throw new Error('Failed to extract entities from content');
    }
    
    onProgress?.({ stage: 'storing', progress: 80, message: 'Storing knowledge graph...' });
    const { entities: stored } = await storeEntities(entities, sourceId);
    
    dataSource.status = 'completed';
    dataSource.processedAt = new Date();
    dataSource.stats = {
      totalChunks: 1,
      entitiesExtracted: 
        stored.skills.length + stored.projects.length + stored.goals.length +
        stored.decisions.length + stored.people.length + stored.companies.length +
        stored.events.length + stored.interests.length,
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Processing complete!' });
    
    return {
      success: true,
      sourceId,
      stats: {
        entitiesExtracted: {
          skills: stored.skills.length,
          projects: stored.projects.length,
          goals: stored.goals.length,
          decisions: stored.decisions.length,
          people: stored.people.length,
          companies: stored.companies.length,
          events: stored.events.length,
          interests: stored.interests.length,
          relationships: (entities.relationships || []).length,
        },
      },
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    onProgress?.({ stage: 'error', progress: 0, message: `Error: ${errorMsg}` });
    return {
      success: false,
      sourceId,
      stats: { entitiesExtracted: { skills: 0, projects: 0, goals: 0, decisions: 0, people: 0, companies: 0, events: 0, interests: 0, relationships: 0 } },
      errors,
    };
  }
}

export async function processChatGPTExport(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessingResult> {
  const errors: string[] = [];
  const sourceId = generateId('source');
  
  try {
    const dataSource: DataSource = {
      id: sourceId,
      type: 'chatgpt',
      filename: file.name,
      uploadedAt: new Date(),
      status: 'processing',
      stats: { totalChunks: 0, entitiesExtracted: 0 },
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'parsing', progress: 10, message: 'Parsing ChatGPT export...' });
    const parsed = await parseChatGPTExport(file);
    errors.push(...parsed.parseErrors);
    
    const text = extractChatGPTText(parsed);
    console.log(`Extracted ${text.length} characters from ChatGPT export`);
    
    if (text.length < MIN_CONTENT_LENGTH) {
      throw new Error('Insufficient content extracted from ChatGPT export');
    }
    
    onProgress?.({ stage: 'extracting', progress: 30, message: 'Analyzing conversations with AI...' });
    const entities = await extractEntities(text, 'chatgpt');
    
    if (!entities) {
      throw new Error('Failed to extract entities from content');
    }
    
    onProgress?.({ stage: 'storing', progress: 80, message: 'Storing knowledge graph...' });
    const { entities: stored } = await storeEntities(entities, sourceId);
    
    dataSource.status = 'completed';
    dataSource.processedAt = new Date();
    dataSource.stats = {
      totalChunks: 1,
      entitiesExtracted: 
        stored.skills.length + stored.projects.length + stored.goals.length +
        stored.decisions.length + stored.people.length + stored.companies.length +
        stored.events.length + stored.interests.length,
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Processing complete!' });
    
    return {
      success: true,
      sourceId,
      stats: {
        entitiesExtracted: {
          skills: stored.skills.length,
          projects: stored.projects.length,
          goals: stored.goals.length,
          decisions: stored.decisions.length,
          people: stored.people.length,
          companies: stored.companies.length,
          events: stored.events.length,
          interests: stored.interests.length,
          relationships: (entities.relationships || []).length,
        },
      },
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    onProgress?.({ stage: 'error', progress: 0, message: `Error: ${errorMsg}` });
    return {
      success: false,
      sourceId,
      stats: { entitiesExtracted: { skills: 0, projects: 0, goals: 0, decisions: 0, people: 0, companies: 0, events: 0, interests: 0, relationships: 0 } },
      errors,
    };
  }
}

export async function processDocument(
  file: File,
  onProgress?: ProgressCallback
): Promise<ProcessingResult> {
  const errors: string[] = [];
  const sourceId = generateId('source');
  
  try {
    const dataSource: DataSource = {
      id: sourceId,
      type: 'document',
      filename: file.name,
      uploadedAt: new Date(),
      status: 'processing',
      stats: { totalChunks: 0, entitiesExtracted: 0 },
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'parsing', progress: 10, message: 'Parsing document...' });
    const parsed = await parseDocument(file);
    
    console.log(`Parsed document: ${parsed.filename}, content length: ${parsed.content.length}`);
    
    if (parsed.parseError) {
      throw new Error(parsed.parseError);
    }
    
    if (!parsed.content || parsed.content.trim().length < MIN_CONTENT_LENGTH) {
      throw new Error(`Document has insufficient content (${parsed.content?.length || 0} characters)`);
    }
    
    onProgress?.({ stage: 'extracting', progress: 30, message: 'Analyzing document with AI...' });
    const entities = await extractEntities(parsed.content, 'document');
    
    if (!entities) {
      throw new Error('Failed to extract entities from document');
    }
    
    console.log(`Extracted: ${entities.skills?.length || 0} skills, ${entities.projects?.length || 0} projects, ${entities.relationships?.length || 0} relationships`);
    
    onProgress?.({ stage: 'storing', progress: 80, message: 'Storing knowledge graph...' });
    const { entities: stored } = await storeEntities(entities, sourceId);
    
    dataSource.status = 'completed';
    dataSource.processedAt = new Date();
    dataSource.stats = {
      totalChunks: 1,
      entitiesExtracted: 
        stored.skills.length + stored.projects.length + stored.goals.length +
        stored.decisions.length + stored.people.length + stored.companies.length +
        stored.events.length + stored.interests.length,
    };
    await knowledgeStore.saveSource(dataSource);
    
    onProgress?.({ stage: 'complete', progress: 100, message: 'Processing complete!' });
    
    return {
      success: true,
      sourceId,
      stats: {
        entitiesExtracted: {
          skills: stored.skills.length,
          projects: stored.projects.length,
          goals: stored.goals.length,
          decisions: stored.decisions.length,
          people: stored.people.length,
          companies: stored.companies.length,
          events: stored.events.length,
          interests: stored.interests.length,
          relationships: (entities.relationships || []).length,
        },
      },
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    onProgress?.({ stage: 'error', progress: 0, message: `Error: ${errorMsg}` });
    return {
      success: false,
      sourceId,
      stats: { entitiesExtracted: { skills: 0, projects: 0, goals: 0, decisions: 0, people: 0, companies: 0, events: 0, interests: 0, relationships: 0 } },
      errors,
    };
  }
}
