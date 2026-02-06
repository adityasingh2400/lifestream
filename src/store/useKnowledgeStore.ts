import { create } from 'zustand';
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
  DataSource,
  Profile,
  SubCategory,
} from '@/lib/knowledge/types';
import { knowledgeStore, generateId } from '@/lib/knowledge/store';
import { buildTimeline, calculateLifeChapters, mapToDecisionPoints, TimelineEntry, LifeChapter } from '@/lib/knowledge/timeline';

// ============================================================================
// TYPES
// ============================================================================

interface KnowledgeState {
  // Data
  knowledge: PersonalKnowledge | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadKnowledge: () => Promise<void>;
  clearKnowledge: () => Promise<void>;
  
  // Profile
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  
  // Entity operations
  addSkills: (skills: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addProjects: (projects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addGoals: (goals: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addDecisions: (decisions: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addPeople: (people: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addCompanies: (companies: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addEvents: (events: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  addInterests: (interests: Omit<Interest, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  
  // Data source tracking
  addDataSource: (source: Omit<DataSource, 'id'>) => Promise<string>;
  updateDataSource: (id: string, updates: Partial<DataSource>) => Promise<void>;
  
  // Getters for simulation context
  getSimulationContext: () => SimulationContext | null;
}

export interface SimulationContext {
  profile: {
    name: string;
    age?: number;
    currentRole?: string;
    location?: string;
  };
  
  topSkills: {
    name: string;
    level: string;
    category: string;
    acquiredDate?: Date;
  }[];
  
  activeProjects: {
    name: string;
    status: string;
    technologies: string[];
    startDate?: Date;
    endDate?: Date;
  }[];
  
  currentGoals: {
    description: string;
    type: string;
    timeframe: string;
    targetDate?: Date;
    daysUntilDeadline?: number;
  }[];
  
  recentDecisions: {
    description: string;
    category: string;
    outcome?: string;
    date?: Date;
  }[];
  
  workHistory: {
    company: string;
    role?: string;
    relationship: string;
    startDate?: Date;
    endDate?: Date;
  }[];
  
  network: {
    name: string;
    relationship: string;
    firstMetDate?: Date;
  }[];
  
  interests: {
    topic: string;
    depth: string;
    startedDate?: Date;
  }[];
  
  // Temporal context for decision engine
  timeline: {
    recentEvents: TimelineEntry[];
    upcomingDeadlines: {
      entityType: string;
      label: string;
      date: Date;
      daysUntil: number;
    }[];
    lifeChapters: LifeChapter[];
  };
  
  // Decision points for simulation
  decisionContext: {
    pastDecisions: {
      description: string;
      date?: Date;
      impact: string;
      outcome?: string;
    }[];
    upcomingGoals: {
      description: string;
      targetDate?: Date;
      type: string;
    }[];
  };
  
  // Summary stats
  stats: {
    totalSkills: number;
    totalProjects: number;
    totalGoals: number;
    totalConnections: number;
    timelineSpanYears?: number;
  };
}

// ============================================================================
// STORE
// ============================================================================

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  knowledge: null,
  isLoading: false,
  error: null,
  
  loadKnowledge: async () => {
    set({ isLoading: true, error: null });
    try {
      const knowledge = await knowledgeStore.getAllKnowledge();
      set({ knowledge, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load knowledge',
        isLoading: false 
      });
    }
  },
  
  clearKnowledge: async () => {
    set({ isLoading: true, error: null });
    try {
      await knowledgeStore.clearAll();
      set({ 
        knowledge: {
          profile: { id: 'default', name: 'User', updatedAt: new Date() },
          skills: [],
          projects: [],
          goals: [],
          decisions: [],
          people: [],
          companies: [],
          events: [],
          interests: [],
          subCategories: [],
          chunks: [],
          sources: [],
          lastUpdated: new Date(),
        },
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to clear knowledge',
        isLoading: false 
      });
    }
  },
  
  updateProfile: async (updates) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const updatedProfile: Profile = {
      ...knowledge.profile,
      ...updates,
      updatedAt: new Date(),
    };
    
    await knowledgeStore.saveProfile(updatedProfile);
    set({ 
      knowledge: { 
        ...knowledge, 
        profile: updatedProfile,
        lastUpdated: new Date(),
      } 
    });
  },
  
  addSkills: async (skills) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newSkills: Skill[] = skills.map(s => ({
      ...s,
      id: generateId('skill'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveSkills(newSkills);
    set({
      knowledge: {
        ...knowledge,
        skills: [...knowledge.skills, ...newSkills],
        lastUpdated: now,
      }
    });
  },
  
  addProjects: async (projects) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newProjects: Project[] = projects.map(p => ({
      ...p,
      id: generateId('project'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveProjects(newProjects);
    set({
      knowledge: {
        ...knowledge,
        projects: [...knowledge.projects, ...newProjects],
        lastUpdated: now,
      }
    });
  },
  
  addGoals: async (goals) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newGoals: Goal[] = goals.map(g => ({
      ...g,
      id: generateId('goal'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveGoals(newGoals);
    set({
      knowledge: {
        ...knowledge,
        goals: [...knowledge.goals, ...newGoals],
        lastUpdated: now,
      }
    });
  },
  
  addDecisions: async (decisions) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newDecisions: Decision[] = decisions.map(d => ({
      ...d,
      id: generateId('decision'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveDecisions(newDecisions);
    set({
      knowledge: {
        ...knowledge,
        decisions: [...knowledge.decisions, ...newDecisions],
        lastUpdated: now,
      }
    });
  },
  
  addPeople: async (people) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newPeople: Person[] = people.map(p => ({
      ...p,
      id: generateId('person'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.savePeople(newPeople);
    set({
      knowledge: {
        ...knowledge,
        people: [...knowledge.people, ...newPeople],
        lastUpdated: now,
      }
    });
  },
  
  addCompanies: async (companies) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newCompanies: Company[] = companies.map(c => ({
      ...c,
      id: generateId('company'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveCompanies(newCompanies);
    set({
      knowledge: {
        ...knowledge,
        companies: [...knowledge.companies, ...newCompanies],
        lastUpdated: now,
      }
    });
  },
  
  addEvents: async (events) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newEvents: TimelineEvent[] = events.map(e => ({
      ...e,
      id: generateId('event'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveEvents(newEvents);
    set({
      knowledge: {
        ...knowledge,
        events: [...knowledge.events, ...newEvents],
        lastUpdated: now,
      }
    });
  },
  
  addInterests: async (interests) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const now = new Date();
    const newInterests: Interest[] = interests.map(i => ({
      ...i,
      id: generateId('interest'),
      createdAt: now,
      updatedAt: now,
    }));
    
    await knowledgeStore.saveInterests(newInterests);
    set({
      knowledge: {
        ...knowledge,
        interests: [...knowledge.interests, ...newInterests],
        lastUpdated: now,
      }
    });
  },
  
  addDataSource: async (source) => {
    const id = generateId('source');
    const dataSource: DataSource = { ...source, id };
    await knowledgeStore.saveSource(dataSource);
    
    const { knowledge } = get();
    if (knowledge) {
      set({
        knowledge: {
          ...knowledge,
          sources: [...knowledge.sources, dataSource],
        }
      });
    }
    
    return id;
  },
  
  updateDataSource: async (id, updates) => {
    const { knowledge } = get();
    if (!knowledge) return;
    
    const source = knowledge.sources.find(s => s.id === id);
    if (!source) return;
    
    const updatedSource = { ...source, ...updates };
    await knowledgeStore.saveSource(updatedSource);
    
    set({
      knowledge: {
        ...knowledge,
        sources: knowledge.sources.map(s => s.id === id ? updatedSource : s),
      }
    });
  },
  
  getSimulationContext: () => {
    const { knowledge } = get();
    if (!knowledge) return null;
    
    const now = new Date();
    
    // Sort skills by level (expert > advanced > intermediate > beginner)
    const levelOrder = { expert: 4, advanced: 3, intermediate: 2, beginner: 1 };
    const sortedSkills = [...knowledge.skills].sort(
      (a, b) => (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0)
    );
    
    // Get active projects sorted by start date
    const activeProjects = knowledge.projects
      .filter(p => p.status === 'in-progress' || p.status === 'idea')
      .sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
    
    // Get active goals with deadline calculations
    const activeGoals = knowledge.goals
      .filter(g => g.status === 'active')
      .map(g => {
        const targetDate = g.targetDate ? new Date(g.targetDate) : undefined;
        const daysUntilDeadline = targetDate 
          ? Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : undefined;
        return { ...g, targetDate, daysUntilDeadline };
      })
      .sort((a, b) => {
        // Sort by deadline (soonest first), then by those without deadlines
        if (a.daysUntilDeadline === undefined && b.daysUntilDeadline === undefined) return 0;
        if (a.daysUntilDeadline === undefined) return 1;
        if (b.daysUntilDeadline === undefined) return -1;
        return a.daysUntilDeadline - b.daysUntilDeadline;
      });
    
    // Get recent decisions (last 5, sorted by date)
    const recentDecisions = [...knowledge.decisions]
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
    
    // Get work history (employers) sorted by date
    const workHistory = knowledge.companies
      .filter(c => c.relationship === 'employer')
      .sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
    
    // Build timeline and life chapters
    const timeline = buildTimeline(knowledge);
    const lifeChapters = calculateLifeChapters(knowledge);
    const decisionPoints = mapToDecisionPoints(knowledge);
    
    // Get recent timeline events (last 10)
    const recentEvents = timeline.slice(-10).reverse();
    
    // Calculate upcoming deadlines from goals and projects
    const upcomingDeadlines: SimulationContext['timeline']['upcomingDeadlines'] = [];
    
    for (const goal of activeGoals) {
      if (goal.targetDate && goal.daysUntilDeadline !== undefined && goal.daysUntilDeadline > 0) {
        upcomingDeadlines.push({
          entityType: 'goal',
          label: goal.description.slice(0, 50),
          date: goal.targetDate,
          daysUntil: goal.daysUntilDeadline,
        });
      }
    }
    
    for (const project of activeProjects) {
      if (project.endDate) {
        const endDate = new Date(project.endDate);
        const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0) {
          upcomingDeadlines.push({
            entityType: 'project',
            label: project.name,
            date: endDate,
            daysUntil,
          });
        }
      }
    }
    
    // Sort deadlines by date
    upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);
    
    // Calculate timeline span
    let timelineSpanYears: number | undefined;
    if (timeline.length > 0) {
      const earliest = timeline[0].date;
      const latest = timeline[timeline.length - 1].date;
      timelineSpanYears = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365));
    }
    
    return {
      profile: {
        name: knowledge.profile.name,
        age: knowledge.profile.age,
        currentRole: knowledge.profile.currentRole,
        location: knowledge.profile.location,
      },
      
      topSkills: sortedSkills.slice(0, 10).map(s => ({
        name: s.name,
        level: s.level,
        category: s.category,
        acquiredDate: s.acquiredDate ? new Date(s.acquiredDate) : undefined,
      })),
      
      activeProjects: activeProjects.slice(0, 5).map(p => ({
        name: p.name,
        status: p.status,
        technologies: p.technologies,
        startDate: p.startDate ? new Date(p.startDate) : undefined,
        endDate: p.endDate ? new Date(p.endDate) : undefined,
      })),
      
      currentGoals: activeGoals.map(g => ({
        description: g.description,
        type: g.type,
        timeframe: g.timeframe,
        targetDate: g.targetDate,
        daysUntilDeadline: g.daysUntilDeadline,
      })),
      
      recentDecisions: recentDecisions.map(d => ({
        description: d.description,
        category: d.category,
        outcome: d.outcome,
        date: d.date ? new Date(d.date) : undefined,
      })),
      
      workHistory: workHistory.map(c => ({
        company: c.name,
        role: c.role,
        relationship: c.relationship,
        startDate: c.startDate ? new Date(c.startDate) : undefined,
        endDate: c.endDate ? new Date(c.endDate) : undefined,
      })),
      
      network: knowledge.people.slice(0, 10).map(p => ({
        name: p.name,
        relationship: p.relationship,
        firstMetDate: p.firstMetDate ? new Date(p.firstMetDate) : undefined,
      })),
      
      interests: knowledge.interests.map(i => ({
        topic: i.topic,
        depth: i.depth,
        startedDate: i.startedDate ? new Date(i.startedDate) : undefined,
      })),
      
      timeline: {
        recentEvents,
        upcomingDeadlines: upcomingDeadlines.slice(0, 10),
        lifeChapters,
      },
      
      decisionContext: {
        pastDecisions: decisionPoints.pastDecisions.slice(0, 10).map(d => ({
          description: d.description,
          date: d.date ? new Date(d.date) : undefined,
          impact: d.impact,
          outcome: d.outcome,
        })),
        upcomingGoals: decisionPoints.upcomingGoals.slice(0, 5).map(g => ({
          description: g.description,
          targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
          type: g.type,
        })),
      },
      
      stats: {
        totalSkills: knowledge.skills.length,
        totalProjects: knowledge.projects.length,
        totalGoals: knowledge.goals.length,
        totalConnections: knowledge.people.length,
        timelineSpanYears,
      },
    };
  },
}));
