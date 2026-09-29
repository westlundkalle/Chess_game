import { useEffect, useRef, useState, useCallback } from 'react';

export const DIFFICULTY_PRESETS = {
  beginner: { name: 'Beginner (~800)', skill: 1, depth: 2, description: 'Makes occasional blunders, fast moves' },
  casual: { name: 'Casual (~1200)', skill: 5, depth: 5, description: 'Basic tactical awareness' },
  intermediate: { name: 'Intermediate (~1600)', skill: 10, depth: 8, description: 'Solid positional play, rarely misses tactics' },
  advanced: { name: 'Advanced (~2000)', skill: 15, depth: 12, description: 'Strong club player, deep calculation' },
  grandmaster: { name: 'Grandmaster (2600+)', skill: 20, depth: 18, description: 'Full Stockfish power, near-flawless' }
};

export function useStockfish(difficulty = 'intermediate') {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [evalScore, setEvalScore] = useState(null);
  const onMoveCallbackRef = useRef(null);

  // Initialize Web Worker
  useEffect(() => {
    try {
      const worker = new Worker('/stockfish/stockfish.js');
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
          setIsThinking(false);
          const parts = line.split(' ');
          const moveUci = parts[1]; // e.g. e2e4 or e7e8q

          if (moveUci && moveUci !== '(none)' && onMoveCallbackRef.current) {
            const from = moveUci.substring(0, 2);
            const to = moveUci.substring(2, 4);
            const promotion = moveUci.length > 4 ? moveUci.substring(4, 5) : undefined;

            onMoveCallbackRef.current({ from, to, promotion, uci: moveUci });
            onMoveCallbackRef.current = null;
          }
        }
      };

      worker.onerror = (err) => {
        console.error('[Stockfish Worker Error]', err);
      };

      worker.postMessage('uci');

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      console.error('[Stockfish Initialization Error]', err);
    }
  }, []);

  // Update difficulty whenever it changes
  useEffect(() => {
    if (!workerRef.current || !isReady) return;
    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;
    workerRef.current.postMessage(`setoption name Skill Level value ${preset.skill}`);
  }, [difficulty, isReady]);

  // Request best move for a given FEN
  const getAiMove = useCallback((fen, onBestMove) => {
    if (!workerRef.current) return;

    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.intermediate;
    setIsThinking(true);
    onMoveCallbackRef.current = onBestMove;

    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${preset.depth}`);
  }, [difficulty]);

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage('stop');
      setIsThinking(false);
    }
  }, []);

  return {
    isReady,
    isThinking,
    evalScore,
    getAiMove,
    stop
  };
}
