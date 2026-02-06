'use client';

import { useState, useEffect } from 'react';
import { EntityType, Skill, Project, Goal, Decision, Person, Company, TimelineEvent, Interest } from '@/lib/knowledge/types';
import { generateId } from '@/lib/knowledge/store';

// ============================================================================
// TYPES
// ============================================================================

type EntityData = Skill | Project | Goal | Decision | Person | Company | TimelineEvent | Interest;

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: EntityType, data: EntityData) => void;
  editingNode?: { type: EntityType; data: EntityData } | null;
}

// ============================================================================
// FIELD CONFIGS FOR EACH ENTITY TYPE
// ============================================================================

const ENTITY_CONFIGS: Record<EntityType, {
  label: string;
  emoji: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'date' | 'array' | 'number';
    options?: string[];
    required?: boolean;
    placeholder?: string;
  }>;
}> = {
  skill: {
    label: 'Skill',
    emoji: '🎯',
    fields: [
      { key: 'name', label: 'Skill Name', type: 'text', required: true, placeholder: 'e.g., Python, Leadership, Spanish' },
      { key: 'level', label: 'Proficiency Level', type: 'select', options: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
      { key: 'category', label: 'Category', type: 'select', options: ['technical', 'soft', 'domain', 'language'], required: true },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this skill in detail - what does it involve? What can you do with it?' },
      { key: 'howLearned', label: 'How did you learn this?', type: 'textarea', placeholder: 'Self-taught, course, mentor, on-the-job, etc. Be specific about your learning journey.' },
      { key: 'currentUsage', label: 'How do you currently use this skill?', type: 'textarea', placeholder: 'Describe how you apply this skill in your work or life today.' },
      { key: 'strengthsInSkill', label: 'Your strengths within this skill', type: 'array', placeholder: 'Add a specific strength...' },
      { key: 'areasToImprove', label: 'Areas you want to improve', type: 'array', placeholder: 'Add an area to improve...' },
      { key: 'evidence', label: 'Evidence & Accomplishments', type: 'array', placeholder: 'Add specific examples, projects, or achievements...' },
      { key: 'certifications', label: 'Certifications or credentials', type: 'array', placeholder: 'Add certification...' },
      { key: 'acquiredDate', label: 'When did you start learning?', type: 'date' },
      { key: 'lastUsed', label: 'Last used', type: 'date' },
      { key: 'hoursInvested', label: 'Approximate hours invested', type: 'number', placeholder: 'e.g., 500' },
      { key: 'relatedProjects', label: 'Related Projects', type: 'array', placeholder: 'Project name or ID...' },
      { key: 'relatedSkills', label: 'Related Skills', type: 'array', placeholder: 'Skill name or ID...' },
      { key: 'resources', label: 'Learning resources used', type: 'array', placeholder: 'Books, courses, tutorials...' },
      { key: 'mentors', label: 'People who helped you learn', type: 'array', placeholder: 'Name or description...' },
    ],
  },
  project: {
    label: 'Project',
    emoji: '🚀',
    fields: [
      { key: 'name', label: 'Project Name', type: 'text', required: true, placeholder: 'e.g., E-commerce Platform, Mobile App' },
      { key: 'tagline', label: 'One-line summary', type: 'text', placeholder: 'A brief tagline describing the project' },
      { key: 'description', label: 'Full Description', type: 'textarea', required: true, placeholder: 'What is this project about? What problem does it solve? Who is it for?' },
      { key: 'motivation', label: 'Why did you start this?', type: 'textarea', placeholder: 'What motivated you to work on this project?' },
      { key: 'status', label: 'Status', type: 'select', options: ['idea', 'in-progress', 'completed', 'abandoned'], required: true },
      { key: 'role', label: 'Your role', type: 'text', placeholder: 'e.g., Lead developer, Co-founder, Contributor' },
      { key: 'teamSize', label: 'Team size', type: 'number', placeholder: 'Number of people involved' },
      { key: 'technologies', label: 'Technologies & Tools Used', type: 'array', placeholder: 'Add technology...' },
      { key: 'challenges', label: 'Challenges faced', type: 'array', placeholder: 'Add a challenge you overcame...' },
      { key: 'outcomes', label: 'Outcomes & Results', type: 'array', placeholder: 'Add measurable outcome...' },
      { key: 'learnings', label: 'Key learnings', type: 'array', placeholder: 'What did you learn?' },
      { key: 'impact', label: 'Impact & reach', type: 'textarea', placeholder: 'Users, revenue, recognition, etc.' },
      { key: 'links', label: 'Links (GitHub, demo, etc.)', type: 'array', placeholder: 'Add URL...' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'timeframe', label: 'Timeframe Description', type: 'text', placeholder: 'e.g., Summer 2024, 6 months' },
      { key: 'relatedSkills', label: 'Skills Used', type: 'array', placeholder: 'Skill name...' },
      { key: 'relatedPeople', label: 'People Involved', type: 'array', placeholder: 'Person name...' },
      { key: 'relatedCompanies', label: 'Companies', type: 'array', placeholder: 'Company name...' },
      { key: 'futureIdeas', label: 'Future ideas for this project', type: 'array', placeholder: 'Add idea...' },
    ],
  },
  goal: {
    label: 'Goal',
    emoji: '🎯',
    fields: [
      { key: 'description', label: 'Goal Description', type: 'textarea', required: true, placeholder: 'What exactly do you want to achieve? Be specific.' },
      { key: 'title', label: 'Short Title (optional)', type: 'text', placeholder: 'A brief name for this goal' },
      { key: 'whyImportant', label: 'Why is this important to you?', type: 'textarea', placeholder: 'What will achieving this mean for your life?' },
      { key: 'type', label: 'Goal Type', type: 'select', options: ['career', 'financial', 'personal', 'learning', 'health'], required: true },
      { key: 'timeframe', label: 'Timeframe', type: 'select', options: ['short-term', 'medium-term', 'long-term'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'achieved', 'abandoned', 'paused'], required: true },
      { key: 'targetDate', label: 'Target Date', type: 'date' },
      { key: 'successCriteria', label: 'How will you know you achieved it?', type: 'textarea', placeholder: 'Define clear success criteria' },
      { key: 'currentState', label: 'Where are you now?', type: 'textarea', placeholder: 'Describe your current situation relative to this goal' },
      { key: 'progress', label: 'Progress updates', type: 'textarea', placeholder: 'Track your progress over time' },
      { key: 'milestones', label: 'Milestones', type: 'array', placeholder: 'Add milestone...' },
      { key: 'nextActions', label: 'Next actions to take', type: 'array', placeholder: 'Add next action...' },
      { key: 'blockers', label: 'Blockers & Challenges', type: 'array', placeholder: 'What is stopping you?' },
      { key: 'resources', label: 'Resources needed', type: 'array', placeholder: 'What do you need?' },
      { key: 'accountability', label: 'Accountability', type: 'text', placeholder: 'Who is holding you accountable?' },
      { key: 'relatedSkills', label: 'Skills Needed', type: 'array', placeholder: 'Skill name...' },
      { key: 'relatedProjects', label: 'Related Projects', type: 'array', placeholder: 'Project name...' },
      { key: 'inspiration', label: 'Inspiration & role models', type: 'array', placeholder: 'Who inspires you for this goal?' },
    ],
  },
  decision: {
    label: 'Decision',
    emoji: '⚖️',
    fields: [
      { key: 'description', label: 'What was the decision?', type: 'textarea', required: true, placeholder: 'Describe the decision you faced' },
      { key: 'title', label: 'Short Title (optional)', type: 'text', placeholder: 'A brief name for this decision' },
      { key: 'date', label: 'When did you decide?', type: 'date' },
      { key: 'context', label: 'Context & Background', type: 'textarea', required: true, placeholder: 'What led to this decision? What were the circumstances?' },
      { key: 'options', label: 'Options you considered', type: 'array', placeholder: 'Add option you considered...' },
      { key: 'choice', label: 'What you chose', type: 'text', placeholder: 'The specific choice you made' },
      { key: 'reasoning', label: 'Why did you choose this?', type: 'textarea', placeholder: 'Your reasoning and thought process' },
      { key: 'tradeoffs', label: 'Trade-offs you accepted', type: 'array', placeholder: 'What did you give up?' },
      { key: 'outcome', label: 'What happened as a result?', type: 'textarea', placeholder: 'The actual outcome' },
      { key: 'consequenceDate', label: 'When outcome was realized', type: 'date' },
      { key: 'wasItRight', label: 'In hindsight, was it the right choice?', type: 'select', options: ['definitely-yes', 'probably-yes', 'neutral', 'probably-no', 'definitely-no', 'too-early-to-tell'] },
      { key: 'reflection', label: 'Reflection & lessons learned', type: 'textarea', placeholder: 'What did you learn? Would you do it again?' },
      { key: 'whatWouldChange', label: 'What would you do differently?', type: 'textarea', placeholder: 'If you could go back...' },
      { key: 'category', label: 'Category', type: 'select', options: ['career', 'education', 'financial', 'personal', 'technical'], required: true },
      { key: 'impact', label: 'Impact Level', type: 'select', options: ['high', 'medium', 'low'], required: true },
      { key: 'peopleConsulted', label: 'People you consulted', type: 'array', placeholder: 'Who did you talk to?' },
      { key: 'relatedGoals', label: 'Related Goals', type: 'array', placeholder: 'Goal name...' },
      { key: 'relatedProjects', label: 'Related Projects', type: 'array', placeholder: 'Project name...' },
      { key: 'advice', label: 'Advice for others facing similar decisions', type: 'textarea', placeholder: 'What would you tell someone else?' },
    ],
  },
  person: {
    label: 'Person',
    emoji: '👤',
    fields: [
      { key: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'e.g., John Smith' },
      { key: 'nickname', label: 'Nickname or how you refer to them', type: 'text', placeholder: 'Optional nickname' },
      { key: 'relationship', label: 'Relationship Type', type: 'select', options: ['colleague', 'mentor', 'friend', 'family', 'professional-contact', 'other'], required: true },
      { key: 'context', label: 'How do you know them?', type: 'textarea', required: true, placeholder: 'The story of how you connected' },
      { key: 'howMet', label: 'How did you meet? (details)', type: 'textarea', placeholder: 'More details about meeting them' },
      { key: 'currentRelationship', label: 'Current relationship', type: 'textarea', placeholder: 'What is your relationship like now?' },
      { key: 'company', label: 'Company/Organization', type: 'text', placeholder: 'Where do they work?' },
      { key: 'role', label: 'Their Role/Title', type: 'text', placeholder: 'What do they do?' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Where are they based?' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'Contact email' },
      { key: 'phone', label: 'Phone', type: 'text', placeholder: 'Contact phone' },
      { key: 'socialLinks', label: 'Social media / LinkedIn', type: 'array', placeholder: 'Add link...' },
      { key: 'firstMetDate', label: 'When did you first meet?', type: 'date' },
      { key: 'lastContact', label: 'Last time you connected', type: 'date' },
      { key: 'sharedInterests', label: 'Shared interests', type: 'array', placeholder: 'What do you have in common?' },
      { key: 'thingsLearned', label: 'Things you learned from them', type: 'array', placeholder: 'Add insight...' },
      { key: 'howTheyHelped', label: 'How have they helped you?', type: 'textarea', placeholder: 'Describe their impact on you' },
      { key: 'howYouHelped', label: 'How have you helped them?', type: 'textarea', placeholder: 'What value have you provided?' },
      { key: 'interactions', label: 'Notable Interactions', type: 'array', placeholder: 'Add memorable interaction...' },
      { key: 'relatedProjects', label: 'Projects together', type: 'array', placeholder: 'Project name...' },
      { key: 'notes', label: 'Personal notes', type: 'textarea', placeholder: 'Anything else to remember about them' },
    ],
  },
  company: {
    label: 'Company',
    emoji: '🏢',
    fields: [
      { key: 'name', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g., Google, Acme Corp' },
      { key: 'industry', label: 'Industry', type: 'text', placeholder: 'e.g., Technology, Healthcare, Finance' },
      { key: 'relationship', label: 'Your Relationship', type: 'select', options: ['employer', 'client', 'partner', 'target', 'competitor', 'other'], required: true },
      { key: 'role', label: 'Your Role/Title', type: 'text', placeholder: 'What was/is your position?' },
      { key: 'department', label: 'Department/Team', type: 'text', placeholder: 'Which team were you on?' },
      { key: 'description', label: 'About the company', type: 'textarea', placeholder: 'What does this company do?' },
      { key: 'yourExperience', label: 'Your experience there', type: 'textarea', placeholder: 'Describe your time at this company' },
      { key: 'responsibilities', label: 'Key responsibilities', type: 'array', placeholder: 'Add responsibility...' },
      { key: 'achievements', label: 'Achievements & accomplishments', type: 'array', placeholder: 'Add achievement...' },
      { key: 'challenges', label: 'Challenges faced', type: 'array', placeholder: 'Add challenge...' },
      { key: 'reasonForLeaving', label: 'Reason for leaving (if applicable)', type: 'textarea', placeholder: 'Why did you leave?' },
      { key: 'startDate', label: 'Start Date', type: 'date' },
      { key: 'endDate', label: 'End Date', type: 'date' },
      { key: 'timeframe', label: 'Timeframe Description', type: 'text', placeholder: 'e.g., 2020-2023, 3 years' },
      { key: 'salary', label: 'Compensation (optional)', type: 'text', placeholder: 'Salary range or total comp' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Office location or remote' },
      { key: 'companySize', label: 'Company size', type: 'text', placeholder: 'e.g., Startup, 50-200, Enterprise' },
      { key: 'relatedPeople', label: 'People you worked with', type: 'array', placeholder: 'Person name...' },
      { key: 'relatedProjects', label: 'Projects worked on', type: 'array', placeholder: 'Project name...' },
      { key: 'relatedSkills', label: 'Skills developed', type: 'array', placeholder: 'Skill name...' },
      { key: 'wouldRecommend', label: 'Would you recommend working here?', type: 'select', options: ['yes', 'maybe', 'no'] },
    ],
  },
  event: {
    label: 'Event',
    emoji: '📅',
    fields: [
      { key: 'description', label: 'What happened?', type: 'textarea', required: true, placeholder: 'Describe the event in detail' },
      { key: 'title', label: 'Event Title (optional)', type: 'text', placeholder: 'Short name for this event' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'endDate', label: 'End Date (if spans time)', type: 'date' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'Where did this happen?' },
      { key: 'type', label: 'Event Type', type: 'select', options: ['milestone', 'achievement', 'setback', 'transition', 'learning'], required: true },
      { key: 'impact', label: 'Impact Level', type: 'select', options: ['high', 'medium', 'low'], required: true },
      { key: 'emotionalImpact', label: 'How did it make you feel?', type: 'textarea', placeholder: 'Describe your emotional response' },
      { key: 'whatLearned', label: 'What did you learn?', type: 'textarea', placeholder: 'Key takeaways from this event' },
      { key: 'whatChanged', label: 'What changed as a result?', type: 'textarea', placeholder: 'How did this event change things?' },
      { key: 'peopleInvolved', label: 'People involved', type: 'array', placeholder: 'Who was there?' },
      { key: 'relatedDecisions', label: 'Decisions triggered', type: 'array', placeholder: 'What decisions did this lead to?' },
      { key: 'photos', label: 'Photo links or descriptions', type: 'array', placeholder: 'Add photo reference...' },
    ],
  },
  interest: {
    label: 'Interest',
    emoji: '💡',
    fields: [
      { key: 'topic', label: 'Topic/Interest', type: 'text', required: true, placeholder: 'e.g., Philosophy, Rock Climbing, AI' },
      { key: 'description', label: 'Describe this interest', type: 'textarea', placeholder: 'What specifically interests you about this?' },
      { key: 'depth', label: 'How deep is your interest?', type: 'select', options: ['casual', 'moderate', 'deep'], required: true },
      { key: 'whyInterested', label: 'Why are you interested?', type: 'textarea', placeholder: 'What draws you to this topic?' },
      { key: 'howDiscovered', label: 'How did you discover this interest?', type: 'textarea', placeholder: 'The story of how you got into this' },
      { key: 'startedDate', label: 'When did this interest start?', type: 'date' },
      { key: 'timeSpent', label: 'How much time do you spend on this?', type: 'text', placeholder: 'e.g., 5 hours/week, daily, occasionally' },
      { key: 'activities', label: 'Activities you do related to this', type: 'array', placeholder: 'Add activity...' },
      { key: 'resources', label: 'Favorite resources (books, podcasts, etc.)', type: 'array', placeholder: 'Add resource...' },
      { key: 'communities', label: 'Communities or groups', type: 'array', placeholder: 'Add community...' },
      { key: 'goals', label: 'Goals related to this interest', type: 'array', placeholder: 'What do you want to achieve?' },
      { key: 'evidence', label: 'Evidence of this interest', type: 'array', placeholder: 'Projects, collections, achievements...' },
      { key: 'relatedSkills', label: 'Related Skills', type: 'array', placeholder: 'Skill name...' },
      { key: 'relatedPeople', label: 'People who share this interest', type: 'array', placeholder: 'Person name...' },
    ],
  },
};

// ============================================================================
// ARRAY INPUT COMPONENT
// ============================================================================

function ArrayInput({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string[]; 
  onChange: (val: string[]) => void; 
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
        >
          Add
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-xs text-white/80"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-white/40 hover:text-white/80"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN MODAL COMPONENT
// ============================================================================

export function NodeEditModal({ isOpen, onClose, onSave, editingNode }: NodeEditModalProps) {
  const [selectedType, setSelectedType] = useState<EntityType>('skill');
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or editing node changes
  useEffect(() => {
    if (isOpen) {
      if (editingNode) {
        setSelectedType(editingNode.type);
        setFormData({ ...editingNode.data });
      } else {
        setFormData({});
        setErrors({});
      }
    }
  }, [isOpen, editingNode]);

  const config = ENTITY_CONFIGS[selectedType];

  const handleTypeChange = (type: EntityType) => {
    setSelectedType(type);
    setFormData({});
    setErrors({});
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    for (const field of config.fields) {
      if (field.required) {
        const value = formData[field.key];
        if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    }

    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submit triggered, formData:', formData);
    
    if (!validateForm()) {
      console.log('Validation failed');
      return;
    }

    console.log('Validation passed, saving...');

    const now = new Date();
    const id = editingNode ? (editingNode.data as { id: string }).id : generateId(selectedType);
    
    // Build the entity with all required fields
    const entity: Record<string, unknown> = {
      ...formData,
      id,
      createdAt: editingNode ? (editingNode.data as { createdAt: Date }).createdAt : now,
      updatedAt: now,
      sources: (formData.sources as string[]) || [],
    };

    // Ensure array fields exist
    for (const field of config.fields) {
      if (field.type === 'array' && !entity[field.key]) {
        entity[field.key] = [];
      }
    }

    // Convert date strings to Date objects
    for (const field of config.fields) {
      if (field.type === 'date' && entity[field.key]) {
        entity[field.key] = new Date(entity[field.key] as string);
      }
    }

    console.log('Saving entity:', entity);
    onSave(selectedType, entity as unknown as EntityData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#0a0a0f] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">
            {editingNode ? 'Edit' : 'Add'} {config.emoji} {config.label}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type Selector (only when adding new) */}
        {!editingNode && (
          <div className="p-4 border-b border-white/10">
            <label className="block text-xs text-white/40 mb-2">Entity Type</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ENTITY_CONFIGS) as EntityType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedType === type
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {ENTITY_CONFIGS[type].emoji} {ENTITY_CONFIGS[type].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh]">
          <div className="p-4 space-y-4">
            {config.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-white/60 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    type="text"
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={(formData[field.key] as string) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="" className="bg-[#0a0a0f]">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#0a0a0f]">
                        {opt.charAt(0).toUpperCase() + opt.slice(1).replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={formData[field.key] ? new Date(formData[field.key] as string).toISOString().split('T')[0] : ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  />
                )}

                {field.type === 'number' && (
                  <input
                    type="number"
                    value={(formData[field.key] as number) || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value ? Number(e.target.value) : undefined)}
                    placeholder={field.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                )}

                {field.type === 'array' && (
                  <ArrayInput
                    value={(formData[field.key] as string[]) || []}
                    onChange={(val) => handleFieldChange(field.key, val)}
                    placeholder={field.placeholder}
                  />
                )}

                {errors[field.key] && (
                  <p className="text-red-400 text-xs mt-1">{errors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-white/10 bg-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 text-purple-200 rounded-lg text-sm transition-colors"
            >
              {editingNode ? 'Save Changes' : 'Add to Graph'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
