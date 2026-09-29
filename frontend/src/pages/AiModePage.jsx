import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoardView from '../components/ChessBoardView';
import DifficultySelector from '../components/DifficultySelector';
import MoveHistory from '../components/MoveHistory';
import CapturedPieces from '../components/CapturedPieces';
import GameOverModal from '../components/GameOverModal';
import { useStockfish } from '../hooks/useStockfish';
import { playMoveSound } from '../utils/sound';
import { RotateCcw, Flag, ArrowLeftRight, Bot, User, Loader2 } from 'lucide-react';

export default function AiModePage() {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [difficulty, setDifficulty] = useState('intermediate');
  const [playerColor, setPlayerColor] = useState('white');
  const [history, setHistory] = useState([]);
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [lastMove, setLastMove] = useState(null);
  const [gameOverInfo, setGameOverInfo] = useState({ isOpen: false, title: '', subtitle: '', isWinner: false });

  const { isReady, isThinking, getAiMove, stop } = useStockfish(difficulty);
  const aiThinkingRef = useRef(false);

  // Helper to compute captured pieces
  const calculateCaptured = (chessInstance) => {
    const startPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentPieces = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    const board = chessInstance.board();
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type !== 'k') currentPieces[sq.color][sq.type]++;
      }
    }
    const capturedWhite = [];
    const capturedBlack = [];
    for (const [type, count] of Object.entries(startPieces)) {
      const missingB = count - currentPieces.b[type];
      for (let i = 0; i < missingB; i++) capturedWhite.push(type.toUpperCase());
      const missingW = count - currentPieces.w[type];
      for (let i = 0; i < missingW; i++) capturedBlack.push(type.toLowerCase());
    }
    return { white: capturedWhite, black: capturedBlack };
  };

  const checkGameEnd = (currentChess, playerMoved) => {
    if (currentChess.isGameOver()) {
      let title = 'Game Over';
      let subtitle = '';
      let isWinner = false;

      if (currentChess.isCheckmate()) {
        const winner = currentChess.turn() === 'w' ? 'Black' : 'White';
        isWinner = (winner === 'White' && playerColor === 'white') || (winner === 'Black' && playerColor === 'black');
        title = isWinner ? 'Victory by Checkmate!' : 'Defeated by Checkmate';
        subtitle = `${winner} delivered checkmate.`;
        playMoveSound('gameover');
      } else if (currentChess.isDraw()) {
        title = 'Draw';
        subtitle = currentChess.isStalemate()
          ? 'Draw by Stalemate.'
          : currentChess.isThreefoldRepetition()
          ? 'Draw by Threefold Repetition.'
          : 'Draw by Insufficient Material.';
        playMoveSound('gameover');
      }

      setGameOverInfo({ isOpen: true, title, subtitle, isWinner });
      return true;
    }
    return false;
  };

  // Trigger AI move if it's AI's turn
  useEffect(() => {
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    const isAiTurn = currentTurn !== playerColor;

    if (isAiTurn && !game.isGameOver() && isReady && !aiThinkingRef.current) {
      aiThinkingRef.current = true;
      const currentFen = game.fen();

      // Slight natural thinking pause for lower levels
      const delay = difficulty === 'beginner' ? 350 : 200;
      const timer = setTimeout(() => {
        getAiMove(currentFen, (bestMove) => {
          aiThinkingRef.current = false;
          try {
            const moveResult = game.move({
              from: bestMove.from,
              to: bestMove.to,
              promotion: bestMove.promotion || 'q'
            });

            if (moveResult) {
              setFen(game.fen());
              setLastMove({ from: moveResult.from, to: moveResult.to });
              setHistory(game.history({ verbose: true }));
              setCaptured(calculateCaptured(game));

              if (game.inCheck()) {
                playMoveSound('check');
              } else if (moveResult.captured) {
                playMoveSound('capture');
              } else {
                playMoveSound('move');
              }

              checkGameEnd(game, false);
            }
          } catch (e) {
            console.error('AI move execution error:', e);
          }
        });
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [fen, playerColor, isReady, difficulty]);

  // Handle human move
  const handlePlayerMove = (move) => {
    const currentTurn = game.turn() === 'w' ? 'white' : 'black';
    if (currentTurn !== playerColor || game.isGameOver() || isThinking) {
      return false;
    }

    try {
      const moveResult = game.move(move);
      if (!moveResult) return false;

      setFen(game.fen());
      setLastMove({ from: moveResult.from, to: moveResult.to });
      setHistory(game.history({ verbose: true }));
      setCaptured(calculateCaptured(game));

      if (game.inCheck()) {
        playMoveSound('check');
      } else if (moveResult.captured) {
        playMoveSound('capture');
      } else {
        playMoveSound('move');
      }

      checkGameEnd(game, true);
      return true;
    } catch {
      return false;
    }
  };

  const handleResetGame = () => {
    stop();
    aiThinkingRef.current = false;
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setHistory([]);
    setCaptured({ white: [], black: [] });
    setLastMove(null);
    setGameOverInfo({ isOpen: false, title: '', subtitle: '', isWinner: false });
  };

  const handleResign = () => {
    if (game.isGameOver()) return;
    setGameOverInfo({
      isOpen: true,
      title: 'Game Resigned',
      subtitle: `${playerColor === 'white' ? 'White' : 'Black'} resigned. Stockfish AI wins.`,
      isWinner: false
    });
  };

  const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || (game.turn() === 'b' && playerColor === 'black');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Status */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Opponent (AI) bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2 px-3 bg-slate-900/90 rounded-xl mb-3 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  Stockfish AI
                  {isThinking && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-400 font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  Difficulty: {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </div>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              !isPlayerTurn && !game.isGameOver()
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {!isPlayerTurn && !game.isGameOver() ? 'AI Turn' : 'Waiting'}
            </div>
          </div>

          {/* Chess Board */}
          <ChessBoardView
            fen={fen}
            onMakeMove={handlePlayerMove}
            orientation={playerColor}
            disabled={!isPlayerTurn || game.isGameOver()}
            isCheck={game.inCheck()}
            turn={game.turn() === 'w' ? 'white' : 'black'}
            lastMove={lastMove}
            chessInstance={game}
          />

          {/* Player bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2 px-3 bg-slate-900/90 rounded-xl mt-3 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">You</div>
                <div className="text-xs text-slate-400">Playing as {playerColor}</div>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPlayerTurn && !game.isGameOver()
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isPlayerTurn && !game.isGameOver() ? 'Your Turn' : 'Waiting'}
            </div>
          </div>
        </div>

        {/* Right Column: Controls, History, Material */}
        <div className="lg:col-span-4 space-y-4">
          {/* Difficulty Tuning */}
          <DifficultySelector
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            disabled={history.length > 0 && !game.isGameOver()}
          />

          {/* Side & Board Orientation Control */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase text-slate-400 block mb-2">Play As</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                disabled={history.length > 0}
                onClick={() => setPlayerColor('white')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  playerColor === 'white'
                    ? 'bg-slate-100 text-slate-900 shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } ${history.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                White (First)
              </button>
              <button
                disabled={history.length > 0}
                onClick={() => setPlayerColor('black')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  playerColor === 'black'
                    ? 'bg-slate-700 text-white shadow border border-slate-600'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                } ${history.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Black (Second)
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleResetGame}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Game
              </button>
              <button
                onClick={handleResign}
                disabled={game.isGameOver()}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/20 disabled:opacity-40"
              >
                <Flag className="w-3.5 h-3.5" />
                Resign
              </button>
            </div>
          </div>

          {/* Captured Pieces */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Captured Material</h4>
            <CapturedPieces captured={captured} />
          </div>

          {/* Move History */}
          <MoveHistory history={history} />
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOverInfo.isOpen}
        title={gameOverInfo.title}
        subtitle={gameOverInfo.subtitle}
        isWinner={gameOverInfo.isWinner}
        onPlayAgain={handleResetGame}
      />
    </div>
  );
}
