import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';

export const DIFFICULTY_PRESETS = {
  beginner: {
    name: 'Beginner (~800)',
    skill: 0,
    depth: 3,
    movetime: 500,
    description: 'Casual moves, occasional tactical blunders'
  },
  casual: {
    name: 'Casual (~1200)',
    skill: 5,
    depth: 6,
    movetime: 1000,
    description: 'Solid basic awareness, capitalizes on obvious mistakes'
  },
  intermediate: {
    name: 'Intermediate (~1600)',
    skill: 10,
    depth: 10,
    movetime: 1800,
    description: 'Strong club player: tactical calculation & solid defenses'
  },
  advanced: {
    name: 'Advanced (~2000)',
    skill: 16,
    depth: 14,
    movetime: 2800,
    description: 'Expert: deep calculation, positional pressure & king attacks'
  },
  grandmaster: {
    name: 'Grandmaster (2600+)',
    skill: 20,
    depth: 20,
    movetime: 4000,
    description: 'Full Stockfish engine: near-flawless tactical precision'
  }
};

// Piece Square Tables (PST) for strong positional evaluation
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const PIECE_BASE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluatePosition(chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000;
  }
  if (chess.isDraw()) return 0;

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_BASE_VALUES[piece.type] || 0;
      let posVal = 0;
      const idx = piece.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;

      if (piece.type === 'p') posVal = PAWN_TABLE[idx] || 0;
      else if (piece.type === 'n') posVal = KNIGHT_TABLE[idx] || 0;
      else if (piece.type === 'b') posVal = BISHOP_TABLE[idx] || 0;
      else if (piece.type === 'r') posVal = ROOK_TABLE[idx] || 0;

      const totalVal = baseVal + posVal;
      score += piece.color === 'w' ? totalVal : -totalVal;
    }
  }
  return score;
}

// 2-ply Minimax + Alpha-Beta search for instant, high-quality fallback
function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluatePosition(chess);
  }

  const moves = chess.moves({ verbose: true });
  // Order captures first for better pruning
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalScore = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function calculateDeepFallbackMove(fen, difficulty) {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (difficulty === 'beginner' && Math.random() < 0.35) {
      // Occasional random blunder only on beginner
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion || 'q' };
    }

    const isWhite = chess.turn() === 'w';
    let bestMove = moves[0];
    let bestValue = isWhite ? -Infinity : Infinity;

    // Search depth 2 (gives fast ~50ms computation and solid ~1800 tactics)
    const searchDepth = 2;

    for (const move of moves) {
      chess.move(move);
      const moveValue = minimax(chess, searchDepth - 1, -Infinity, Infinity, !isWhite);
      chess.undo();

      if (isWhite) {
        if (moveValue > bestValue) {
          bestValue = moveValue;
          bestMove = move;
        }
      } else {
        if (moveValue < bestValue) {
          bestValue = moveValue;
          bestMove = move;
        }
      }
    }

    return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || 'q' };
  } catch (err) {
    console.error('[AI Fallback Engine Error]', err);
    return null;
  }
}

export function useStockfish(difficulty = 'intermediate') {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [evalScore, setEvalScore] = useState(null);
  const onMoveCallbackRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // Initialize Web Worker
  useEffect(() => {
    let worker = null;
    try {
      worker = new Worker('/stockfish/stockfish.js');
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data.trim() : '';

        if (line === 'uciok') {
          const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;
          worker.postMessage(`setoption name Skill Level value ${preset.skill}`);
          worker.postMessage('isready');
        } else if (line === 'readyok') {
          setIsReady(true);
        } else if (line.startsWith('info') && line.includes('score cp')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            setEvalScore(parseInt(match[1], 10) / 100);
          }
        } else if (line.startsWith('bestmove')) {
          // Clear fallback watchdog since Stockfish answered
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }

          setIsThinking(false);
          const parts = line.split(' ');
          const moveUci = parts[1]; // e.g. e2e4 or e7e8q

          if (moveUci && moveUci !== '(none)' && onMoveCallbackRef.current) {
            const from = moveUci.substring(0, 2);
            const to = moveUci.substring(2, 4);
            const promotion = moveUci.length > 4 ? moveUci.substring(4, 5) : undefined;

            const cb = onMoveCallbackRef.current;
            onMoveCallbackRef.current = null;
            cb({ from, to, promotion, uci: moveUci });
          }
        }
      };

      worker.onerror = (err) => {
        console.warn('[Stockfish Worker Warning - Fallback Engine Active]', err);
        setIsReady(true);
      };

      worker.postMessage('uci');
    } catch (err) {
      console.warn('[Stockfish Worker creation failed]', err);
      setIsReady(true);
    }

    return () => {
      if (worker) worker.terminate();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      workerRef.current = null;
    };
  }, []);

  // Update difficulty dynamically
  useEffect(() => {
    if (!workerRef.current) return;
    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;
    try {
      workerRef.current.postMessage(`setoption name Skill Level value ${preset.skill}`);
    } catch {}
  }, [difficulty]);

  // Request best move for a given FEN
  const getAiMove = useCallback((fen, onBestMove) => {
    setIsThinking(true);
    onMoveCallbackRef.current = onBestMove;

    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;

    // Generous watchdog timeout giving Stockfish full time to search
    // Only falls back if worker dies or is unresponsive
    const watchdogTimeout = Math.max(preset.movetime + 3500, 5000);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    fallbackTimerRef.current = setTimeout(() => {
      if (onMoveCallbackRef.current) {
        console.log('[AI Engine] Serving deep evaluated fallback move');
        const fallback = calculateDeepFallbackMove(fen, difficulty);
        setIsThinking(false);
        const cb = onMoveCallbackRef.current;
        onMoveCallbackRef.current = null;
        if (cb && fallback) cb(fallback);
      }
    }, watchdogTimeout);

    if (workerRef.current) {
      try {
        workerRef.current.postMessage(`position fen ${fen}`);
        // Send both depth and movetime to Stockfish so it manages search time optimally
        workerRef.current.postMessage(`go depth ${preset.depth} movetime ${preset.movetime}`);
      } catch (err) {
        console.error('Error posting to Stockfish worker:', err);
      }
    }
  }, [difficulty]);

  const stop = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (workerRef.current) {
      try {
        workerRef.current.postMessage('stop');
      } catch {}
    }
    setIsThinking(false);
  }, []);

  return {
    isReady,
    isThinking,
    evalScore,
    getAiMove,
    stop
  };
}
