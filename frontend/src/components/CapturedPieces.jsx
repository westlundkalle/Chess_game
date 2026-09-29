import React from 'react';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };

const PIECE_UNICODE = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛'
};

export default function CapturedPieces({ captured = { white: [], black: [] } }) {
  const whiteList = captured.white || [];
  const blackList = captured.black || [];

  // Calculate material difference
  let whiteMaterial = 0;
  whiteList.forEach(p => {
    whiteMaterial += PIECE_VALUES[p.toLowerCase()] || 0;
  });

  let blackMaterial = 0;
  blackList.forEach(p => {
    blackMaterial += PIECE_VALUES[p.toLowerCase()] || 0;
  });

  const diff = whiteMaterial - blackMaterial;

  return (
    <div className="flex flex-col gap-1.5 text-xs py-1">
      {/* Captured by White (Black pieces taken) */}
      <div className="flex items-center justify-between min-h-[24px] px-2 py-1 rounded bg-slate-900/60 border border-slate-800/50">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-400 text-[10px] uppercase font-semibold mr-1">White:</span>
          {whiteList.length === 0 ? (
            <span className="text-slate-600 text-[11px]">—</span>
          ) : (
            whiteList.map((piece, idx) => (
              <span key={idx} className="text-slate-300 text-base leading-none select-none">
                {PIECE_UNICODE[piece.toLowerCase()] || piece}
              </span>
            ))
          )}
        </div>
        {diff > 0 && (
          <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
            +{diff}
          </span>
        )}
      </div>

      {/* Captured by Black (White pieces taken) */}
      <div className="flex items-center justify-between min-h-[24px] px-2 py-1 rounded bg-slate-900/60 border border-slate-800/50">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-slate-400 text-[10px] uppercase font-semibold mr-1">Black:</span>
          {blackList.length === 0 ? (
            <span className="text-slate-600 text-[11px]">—</span>
          ) : (
            blackList.map((piece, idx) => (
              <span key={idx} className="text-slate-300 text-base leading-none select-none">
                {PIECE_UNICODE[piece.toUpperCase()] || piece}
              </span>
            ))
          )}
        </div>
        {diff < 0 && (
          <span className="text-emerald-400 font-bold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
            +{Math.abs(diff)}
          </span>
        )}
      </div>
    </div>
  );
}
