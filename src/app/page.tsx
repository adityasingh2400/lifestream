'use client';

import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { knowledgeStore, PersonalKnowledge, GraphNode, EntityType, Skill, Project, Goal, Decision, Person, Company, TimelineEvent, Interest } from '@/lib/knowledge';
import { NodeEditModal } from '@/components/knowledge/NodeEditModal';

type EntityData = Skill | Project | Goal | Decision | Person | Company | TimelineEvent | Interest;

// Lazy load 3D component
const KnowledgeGraph3D = lazy(() => 
  import('@/components/knowledge/KnowledgeGraph3D').then(mod => ({ default: mod.KnowledgeGraph3D }))
);

// ============================================================================
// PROACTIVE PROMPTS - Questions to gather more info
// ============================================================================

const LIFE_PROMPTS = [
  { id: 'recent_win', question: "What's a small win you had this week?", category: 'event' },
  { id: 'current_challenge', question: "What's challenging you right now?", category: 'decision' },
  { id: 'learning', question: "What are you learning or curious about lately?", category: 'interest' },
  { id: 'person_impact', question: "Who influenced your thinking recently?", category: 'person' },
  { id: 'goal_progress', question: "What progress have you made on your goals?", category: 'goal' },
  { id: 'new_skill', question: "What skill are you developing?", category: 'skill' },
  { id: 'project_update', question: "How's your current project going?", category: 'project' },
  { id: 'decision_made', question: "What decision are you weighing?", category: 'decision' },
  { id: 'energy', question: "What's giving you energy lately?", category: 'interest' },
  { id: 'connection', question: "Who have you connected with recently?", category: 'person' },
];

// ============================================================================
// LOADING SCREEN
// ============================================================================

