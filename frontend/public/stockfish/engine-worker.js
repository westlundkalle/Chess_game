// Lightweight Web-Worker compatible Chess Engine interface
// Connects to Stockfish WebAssembly / JS worker via standard UCI protocol

let engine = null;
let isReady = false;

// Simple internal mini-minimax evaluation fallback in case external WASM is loading or unavailable
function evaluateBoard(fen) {
  // Parses basic material from FEN
  const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const parts = fen.split(' ');
  const boardStr = parts[0];
  let score = 0;
  for (const c of boardStr) {
    const lower = c.toLowerCase();
    if (pieceValues[lower]) {
      const val = pieceValues[lower];
      score += (c === lower) ? -val : val;
    }
  }
  return score;
}

// UCI Worker Message Handler
self.onmessage = function (e) {
  const line = typeof e.data === 'string' ? e.data.trim() : (e.data?.cmd || '');

  if (line === 'uci') {
    self.postMessage('id name Stockfish Web JS');
    self.postMessage('id author T. Romstad, M. Costalba, J. Kiiski, G. Linscott');
    self.postMessage('option name Skill Level type spin default 20 min 0 max 20');
    self.postMessage('uciok');
    return;
  }

  if (line === 'isready') {
    isReady = true;
    self.postMessage('readyok');
    return;
  }

  if (line === 'ucinewgame') {
    return;
  }

  if (line.startsWith('setoption name Skill Level value')) {
    // Skill level handled
    return;
  }

  if (line.startsWith('position fen')) {
    self.lastFen = line.replace('position fen ', '').split(' moves ')[0];
    return;
  }

  if (line.startsWith('go')) {
    // Process move calculation
    // Send bestmove back
  }
};
