'use client';

import { useMemo } from 'react';
import { useManifoldStore } from '@/store/useManifoldStore';
import { ARCHETYPES } from '@/engine';

export function TimelineScrubber() {
  const {
    currentYear,
    goalYear,
    userAge,
    viewYear,
    setViewYear,
    archetypeSchedule,
    displayPaths,
    goldenPath,
  } = useManifoldStore();

  const totalYears = goalYear - currentYear;
  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y <= goalYear; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentYear, goalYear]);

  // Get state at view year for golden path
  const goldenPathStateAtYear = useMemo(() => {
    if (!goldenPath) return null;
    const yearIndex = viewYear - currentYear;
    if (yearIndex < 0 || yearIndex >= goldenPath.states.length) return null;
    return goldenPath.states[yearIndex];
  }, [goldenPath, viewYear, currentYear]);

  // Get active archetypes at view year
  const activeArchetypesAtYear = useMemo(() => {
    return archetypeSchedule
      .filter(s => viewYear >= s.startYear && viewYear <= s.endYear)
      .map(s => ARCHETYPES[s.archetypeId])
      .filter(Boolean);
  }, [archetypeSchedule, viewYear]);

  const progress = ((viewYear - currentYear) / totalYears) * 100;

  return (
    <div className="bg-black/90 backdrop-blur-xl border-t border-white/10 px-6 py-4">
      <div className="max-w-6xl mx-auto">
        {/* Year display and state preview */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-2xl font-bold text-white">{viewYear}</div>
              <div className="text-xs text-gray-500">Age {userAge + (viewYear - currentYear)}</div>
            </div>
            
            {/* Active archetypes at this year */}
            <div className="flex items-center gap-2">
              {activeArchetypesAtYear.map(arch => (
                <span
                  key={arch.id}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: arch.color + '33',
                    color: arch.color,
                  }}
                >
                  {arch.name}
                </span>
              ))}
              {activeArchetypesAtYear.length === 0 && (
                <span className="text-xs text-gray-500">No archetypes active</span>
              )}
            </div>
          </div>

          {/* State preview at this year */}
          {goldenPathStateAtYear && (
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center">
                <div className="text-amber-400 font-medium">
                  {Math.round(((goldenPathStateAtYear.Wl + goldenPathStateAtYear.We) / 2) * 100)}%
                </div>
                <div className="text-gray-500">Wealth</div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 font-medium">
                  {Math.round(goldenPathStateAtYear.V * 100)}%
                </div>
                <div className="text-gray-500">Vitality</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 font-medium">
                  {Math.round(goldenPathStateAtYear.I * 100)}%
                </div>
                <div className="text-gray-500">Skills</div>
              </div>
              <div className="text-center">
                <div className={`font-medium ${goldenPathStateAtYear.R < 0.4 ? 'text-red-400' : 'text-pink-400'}`}>
                  {Math.round(goldenPathStateAtYear.R * 100)}%
                </div>
                <div className="text-gray-500">Resilience</div>
              </div>
            </div>
          )}
        </div>

        {/* Timeline slider */}
        <div className="relative">
          {/* Track background */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            {/* Progress fill */}
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Year markers */}
          <div className="absolute inset-x-0 top-0 h-2 flex">
            {years.map((year, i) => {
              const isCurrentYear = year === currentYear;
              const isGoalYear = year === goalYear;
              const isViewYear = year === viewYear;
              const position = (i / totalYears) * 100;
              
              return (
                <div
                  key={year}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${position}%` }}
                >
                  {/* Tick mark */}
                  <div 
                    className={`w-0.5 transition-all ${
                      isViewYear ? 'h-4 -mt-1 bg-white' : 
                      isCurrentYear || isGoalYear ? 'h-3 -mt-0.5 bg-white/50' : 
                      'h-2 bg-white/20'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Slider input */}
          <input
            type="range"
            min={currentYear}
            max={goalYear}
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
          />

          {/* Year labels */}
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span>{currentYear} (Now)</span>
            <span>{Math.floor((currentYear + goalYear) / 2)}</span>
            <span>{goalYear} (Goal)</span>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setViewYear(currentYear)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              viewYear === currentYear 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Start
          </button>
          {[1, 2, 5].map(offset => {
            const year = currentYear + offset;
            if (year > goalYear) return null;
            return (
              <button
                key={offset}
                onClick={() => setViewYear(year)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  viewYear === year 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                +{offset}y
              </button>
            );
          })}
          <button
            onClick={() => setViewYear(goalYear)}
            className={`px-3 py-1 rounded text-xs transition-colors ${
              viewYear === goalYear 
                ? 'bg-white/20 text-white' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Goal
          </button>
        </div>
      </div>
    </div>
  );
}
