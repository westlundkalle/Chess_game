import React from 'react';
import { DIFFICULTY_PRESETS } from '../hooks/useStockfish';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function DifficultySelector({ difficulty, setDifficulty, isThinking }) {
  const current = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          AI Engine Difficulty
        </label>
        <span className="text-xs bg-amber-500/10 text-amber-400 font-mono font-medium px-2 py-0.5 rounded-full border border-amber-500/20">
          Depth {current.depth} • Skill {current.skill}/20
        </span>
      </div>

      {/* Preset pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 mb-3">
        {Object.entries(DIFFICULTY_PRESETS).map(([key, val]) => {
          const isSelected = difficulty === key;
          return (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left truncate ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="truncate">{val.name.split(' ')[0]}</div>
              <div className={`text-[10px] opacity-80 ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                {val.name.split(' ')[1] || ''}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{current.description}</span>
      </div>
    </div>
  );
}
