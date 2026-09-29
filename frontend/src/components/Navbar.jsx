import React from 'react';
import { Bot, Swords, Dumbbell, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isServerOnline }) {
  const tabs = [
    { id: 'ai', label: 'Play vs AI', icon: Bot, badge: 'Stockfish' },
    { id: 'practice', label: 'Practice Puzzles', icon: Dumbbell, badge: 'Tactics' },
    { id: 'multiplayer', label: 'Play a Friend', icon: Swords, badge: 'Live' }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('ai')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-slate-950">
              <path d="M19 22H5v-2h14v2zm-2-4H7l1-7h1.5l.5-3.5L8.5 7h7l-1.5.5.5 3.5H16l1 7zM12 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              Grandmaster Arena
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Full-Stack Web Chess & AI Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label.split(' ')[0]}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wide ${
                      isActive ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-400 hidden sm:inline">
            {isServerOnline ? 'Multiplayer Online' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
}
