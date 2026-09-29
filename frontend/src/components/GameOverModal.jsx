import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, AlertCircle } from 'lucide-react';

export default function GameOverModal({ isOpen, title, subtitle, isWinner, onPlayAgain }) {
  useEffect(() => {
    if (isOpen && isWinner) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback if canvas is unavailable
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl relative">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
          {isWinner ? (
            <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
          ) : (
            <AlertCircle className="w-8 h-8 text-amber-500" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-300 mb-6">{subtitle}</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again / Rematch
          </button>
        </div>
      </div>
    </div>
  );
}
