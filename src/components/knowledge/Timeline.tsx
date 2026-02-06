'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TimelineEvent, PersonalKnowledge, Decision, Project } from '@/lib/knowledge/types';

// ============================================================================
// TYPES
// ============================================================================

type ZoomLevel = 'decade' | 'year' | 'month' | 'week';

interface TimelineItem {
  id: string;
  date: Date;
  type: 'event' | 'decision' | 'project-start' | 'project-end';
  title: string;
  description?: string;
  impact?: 'high' | 'medium' | 'low';
  category?: string;
  data: TimelineEvent | Decision | Project;
}

interface TimelineProps {
  knowledge: PersonalKnowledge;
  onItemClick?: (item: TimelineItem) => void;
  selectedItemId?: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTimelineItems(knowledge: PersonalKnowledge): TimelineItem[] {
  const items: TimelineItem[] = [];
  
  // Add events
  for (const event of knowledge.events) {
    if (event.date) {
      items.push({
        id: event.id,
        date: new Date(event.date),
        type: 'event',
        title: event.description,
        impact: event.impact,
        category: event.type,
        data: event,
      });
    }
  }
  
  // Add decisions
  for (const decision of knowledge.decisions) {
    if (decision.date) {
      items.push({
        id: decision.id,
        date: new Date(decision.date),
        type: 'decision',
        title: decision.description,
        description: decision.context,
        impact: decision.impact,
        category: decision.category,
        data: decision,
      });
    }
  }
  
  // Add project milestones
  for (const project of knowledge.projects) {
    if (project.startDate) {
      items.push({
        id: `${project.id}-start`,
        date: new Date(project.startDate),
        type: 'project-start',
        title: `Started: ${project.name}`,
        description: project.description,
        data: project,
      });
    }
    if (project.endDate) {
      items.push({
        id: `${project.id}-end`,
        date: new Date(project.endDate),
        type: 'project-end',
        title: `Completed: ${project.name}`,
        description: project.outcomes.join(', '),
        data: project,
      });
    }
  }
  
  // Sort by date
  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function formatDate(date: Date, zoomLevel: ZoomLevel): string {
  switch (zoomLevel) {
    case 'decade':
      return date.getFullYear().toString();
    case 'year':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'week':
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

function getItemColor(type: TimelineItem['type']): string {
  switch (type) {
    case 'event': return 'bg-teal-500';
    case 'decision': return 'bg-amber-500';
    case 'project-start': return 'bg-purple-500';
    case 'project-end': return 'bg-green-500';
  }
}

function getImpactSize(impact?: 'high' | 'medium' | 'low'): string {
  switch (impact) {
    case 'high': return 'w-4 h-4';
    case 'medium': return 'w-3 h-3';
    default: return 'w-2 h-2';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Timeline({ knowledge, onItemClick, selectedItemId }: TimelineProps) {
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  const items = useMemo(() => getTimelineItems(knowledge), [knowledge]);
  
  // Group items by time period based on zoom level
  const groupedItems = useMemo(() => {
    const groups = new Map<string, TimelineItem[]>();
    
    for (const item of items) {
      let key: string;
      switch (zoomLevel) {
        case 'decade':
          key = `${Math.floor(item.date.getFullYear() / 10) * 10}s`;
          break;
        case 'year':
          key = item.date.getFullYear().toString();
          break;
        case 'month':
          key = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(item.date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    return groups;
  }, [items, zoomLevel]);
  
  // Get date range
  const dateRange = useMemo(() => {
    if (items.length === 0) return null;
    return {
      start: items[0].date,
      end: items[items.length - 1].date,
    };
  }, [items]);
  
  const handleZoomIn = useCallback(() => {
    const levels: ZoomLevel[] = ['decade', 'year', 'month', 'week'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  }, [zoomLevel]);
  
  const handleZoomOut = useCallback(() => {
    const levels: ZoomLevel[] = ['decade', 'year', 'month', 'week'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1]);
    }
  }, [zoomLevel]);
  
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📅</div>
          <div>No timeline events yet</div>
          <div className="text-sm text-gray-600 mt-1">Import data to see your timeline</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-white">Timeline</h3>
          {dateRange && (
            <span className="text-xs text-gray-500">
              {dateRange.start.getFullYear()} - {dateRange.end.getFullYear()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel === 'decade'}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 text-xs text-gray-400 min-w-[60px] text-center capitalize">
              {zoomLevel}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel === 'week'}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Zoom level buttons */}
          <div className="flex items-center gap-1">
            {(['decade', 'year', 'month', 'week'] as ZoomLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  zoomLevel === level 
                    ? 'bg-purple-500/20 text-purple-400' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Timeline content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-800" />
          
          {/* Timeline groups */}
          <div className="space-y-6">
            {Array.from(groupedItems.entries()).map(([period, periodItems]) => (
              <div key={period} className="relative">
                {/* Period marker */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center z-10">
                    <span className="text-xs text-gray-400 font-medium">
                      {zoomLevel === 'decade' ? period.slice(0, 2) : 
                       zoomLevel === 'year' ? period.slice(2) :
                       period.split('-')[1] || period.slice(5)}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white">{period}</span>
                  <span className="text-xs text-gray-500">({periodItems.length} events)</span>
                </div>
                
                {/* Period items */}
                <div className="ml-12 space-y-2">
                  {periodItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-all
                        ${selectedItemId === item.id 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* Type indicator */}
                        <div className={`${getItemColor(item.type)} ${getImpactSize(item.impact)} rounded-full mt-1.5 flex-shrink-0`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">
                              {item.title}
                            </span>
                            {item.category && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded capitalize">
                                {item.category}
                              </span>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="text-[10px] text-gray-600 mt-1">
                            {formatDate(item.date, zoomLevel)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Event</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Decision</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Project Start</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Project End</span>
          </div>
        </div>
      </div>
    </div>
  );
}
