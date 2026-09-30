import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AiModePage from './pages/AiModePage';
import PracticeModePage from './pages/PracticeModePage';
import MultiplayerPage from './pages/MultiplayerPage';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('room') || params.get('join')) return 'multiplayer';
    } catch {}
    return 'ai';
  });
  const [isServerOnline, setIsServerOnline] = useState(false);

  // Poll backend health status
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/health');
        if (res.ok) {
          setIsServerOnline(true);
        } else {
          setIsServerOnline(false);
        }
      } catch {
        setIsServerOnline(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isServerOnline={isServerOnline}
      />

      <main className="flex-1">
        {activeTab === 'ai' && <AiModePage />}
        {activeTab === 'practice' && <PracticeModePage />}
        {activeTab === 'multiplayer' && <MultiplayerPage />}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>Grandmaster Arena • Built with React, TailwindCSS, Stockfish.js & Socket.io</p>
      </footer>
    </div>
  );
}
