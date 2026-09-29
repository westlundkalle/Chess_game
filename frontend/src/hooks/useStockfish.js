import { useEffect, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';

export const DIFFICULTY_PRESETS = {
  beginner: { name: 'Beginner (~800)', skill: 1, depth: 2, description: 'Makes quick developing moves, occasional blunders' },
  casual: { name: 'Casual (~1200)', skill: 5, depth: 5, description: 'Basic tactical awareness and captures' },
  intermediate: { name: 'Intermediate (~1600)', skill: 10, depth: 8, description: 'Solid positional play, rarely misses tactics' },
  advanced: { name: 'Advanced (~2000)', skill: 15, depth: 12, description: 'Strong tactical calculation and defense' },
  grandmaster: { name: 'Grandmaster (2600+)', skill: 20, depth: 18, description: 'Deep calculation, near-flawless' }
};

// Piece value heuristics for fallback evaluation
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function calculateFallbackMove(fen, difficulty) {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (difficulty === 'beginner') {
      // 40% random move for Beginner to simulate human novice blunders
      if (Math.random() < 0.4) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion || 'q' };
      }
    }

    // Evaluate each legal move
    let bestScore = -Infinity;
    let bestMoves = [];

    const isWhite = chess.turn() === 'w';

    for (const move of moves) {
      chess.move(move);
      let score = 0;

      // Checkmate is immediate highest priority
      if (chess.isCheckmate()) {
        score = 999999;
      } else if (chess.isDraw()) {
        score = 0;
      } else {
        // Material capture bonus
        if (move.captured) {
          score += (PIECE_VALUES[move.captured] || 100) * 10 - (PIECE_VALUES[move.piece] || 100);
        }

        // Center control bonus (e4, d4, e5, d5, c4, c5, f4, f5)
        if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) score += 30;
        if (['c4', 'c5', 'f4', 'f5'].includes(move.to)) score += 15;

        // Check bonus
        if (chess.inCheck()) score += 25;

        // Promotion bonus
        if (move.promotion) score += 800;

        // King safety (castling)
        if (move.san === 'O-O' || move.san === 'O-O-O') score += 40;
      }

      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    const selected = bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
    return { from: selected.from, to: selected.to, promotion: selected.promotion || 'q' };
  } catch (err) {
    console.error('Fallback move calculation error:', err);
    return null;
  }
}

export function useStockfish(difficulty = 'intermediate') {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(true); // Default ready with fallback
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
          worker.postMessage('isready');
        } else if (line === 'readyok') {
          setIsReady(true);
        } else if (line.startsWith('info') && line.includes('score cp')) {
          const match = line.match(/score cp (-?\d+)/);
          if (match) {
            setEvalScore(parseInt(match[1], 10) / 100);
          }
        } else if (line.startsWith('bestmove')) {
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
        console.warn('[Stockfish Worker Warning - Fallback Active]', err);
        setIsReady(true);
      };

      worker.postMessage('uci');
    } catch (err) {
      console.warn('[Stockfish Worker creation failed - using internal engine]', err);
      setIsReady(true);
    }

    return () => {
      if (worker) worker.terminate();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      workerRef.current = null;
    };
  }, []);

  // Update difficulty whenever it changes
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

    // Safety watchdog: If Stockfish takes > 1200ms or fails, invoke fallback immediately
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      if (onMoveCallbackRef.current) {
        console.log('[AI Engine] Serving evaluated fallback move');
        const fallback = calculateFallbackMove(fen, difficulty);
        setIsThinking(false);
        const cb = onMoveCallbackRef.current;
        onMoveCallbackRef.current = null;
        if (cb && fallback) cb(fallback);
      }
    }, 1200);

    if (workerRef.current) {
      try {
        workerRef.current.postMessage(`position fen ${fen}`);
        workerRef.current.postMessage(`go depth ${preset.depth}`);
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
