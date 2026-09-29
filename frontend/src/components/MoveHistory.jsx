import React, { useEffect, useRef } from 'react';
import { History } from 'lucide-react';

export default function MoveHistory({ history = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  // Group moves into pairs: [ { moveNum: 1, white: 'e4', black: 'e5' } ]
  const pairedMoves = [];
  for (let i = 0; i < history.length; i += 2) {
    const whiteMove = typeof history[i] === 'string' ? history[i] : history[i]?.san || '';
    const blackMove = history[i + 1]
      ? (typeof history[i + 1] === 'string' ? history[i + 1] : history[i + 1]?.san || '')
      : '';
    pairedMoves.push({
      num: Math.floor(i / 2) + 1,
      white: whiteMove,
      black: blackMove
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-64 shadow-sm">
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800 mb-2">
        <History className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200">Move Notation</h3>
        <span className="text-xs text-slate-500 ml-auto">{history.length} ply</span>
      </div>

      <div ref={containerRef} className="overflow-y-auto flex-1 pr-1 space-y-0.5 text-xs font-mono">
        {pairedMoves.length === 0 ? (
          <div className="text-slate-500 italic text-center py-8">No moves played yet</div>
        ) : (
          pairedMoves.map((pair, idx) => (
            <div
              key={idx}
              className={`flex items-center px-2 py-1 rounded transition-colors ${
                idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-transparent'
              }`}
            >
              <span className="w-10 text-slate-500 select-none">{pair.num}.</span>
              <span className={`w-20 font-medium ${pair.black ? 'text-slate-200' : 'text-amber-400 font-bold'}`}>
                {pair.white}
              </span>
              <span className="w-20 font-medium text-slate-200">
                {pair.black || ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