function LoadingScreen() {
  return (
    <div className="w-full h-full bg-[#030712] flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin opacity-20" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin opacity-30" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <div className="absolute inset-4 rounded-full bg-[#030712]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
        </div>
        <div className="text-white/40 text-sm">Loading universe...</div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="w-full h-full bg-[#030712] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 animate-pulse" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">✨</div>
        </div>
        
        <h1 className="text-2xl font-light text-white mb-2">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">Lifestream</span>
        </h1>
        
        <p className="text-white/50 mb-8 text-sm leading-relaxed">
          Build a living map of your knowledge, skills, and connections.
        </p>
        
        <Link
          href="/ingest"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm transition-all border border-white/10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import Data
        </Link>
        
        <p className="text-white/30 text-xs mt-4">
          Notion, ChatGPT, PDFs, and more
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// NODE DETAIL PANEL - Enhanced with all fields
// ============================================================================

function NodeDetailPanel({ 
  node, 
  onClose,
  onEdit,
  onDelete,
}: { 
  node: GraphNode | null; 
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!node) return null;
  
  const typeColors: Record<EntityType, string> = {
    skill: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    project: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
    goal: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
    decision: 'from-amber-500/20 to-amber-600/10 border-amber-500/20',
    person: 'from-pink-500/20 to-pink-600/10 border-pink-500/20',
    company: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20',
    event: 'from-teal-500/20 to-teal-600/10 border-teal-500/20',
    interest: 'from-orange-500/20 to-orange-600/10 border-orange-500/20',
  };
  
  const typeLabels: Record<EntityType, string> = {
    skill: '🎯 Skill',
    project: '🚀 Project',
    goal: '🎯 Goal',
    decision: '⚖️ Decision',
    person: '👤 Person',
    company: '🏢 Company',
    event: '📅 Event',
    interest: '💡 Interest',
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderArrayField = (label: string, items: string[] | undefined) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mt-3">
        <span className="text-white/40 text-xs block mb-1">{label}</span>
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderField = (label: string, value: string | number | undefined | null) => {
    if (!value) return null;
    return (
      <div className="flex justify-between items-start gap-2">
        <span className="text-white/40 text-xs shrink-0">{label}</span>
        <span className="text-white text-xs text-right">{value}</span>
      </div>
    );
  };

  const renderTextBlock = (label: string, text: string | undefined) => {
    if (!text) return null;
    return (
      <div className="mt-3">
        <span className="text-white/40 text-xs block mb-1">{label}</span>
        <p className="text-white/70 text-xs leading-relaxed">{text}</p>
      </div>
    );
  };

  const data = node.data as unknown as Record<string, unknown>;
  
  return (
    <div 
      className={`absolute left-4 top-4 w-80 bg-gradient-to-b ${typeColors[node.type]} backdrop-blur-xl rounded-2xl border shadow-2xl overflow-hidden z-50 animate-in slide-in-from-left-4 duration-300`}
    >
      <div className="p-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-white/60">
            {typeLabels[node.type]}
          </span>
          <div className="flex items-center gap-1 -mr-1 -mt-1">
            <button 
              onClick={onEdit}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              onClick={onDelete}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-white mb-4">{node.label}</h3>
        
        {/* SKILL DETAILS */}
        {node.type === 'skill' && (
          <div className="space-y-2">
            {renderField('Level', (data.level as string)?.replace(/-/g, ' '))}
            {renderField('Category', (data.category as string)?.replace(/-/g, ' '))}
            {renderField('Acquired', formatDate(data.acquiredDate as Date))}
            {renderField('Last Used', formatDate(data.lastUsed as Date))}
            {renderArrayField('Evidence', data.evidence as string[])}
            {renderArrayField('Related Projects', data.relatedProjects as string[])}
            {renderArrayField('Related Skills', data.relatedSkills as string[])}
          </div>
        )}
        
        {/* PROJECT DETAILS */}
        {node.type === 'project' && (
          <div className="space-y-2">
            {renderField('Status', (data.status as string)?.replace(/-/g, ' '))}
            {renderField('Timeframe', data.timeframe as string)}
            {renderField('Started', formatDate(data.startDate as Date))}
            {renderField('Ended', formatDate(data.endDate as Date))}
            {renderTextBlock('Description', data.description as string)}
            {renderArrayField('Technologies', data.technologies as string[])}
            {renderArrayField('Outcomes', data.outcomes as string[])}
            {renderArrayField('Learnings', data.learnings as string[])}
            {renderArrayField('Skills Used', data.relatedSkills as string[])}
            {renderArrayField('People Involved', data.relatedPeople as string[])}
          </div>
        )}
        
        {/* GOAL DETAILS */}
        {node.type === 'goal' && (
          <div className="space-y-2">
            {renderField('Type', (data.type as string)?.replace(/-/g, ' '))}
            {renderField('Timeframe', (data.timeframe as string)?.replace(/-/g, ' '))}
            {renderField('Status', (data.status as string)?.replace(/-/g, ' '))}
            {renderField('Target Date', formatDate(data.targetDate as Date))}
            {renderTextBlock('Progress', data.progress as string)}
            {renderArrayField('Milestones', data.milestones as string[])}
            {renderArrayField('Blockers', data.blockers as string[])}
            {renderArrayField('Skills Needed', data.relatedSkills as string[])}
            {renderArrayField('Related Projects', data.relatedProjects as string[])}
          </div>
        )}
        
        {/* DECISION DETAILS */}
        {node.type === 'decision' && (
          <div className="space-y-2">
            {renderField('Category', (data.category as string)?.replace(/-/g, ' '))}
            {renderField('Impact', (data.impact as string)?.replace(/-/g, ' '))}
            {renderField('Date', formatDate(data.date as Date))}
            {renderField('Consequence Date', formatDate(data.consequenceDate as Date))}
            {renderTextBlock('Context', data.context as string)}
            {renderTextBlock('Choice Made', data.choice as string)}
            {renderTextBlock('Outcome', data.outcome as string)}
            {renderTextBlock('Reflection', data.reflection as string)}
            {renderArrayField('Related Goals', data.relatedGoals as string[])}
            {renderArrayField('Related Projects', data.relatedProjects as string[])}
          </div>
        )}
        
        {/* PERSON DETAILS */}
        {node.type === 'person' && (
          <div className="space-y-2">
            {renderField('Relationship', (data.relationship as string)?.replace(/-/g, ' '))}
            {renderField('Company', data.company as string)}
            {renderField('Role', data.role as string)}
            {renderField('First Met', formatDate(data.firstMetDate as Date))}
            {renderTextBlock('Context', data.context as string)}
            {renderArrayField('Interactions', data.interactions as string[])}
            {renderArrayField('Projects Together', data.relatedProjects as string[])}
          </div>
        )}
        
        {/* COMPANY DETAILS */}
        {node.type === 'company' && (
          <div className="space-y-2">
            {renderField('Relationship', (data.relationship as string)?.replace(/-/g, ' '))}
            {renderField('Your Role', data.role as string)}
            {renderField('Timeframe', data.timeframe as string)}
            {renderField('Started', formatDate(data.startDate as Date))}
            {renderField('Ended', formatDate(data.endDate as Date))}
            {renderTextBlock('Description', data.description as string)}
            {renderArrayField('People', data.relatedPeople as string[])}
            {renderArrayField('Projects', data.relatedProjects as string[])}
            {renderArrayField('Skills Developed', data.relatedSkills as string[])}
          </div>
        )}
        
        {/* EVENT DETAILS */}
        {node.type === 'event' && (
          <div className="space-y-2">
            {renderField('Type', (data.type as string)?.replace(/-/g, ' '))}
            {renderField('Impact', (data.impact as string)?.replace(/-/g, ' '))}
            {renderField('Date', formatDate(data.date as Date))}
            {renderField('End Date', formatDate(data.endDate as Date))}
          </div>
        )}
        
        {/* INTEREST DETAILS */}
        {node.type === 'interest' && (
          <div className="space-y-2">
            {renderField('Depth', (data.depth as string)?.replace(/-/g, ' '))}
            {renderField('Started', formatDate(data.startedDate as Date))}
            {renderArrayField('Evidence', data.evidence as string[])}
            {renderArrayField('Related Skills', data.relatedSkills as string[])}
          </div>
        )}

        {/* Metadata */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-white/30 text-[10px]">
            ID: {String(data.id)}
          </div>
          {data.createdAt ? (
            <div className="text-white/30 text-[10px]">
              Created: {formatDate(data.createdAt as Date)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROMPT MODAL - For gathering more info
// ============================================================================

function PromptModal({ 
  isOpen, 
  onClose, 
  onSubmit,
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answer: string, category: string) => void;
}) {
  const [answer, setAnswer] = useState('');
  const [currentPrompt] = useState(() => 
    LIFE_PROMPTS[Math.floor(Math.random() * LIFE_PROMPTS.length)]
  );
  
  if (!isOpen) return null;
  
  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer, currentPrompt.category);
      setAnswer('');
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0f] rounded-2xl border border-white/10 p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-xs text-purple-400 mb-2">Quick reflection</div>
        <h3 className="text-lg text-white mb-4">{currentPrompt.question}</h3>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
          rows={3}
          autoFocus
        />
        
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Add to graph
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONFIRM MODAL - For delete/clear confirmations
// ============================================================================

function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  confirmColor = 'red',
}: { 
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'red' | 'purple';
}) {
  if (!isOpen) return null;
  
  const colorClasses = confirmColor === 'red' 
    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
    : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300';
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0f] rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-lg text-white mb-2">{title}</h3>
        <p className="text-white/60 text-sm mb-6">{message}</p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm text-white/50 hover:text-white/70 transition-colors border border-white/10 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2 rounded-lg text-sm transition-colors ${colorClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Home() {
  const [knowledge, setKnowledge] = useState<PersonalKnowledge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNode, setEditingNode] = useState<{ type: EntityType; data: EntityData } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Load knowledge
  useEffect(() => {
    async function loadKnowledge() {
      // Check if we're in the browser
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      
      try {
        console.log('Loading knowledge from IndexedDB...');
        const data = await knowledgeStore.getAllKnowledge();
        console.log('Knowledge loaded:', {
          skills: data.skills.length,
          projects: data.projects.length,
          goals: data.goals.length,
          total: data.skills.length + data.projects.length + data.goals.length + 
                 data.decisions.length + data.people.length + data.companies.length +
                 data.events.length + data.interests.length
        });
        setKnowledge(data);
      } catch (err) {
        console.error('Failed to load knowledge:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadKnowledge();
  }, []);
  
  // Show prompt occasionally (every 5 minutes if user has data)
  useEffect(() => {
    if (!knowledge) return;
    
    const hasData = knowledge.skills.length > 0 || knowledge.projects.length > 0;
    if (!hasData) return;
    
    // Check if we should show prompt (not shown in last hour)
    const lastPrompt = localStorage.getItem('lastPromptTime');
    const hourAgo = Date.now() - 60 * 60 * 1000;
    
    if (!lastPrompt || parseInt(lastPrompt) < hourAgo) {
      // Show after 30 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('lastPromptTime', Date.now().toString());
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [knowledge]);
  
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const handleEditNode = useCallback(() => {
    if (selectedNode) {
      setEditingNode({ type: selectedNode.type, data: selectedNode.data as EntityData });
      setShowEditModal(true);
    }
  }, [selectedNode]);

  const handleAddNode = useCallback(() => {
    setEditingNode(null);
    setShowEditModal(true);
  }, []);

  const handleDeleteNode = useCallback(async () => {
    if (!selectedNode) return;
    
    try {
      const nodeId = (selectedNode.data as { id: string }).id;
      
      switch (selectedNode.type) {
        case 'skill':
          await knowledgeStore.deleteSkill(nodeId);
          break;
        case 'project':
          await knowledgeStore.deleteProject(nodeId);
          break;
        case 'goal':
          await knowledgeStore.deleteGoal(nodeId);
          break;
        case 'decision':
          await knowledgeStore.deleteDecision(nodeId);
          break;
        case 'person':
          await knowledgeStore.deletePerson(nodeId);
          break;
        case 'company':
          await knowledgeStore.deleteCompany(nodeId);
          break;
        case 'event':
          await knowledgeStore.deleteEvent(nodeId);
          break;
        case 'interest':
          await knowledgeStore.deleteInterest(nodeId);
          break;
      }

      // Reload knowledge to refresh the graph
      const updatedKnowledge = await knowledgeStore.getAllKnowledge();
      setKnowledge(updatedKnowledge);
      setSelectedNode(null);
      console.log('Deleted node:', nodeId);
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  }, [selectedNode]);

  const handleClearGraph = useCallback(async () => {
    try {
      await knowledgeStore.clearAll();
      setKnowledge(null);
      setSelectedNode(null);
      console.log('Cleared all knowledge');
    } catch (err) {
      console.error('Failed to clear knowledge:', err);
    }
  }, []);

  const handleSaveNode = useCallback(async (type: EntityType, data: EntityData) => {
    try {
      // Save to IndexedDB based on type
      switch (type) {
        case 'skill':
          await knowledgeStore.saveSkill(data as Skill);
          break;
        case 'project':
          await knowledgeStore.saveProject(data as Project);
          break;
        case 'goal':
          await knowledgeStore.saveGoal(data as Goal);
          break;
        case 'decision':
          await knowledgeStore.saveDecision(data as Decision);
          break;
        case 'person':
          await knowledgeStore.savePerson(data as Person);
          break;
        case 'company':
          await knowledgeStore.saveCompany(data as Company);
          break;
        case 'event':
          await knowledgeStore.saveEvent(data as TimelineEvent);
          break;
        case 'interest':
          await knowledgeStore.saveInterest(data as Interest);
          break;
      }

      // Reload knowledge to refresh the graph
      const updatedKnowledge = await knowledgeStore.getAllKnowledge();
      setKnowledge(updatedKnowledge);
      
      // Update selected node if we were editing it
      if (editingNode && selectedNode) {
        setSelectedNode({ ...selectedNode, data: data, label: getNodeLabel(type, data) });
      }
      
      setShowEditModal(false);
      setEditingNode(null);
    } catch (err) {
      console.error('Failed to save node:', err);
    }
  }, [editingNode, selectedNode]);

  // Helper to get node label based on type
  const getNodeLabel = (type: EntityType, data: EntityData): string => {
    switch (type) {
      case 'skill':
        return (data as Skill).name;
      case 'project':
        return (data as Project).name;
      case 'goal':
        return (data as Goal).description.slice(0, 50);
      case 'decision':
        return (data as Decision).description.slice(0, 50);
      case 'person':
        return (data as Person).name;
      case 'company':
        return (data as Company).name;
      case 'event':
        return (data as TimelineEvent).description.slice(0, 50);
      case 'interest':
        return (data as Interest).topic;
      default:
        return 'Unknown';
    }
  };
  
  const handlePromptSubmit = async (answer: string, category: string) => {
    // Create a basic entity based on the category
    const now = new Date();
    const baseEntity = {
      createdAt: now,
      updatedAt: now,
      sources: [],
    };

    try {
      switch (category) {
        case 'skill': {
          const skill: Skill = {
            ...baseEntity,
            id: `skill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: answer.slice(0, 100),
            level: 'intermediate',
            category: 'technical',
            evidence: [answer],
            relatedProjects: [],
            relatedSkills: [],
          };
          await knowledgeStore.saveSkill(skill);
          break;
        }
        case 'project': {
          const project: Project = {
            ...baseEntity,
            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: answer.slice(0, 50),
            description: answer,
            status: 'in-progress',
            technologies: [],
            outcomes: [],
            learnings: [],
            relatedSkills: [],
            relatedPeople: [],
            relatedCompanies: [],
          };
          await knowledgeStore.saveProject(project);
          break;
        }
        case 'goal': {
          const goal: Goal = {
            ...baseEntity,
            id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: answer,
            type: 'personal',
            timeframe: 'medium-term',
            status: 'active',
            milestones: [],
            blockers: [],
            relatedSkills: [],
            relatedProjects: [],
          };
          await knowledgeStore.saveGoal(goal);
          break;
        }
        case 'decision': {
          const decision: Decision = {
            ...baseEntity,
            id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: answer,
            context: answer,
            category: 'personal',
            impact: 'medium',
            relatedGoals: [],
            relatedProjects: [],
          };
          await knowledgeStore.saveDecision(decision);
          break;
        }
        case 'person': {
          const person: Person = {
            ...baseEntity,
            id: `person-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: answer.slice(0, 50),
            relationship: 'professional-contact',
            context: answer,
            interactions: [],
            relatedProjects: [],
          };
          await knowledgeStore.savePerson(person);
          break;
        }
        case 'event': {
          const event: TimelineEvent = {
            ...baseEntity,
            id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description: answer,
            type: 'milestone',
            impact: 'medium',
            relatedEntities: [],
          };
          await knowledgeStore.saveEvent(event);
          break;
        }
        case 'interest': {
          const interest: Interest = {
            ...baseEntity,
            id: `interest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            topic: answer.slice(0, 50),
            depth: 'moderate',
            evidence: [answer],
            relatedSkills: [],
          };
          await knowledgeStore.saveInterest(interest);
          break;
        }
      }

      // Reload knowledge to refresh the graph
      const updatedKnowledge = await knowledgeStore.getAllKnowledge();
      setKnowledge(updatedKnowledge);
      console.log('Added new insight:', { answer, category });
    } catch (err) {
      console.error('Failed to save insight:', err);
    }
  };
  
  const hasData = knowledge && (
    knowledge.skills.length > 0 ||
    knowledge.projects.length > 0 ||
    knowledge.goals.length > 0 ||
    knowledge.decisions.length > 0 ||
    knowledge.people.length > 0 ||
    knowledge.companies.length > 0
  );
  
  const totalEntities = knowledge ? (
    knowledge.skills.length + knowledge.projects.length + knowledge.goals.length +
    knowledge.decisions.length + knowledge.people.length + knowledge.companies.length +
    knowledge.events.length + knowledge.interests.length
  ) : 0;
  
  if (loading) {
    return <main className="h-screen"><LoadingScreen /></main>;
  }
  
  if (error) {
    return (
      <main className="h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-400 text-lg mb-2">Error loading data</div>
          <div className="text-white/50 text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }
  
  if (!hasData) {
    return <main className="h-screen"><EmptyState /></main>;
  }
  
  return (
    <main className="h-screen bg-[#030712] relative overflow-hidden">
      {/* 3D Graph */}
      <Suspense fallback={<LoadingScreen />}>
        <KnowledgeGraph3D
          knowledge={knowledge!}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id}
        />
      </Suspense>
      
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none z-40">
        {/* Stats */}
        <div className="pointer-events-auto">
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">
            {knowledge!.profile.name || 'Your'} Universe
          </div>
          <div className="text-white/80 text-xl font-light">
            {totalEntities} <span className="text-white/40 text-sm">nodes</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleAddNode}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            title="Add node"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setShowPrompt(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            title="Quick reflection"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <Link
            href="/ingest"
            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/60 text-xs transition-colors"
          >
            Import
          </Link>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="p-2 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/10 transition-colors"
            title="Clear all data"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Brand */}
      <div className="absolute bottom-4 left-4 z-40 pointer-events-none">
        <div className="text-xs">
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">
            Lifestream
          </span>
        </div>
      </div>
      
      {/* Node detail */}
      <NodeDetailPanel 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)}
        onEdit={handleEditNode}
        onDelete={() => setShowDeleteConfirm(true)}
      />
      
      {/* Node edit modal */}
      <NodeEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingNode(null);
        }}
        onSave={handleSaveNode}
        editingNode={editingNode}
      />
      
      {/* Prompt modal */}
      <PromptModal
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        onSubmit={handlePromptSubmit}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteNode}
        title="Delete Node"
        message={`Are you sure you want to delete "${selectedNode?.label}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
      />

      {/* Clear all confirmation modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearGraph}
        title="Clear Knowledge Graph"
        message="Are you sure you want to delete ALL nodes and data? This action cannot be undone."
        confirmText="Clear All"
        confirmColor="red"
      />
    </main>
  );
}
