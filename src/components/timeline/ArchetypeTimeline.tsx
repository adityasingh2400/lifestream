'use client';

import { useMemo, useState } from 'react';
import { useManifoldStore, ArchetypeSchedule } from '@/store/useManifoldStore';
import { getAllArchetypes, ARCHETYPES } from '@/engine';

interface ArchetypeTimelineProps {
  compact?: boolean;
}

export function ArchetypeTimeline({ compact = false }: ArchetypeTimelineProps) {
  const {
    currentYear,
    goalYear,
    userAge,
    archetypeSchedule,
    addArchetypeSchedule,
    removeArchetypeSchedule,
    updateArchetypeSchedule,
    setGoalYear,
  } = useManifoldStore();

  const [dragState, setDragState] = useState<{
    id: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);

  const allArchetypes = getAllArchetypes();
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y <= goalYear; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentYear, goalYear]);

  const totalYears = goalYear - currentYear;
  const yearWidth = 100 / totalYears;

  const schedulesByArchetype = useMemo(() => {
    const grouped = new Map<string, ArchetypeSchedule[]>();
    for (const schedule of archetypeSchedule) {
      const existing = grouped.get(schedule.archetypeId) || [];
      grouped.set(schedule.archetypeId, [...existing, schedule]);
    }
    return grouped;
  }, [archetypeSchedule]);

  const getArchetypeColor = (archetypeId: string) => {
    return ARCHETYPES[archetypeId]?.color || '#666';
  };

  const getBarStyle = (schedule: ArchetypeSchedule) => {
    const startOffset = ((schedule.startYear - currentYear) / totalYears) * 100;
    const width = ((schedule.endYear - schedule.startYear) / totalYears) * 100;
    return {
      left: `${startOffset}%`,
      width: `${Math.max(width, 2)}%`,
    };
  };

  const handleDragStart = (
    e: React.MouseEvent,
    schedule: ArchetypeSchedule,
    type: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.preventDefault();
    setDragState({
      id: schedule.id,
      type,
      startX: e.clientX,
      originalStart: schedule.startYear,
      originalEnd: schedule.endYear,
    });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragState) return;

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaYears = Math.round((deltaX / rect.width) * totalYears);

    const schedule = archetypeSchedule.find(s => s.id === dragState.id);
    if (!schedule) return;

    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;

    if (dragState.type === 'move') {
      newStart = Math.max(currentYear, Math.min(goalYear - 1, dragState.originalStart + deltaYears));
      newEnd = newStart + (dragState.originalEnd - dragState.originalStart);
      if (newEnd > goalYear) {
        newEnd = goalYear;
        newStart = newEnd - (dragState.originalEnd - dragState.originalStart);
      }
    } else if (dragState.type === 'resize-start') {
      newStart = Math.max(currentYear, Math.min(newEnd - 1, dragState.originalStart + deltaYears));
    } else if (dragState.type === 'resize-end') {
      newEnd = Math.max(newStart + 1, Math.min(goalYear, dragState.originalEnd + deltaYears));
    }

    updateArchetypeSchedule(dragState.id, { startYear: newStart, endYear: newEnd });
  };

  const handleDragEnd = () => {
    setDragState(null);
  };

  const handleAddArchetype = (archetypeId: string) => {
    addArchetypeSchedule({
      archetypeId,
      startYear: currentYear,
      endYear: Math.min(currentYear + 3, goalYear),
    });
  };

  if (compact) {
    return (
      <div className="bg-gray-900/80 backdrop-blur rounded-xl p-3 border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white">Life Timeline</span>
          <span className="text-[10px] text-gray-500">{currentYear} → {goalYear}</span>
        </div>

        {/* Compact timeline */}
        <div
          className="relative bg-gray-800/50 rounded h-12 cursor-crosshair"
          onMouseMove={dragState ? handleDragMove : undefined}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {/* Year markers (fewer) */}
          <div className="absolute inset-0 flex">
            {years.filter((_, i) => i % 2 === 0).map((year) => (
              <div
                key={year}
                className="absolute text-[8px] text-gray-600 top-0"
                style={{ left: `${((year - currentYear) / totalYears) * 100}%` }}
              >
                {year.toString().slice(-2)}
              </div>
            ))}
          </div>

          {/* Archetype bars - stacked */}
          <div className="absolute inset-x-0 top-3 bottom-1 flex flex-col gap-0.5 px-0.5">
            {Array.from(schedulesByArchetype.entries()).map(([archetypeId, schedules]) => (
              <div key={archetypeId} className="relative flex-1 min-h-[10px]">
                {schedules.map((schedule) => {
                  const archetype = ARCHETYPES[archetypeId];
                  const style = getBarStyle(schedule);
                  const isActive = dragState?.id === schedule.id;

                  return (
                    <div
                      key={schedule.id}
                      className={`absolute h-full rounded flex items-center justify-between px-1 cursor-move ${
                        isActive ? 'ring-1 ring-white z-10' : ''
                      }`}
                      style={{
                        ...style,
                        backgroundColor: getArchetypeColor(archetypeId),
                      }}
                      onMouseDown={(e) => handleDragStart(e, schedule, 'move')}
                    >
                      <span className="text-[8px] font-medium text-white truncate">
                        {archetype?.name || archetypeId}
                      </span>
                      <button
                        className="text-white/60 hover:text-white text-[10px] ml-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeArchetypeSchedule(schedule.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Compact add buttons */}
        <div className="flex flex-wrap gap-1 mt-2">
          {allArchetypes.slice(0, 4).map((archetype) => (
            <button
              key={archetype.id}
              onClick={() => handleAddArchetype(archetype.id)}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-all hover:scale-105"
              style={{
                backgroundColor: archetype.color + '33',
                color: archetype.color,
              }}
            >
              +{archetype.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Life Timeline</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Age {userAge}</span>
          <span>→</span>
          <span>Age {userAge + totalYears}</span>
        </div>
      </div>

      {/* Year markers */}
      <div className="relative h-6 mb-2">
        {years.map((year, i) => (
          <div
            key={year}
            className="absolute text-xs text-gray-500 transform -translate-x-1/2"
            style={{ left: `${(i / totalYears) * 100}%` }}
          >
            {year}
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div
        className="relative bg-gray-800/30 rounded-lg min-h-[100px] cursor-crosshair"
        onMouseMove={dragState ? handleDragMove : undefined}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex">
          {years.map((year) => (
            <div
              key={year}
              className="border-l border-gray-700/50 h-full"
              style={{ width: `${yearWidth}%` }}
            />
          ))}
        </div>

        {/* Archetype bars */}
        <div className="relative p-2 space-y-2">
          {Array.from(schedulesByArchetype.entries()).map(([archetypeId, schedules]) => (
            <div key={archetypeId} className="relative h-8">
              {schedules.map((schedule) => {
                const archetype = ARCHETYPES[archetypeId];
                const style = getBarStyle(schedule);
                const isActive = dragState?.id === schedule.id;

                return (
                  <div
                    key={schedule.id}
                    className={`absolute h-full rounded-md flex items-center justify-between px-2 cursor-move transition-shadow ${
                      isActive ? 'ring-2 ring-white shadow-lg z-10' : ''
                    }`}
                    style={{
                      ...style,
                      backgroundColor: getArchetypeColor(archetypeId),
                    }}
                    onMouseDown={(e) => handleDragStart(e, schedule, 'move')}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-l-md"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, schedule, 'resize-start');
                      }}
                    />

                    <span className="text-xs font-medium text-white truncate px-2">
                      {archetype?.name || archetypeId}
                    </span>

                    <button
                      className="text-white/60 hover:text-white text-xs ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArchetypeSchedule(schedule.id);
                      }}
                    >
                      ×
                    </button>

                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 rounded-r-md"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, schedule, 'resize-end');
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          {archetypeSchedule.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-4">
              Click an archetype below to add it to your timeline
            </div>
          )}
        </div>
      </div>

      {/* Add archetype buttons */}
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-2">Add Archetype:</div>
        <div className="flex flex-wrap gap-2">
          {allArchetypes.map((archetype) => (
            <button
              key={archetype.id}
              onClick={() => handleAddArchetype(archetype.id)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105 hover:shadow-lg"
              style={{
                backgroundColor: archetype.color + '33',
                borderColor: archetype.color,
                borderWidth: '1px',
                color: archetype.color,
              }}
            >
              + {archetype.name}
            </button>
          ))}
        </div>
      </div>

      {/* Goal year slider */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Planning Horizon</span>
          <span>{totalYears} years (until {goalYear})</span>
        </div>
        <input
          type="range"
          min={currentYear + 2}
          max={currentYear + 20}
          value={goalYear}
          onChange={(e) => setGoalYear(Number(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  );
}
