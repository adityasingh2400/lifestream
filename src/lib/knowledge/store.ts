/**
 * Knowledge Store
 * 
 * IndexedDB-based storage for the personal knowledge graph.
 * Provides CRUD operations and querying capabilities.
 */

import { 
  PersonalKnowledge, 
  Profile, 
  Skill, 
  Project, 
  Goal, 
  Decision, 
  Person, 
  Company, 
  TimelineEvent, 
  Interest,
  ContentChunk,
  DataSource,
  SubCategory,
} from './types';

// ============================================================================
// DATABASE SETUP
// ============================================================================

const DB_NAME = 'lifestream-knowledge';
const DB_VERSION = 2;  // Bumped for subcategories support

const STORES = {
  profile: 'profile',
  skills: 'skills',
  projects: 'projects',
  goals: 'goals',
  decisions: 'decisions',
  people: 'people',
  companies: 'companies',
  events: 'events',
  interests: 'interests',
  chunks: 'chunks',
  sources: 'sources',
  subCategories: 'subCategories',  // New store for hierarchical grouping
} as const;

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  // Guard against SSR
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available (server-side rendering)');
  }
  
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains(STORES.profile)) {
        db.createObjectStore(STORES.profile, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.skills)) {
        const store = db.createObjectStore(STORES.skills, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('level', 'level', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const store = db.createObjectStore(STORES.projects, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.goals)) {
        const store = db.createObjectStore(STORES.goals, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.decisions)) {
        const store = db.createObjectStore(STORES.decisions, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.people)) {
        const store = db.createObjectStore(STORES.people, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('relationship', 'relationship', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.companies)) {
        const store = db.createObjectStore(STORES.companies, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('relationship', 'relationship', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.events)) {
        const store = db.createObjectStore(STORES.events, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.interests)) {
        const store = db.createObjectStore(STORES.interests, { keyPath: 'id' });
        store.createIndex('topic', 'topic', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.chunks)) {
        const store = db.createObjectStore(STORES.chunks, { keyPath: 'id' });
        store.createIndex('sourceType', 'source.type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.sources)) {
        const store = db.createObjectStore(STORES.sources, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
      
      // SubCategories store for hierarchical grouping
      if (!db.objectStoreNames.contains(STORES.subCategories)) {
        const store = db.createObjectStore(STORES.subCategories, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('parentCategory', 'parentCategory', { unique: false });
      }
    };
  });
}

// ============================================================================
// GENERIC CRUD OPERATIONS
// ============================================================================

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function putMany<T>(storeName: string, items: T[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    let completed = 0;
    for (const item of items) {
      const request = store.put(item);
      request.onsuccess = () => {
        completed++;
        if (completed === items.length) resolve();
      };
      request.onerror = () => reject(request.error);
    }
    
    if (items.length === 0) resolve();
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// KNOWLEDGE STORE API
// ============================================================================

export const knowledgeStore = {
  // Profile
  async getProfile(): Promise<Profile | undefined> {
    const profiles = await getAll<Profile>(STORES.profile);
    return profiles[0];
  },
  
  async saveProfile(profile: Profile): Promise<void> {
    await put(STORES.profile, profile);
  },
  
  // Skills
  async getSkills(): Promise<Skill[]> {
    return getAll<Skill>(STORES.skills);
  },
  
  async getSkill(id: string): Promise<Skill | undefined> {
    return getById<Skill>(STORES.skills, id);
  },
  
  async saveSkill(skill: Skill): Promise<void> {
    await put(STORES.skills, skill);
  },
  
  async saveSkills(skills: Skill[]): Promise<void> {
    await putMany(STORES.skills, skills);
  },
  
  // Projects
  async getProjects(): Promise<Project[]> {
    return getAll<Project>(STORES.projects);
  },
  
  async getProject(id: string): Promise<Project | undefined> {
    return getById<Project>(STORES.projects, id);
  },
  
  async saveProject(project: Project): Promise<void> {
    await put(STORES.projects, project);
  },
  
  async saveProjects(projects: Project[]): Promise<void> {
    await putMany(STORES.projects, projects);
  },
  
  // Goals
  async getGoals(): Promise<Goal[]> {
    return getAll<Goal>(STORES.goals);
  },
  
  async getGoal(id: string): Promise<Goal | undefined> {
    return getById<Goal>(STORES.goals, id);
  },
  
  async saveGoal(goal: Goal): Promise<void> {
    await put(STORES.goals, goal);
  },
  
  async saveGoals(goals: Goal[]): Promise<void> {
    await putMany(STORES.goals, goals);
  },
  
  // Decisions
  async getDecisions(): Promise<Decision[]> {
    return getAll<Decision>(STORES.decisions);
  },
  
  async getDecision(id: string): Promise<Decision | undefined> {
    return getById<Decision>(STORES.decisions, id);
  },
  
  async saveDecision(decision: Decision): Promise<void> {
    await put(STORES.decisions, decision);
  },
  
  async saveDecisions(decisions: Decision[]): Promise<void> {
    await putMany(STORES.decisions, decisions);
  },
  
  // People
  async getPeople(): Promise<Person[]> {
    return getAll<Person>(STORES.people);
  },
  
  async getPerson(id: string): Promise<Person | undefined> {
    return getById<Person>(STORES.people, id);
  },
  
  async savePerson(person: Person): Promise<void> {
    await put(STORES.people, person);
  },
  
  async savePeople(people: Person[]): Promise<void> {
    await putMany(STORES.people, people);
  },
  
  // Companies
  async getCompanies(): Promise<Company[]> {
    return getAll<Company>(STORES.companies);
  },
  
  async getCompany(id: string): Promise<Company | undefined> {
    return getById<Company>(STORES.companies, id);
  },
  
  async saveCompany(company: Company): Promise<void> {
    await put(STORES.companies, company);
  },
  
  async saveCompanies(companies: Company[]): Promise<void> {
    await putMany(STORES.companies, companies);
  },
  
  // Events
  async getEvents(): Promise<TimelineEvent[]> {
    return getAll<TimelineEvent>(STORES.events);
  },
  
  async getEvent(id: string): Promise<TimelineEvent | undefined> {
    return getById<TimelineEvent>(STORES.events, id);
  },
  
  async saveEvent(event: TimelineEvent): Promise<void> {
    await put(STORES.events, event);
  },
  
  async saveEvents(events: TimelineEvent[]): Promise<void> {
    await putMany(STORES.events, events);
  },
  
  // Interests
  async getInterests(): Promise<Interest[]> {
    return getAll<Interest>(STORES.interests);
  },
  
  async getInterest(id: string): Promise<Interest | undefined> {
    return getById<Interest>(STORES.interests, id);
  },
  
  async saveInterest(interest: Interest): Promise<void> {
    await put(STORES.interests, interest);
  },
  
  async saveInterests(interests: Interest[]): Promise<void> {
    await putMany(STORES.interests, interests);
  },
  
  // Chunks
  async getChunks(): Promise<ContentChunk[]> {
    return getAll<ContentChunk>(STORES.chunks);
  },
  
  async saveChunk(chunk: ContentChunk): Promise<void> {
    await put(STORES.chunks, chunk);
  },
  
  async saveChunks(chunks: ContentChunk[]): Promise<void> {
    await putMany(STORES.chunks, chunks);
  },
  
  // Sources
  async getSources(): Promise<DataSource[]> {
    return getAll<DataSource>(STORES.sources);
  },
  
  async getSource(id: string): Promise<DataSource | undefined> {
    return getById<DataSource>(STORES.sources, id);
  },
  
  async saveSource(source: DataSource): Promise<void> {
    await put(STORES.sources, source);
  },
  
  // SubCategories
  async getSubCategories(): Promise<SubCategory[]> {
    return getAll<SubCategory>(STORES.subCategories);
  },
  
  async getSubCategory(id: string): Promise<SubCategory | undefined> {
    return getById<SubCategory>(STORES.subCategories, id);
  },
  
  async saveSubCategory(subCategory: SubCategory): Promise<void> {
    await put(STORES.subCategories, subCategory);
  },
  
  async saveSubCategories(subCategories: SubCategory[]): Promise<void> {
    await putMany(STORES.subCategories, subCategories);
  },
  
  async deleteSubCategory(id: string): Promise<void> {
    await deleteById(STORES.subCategories, id);
  },

  // Delete individual entities
  async deleteSkill(id: string): Promise<void> {
    await deleteById(STORES.skills, id);
  },

  async deleteProject(id: string): Promise<void> {
    await deleteById(STORES.projects, id);
  },

  async deleteGoal(id: string): Promise<void> {
    await deleteById(STORES.goals, id);
  },

  async deleteDecision(id: string): Promise<void> {
    await deleteById(STORES.decisions, id);
  },

  async deletePerson(id: string): Promise<void> {
    await deleteById(STORES.people, id);
  },

  async deleteCompany(id: string): Promise<void> {
    await deleteById(STORES.companies, id);
  },

  async deleteEvent(id: string): Promise<void> {
    await deleteById(STORES.events, id);
  },

  async deleteInterest(id: string): Promise<void> {
    await deleteById(STORES.interests, id);
  },
  
  // Aggregate
  async getAllKnowledge(): Promise<PersonalKnowledge> {
    const [
      profile,
      skills,
      projects,
      goals,
      decisions,
      people,
      companies,
      events,
      interests,
      subCategories,
      chunks,
      sources,
    ] = await Promise.all([
      this.getProfile(),
      this.getSkills(),
      this.getProjects(),
      this.getGoals(),
      this.getDecisions(),
      this.getPeople(),
      this.getCompanies(),
      this.getEvents(),
      this.getInterests(),
      this.getSubCategories(),
      this.getChunks(),
      this.getSources(),
    ]);
    
    return {
      profile: profile || {
        id: 'default',
        name: 'User',
        updatedAt: new Date(),
      },
      skills,
      projects,
      goals,
      decisions,
      people,
      companies,
      events,
      interests,
      subCategories,
      chunks,
      sources,
      lastUpdated: new Date(),
    };
  },
  
  // Clear all data
  async clearAll(): Promise<void> {
    await Promise.all([
      clearStore(STORES.profile),
      clearStore(STORES.skills),
      clearStore(STORES.projects),
      clearStore(STORES.goals),
      clearStore(STORES.decisions),
      clearStore(STORES.people),
      clearStore(STORES.companies),
      clearStore(STORES.events),
      clearStore(STORES.interests),
      clearStore(STORES.subCategories),
      clearStore(STORES.chunks),
      clearStore(STORES.sources),
    ]);
  },
};

// ============================================================================
// HELPER: Generate unique ID
// ============================================================================

export function generateId(prefix: string = 'entity'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
