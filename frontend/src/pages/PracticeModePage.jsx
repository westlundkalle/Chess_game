import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoardView from '../components/ChessBoardView';
import MoveHistory from '../components/MoveHistory';
import GameOverModal from '../components/GameOverModal';
import puzzlesData from '../data/puzzles.json';
import { playMoveSound } from '../utils/sound';
import confetti from 'canvas-confetti';
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles
} from 'lucide-react';

export default function PracticeModePage() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const currentPuzzle = puzzlesData[puzzleIndex] || puzzlesData[0];

  const [game, setGame] = useState(() => new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [moveStepIndex, setMoveStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'hint', text: '' }
  const [isSolved, setIsSolved] = useState(false);
  const [lastMove, setLastMove] = useState(null);
  const [showSolution, setShowSolution] = useState(false);

  // Initialize or change puzzle
  useEffect(() => {
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(currentPuzzle.fen);
    setMoveStepIndex(0);
    setStatusMessage(null);
    setIsSolved(false);
    setLastMove(null);
    setShowSolution(false);
  }, [puzzleIndex]);

  // Handle player attempt
  const handlePlayerMove = (move) => {
    if (isSolved) return false;

    // Create a temporary clone to validate the move
    const tempGame = new Chess(game.fen());
    let playedMove;
    try {
      playedMove = tempGame.move(move);
    } catch {
      return false;
    }

    if (!playedMove) return false;

    const expectedSan = currentPuzzle.moves[moveStepIndex];

    // Simulate expected solution move on position clone
    const expectedGame = new Chess(game.fen());
    let expectedMoveObj = null;
    try {
      expectedMoveObj = expectedGame.move(expectedSan);
    } catch (e) {
      console.error('Error applying expected move:', e);
    }

    // Move is correct if SAN matches, OR if (from square + to square) matches!
    const isCorrect = expectedMoveObj && (
      playedMove.san === expectedMoveObj.san ||
      (playedMove.from === expectedMoveObj.from && playedMove.to === expectedMoveObj.to)
    );

    if (!isCorrect) {
      // Incorrect move: play sound and notify
      playMoveSound('capture');
      setStatusMessage({
        type: 'error',
        text: 'Incorrect move. That was not the best continuation. Try again!'
      });
      return false;
    }

    // Correct Move!
    game.move(move);
    setFen(game.fen());
    setLastMove({ from: playedMove.from, to: playedMove.to });

    if (game.inCheck()) {
      playMoveSound('check');
    } else if (playedMove.captured) {
      playMoveSound('capture');
    } else {
      playMoveSound('move');
    }

    const nextStep = moveStepIndex + 1;

    // Check if puzzle is complete
    if (nextStep >= currentPuzzle.moves.length) {
      setIsSolved(true);
      setStatusMessage({
        type: 'success',
        text: 'Brilliant! Puzzle Solved!'
      });
      playMoveSound('gameover');
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
      return true;
    }

    // Auto-play the opponent's response after brief delay
    setMoveStepIndex(nextStep);
    setStatusMessage({
      type: 'hint',
      text: 'Good move! Opponent responding...'
    });

    const opponentMoveSan = currentPuzzle.moves[nextStep];
    setTimeout(() => {
      try {
        const oppResult = game.move(opponentMoveSan);
        if (oppResult) {
          setFen(game.fen());
          setLastMove({ from: oppResult.from, to: oppResult.to });
          setMoveStepIndex(nextStep + 1);

          if (game.inCheck()) {
            playMoveSound('check');
          } else {
            playMoveSound('move');
          }

          setStatusMessage({
            type: 'hint',
            text: 'Your turn to find the follow-up move!'
          });
        }
      } catch (e) {
        console.error('Opponent move error:', e);
      }
    }, 500);

    return true;
  };

  const handleResetPuzzle = () => {
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(currentPuzzle.fen);
    setMoveStepIndex(0);
    setStatusMessage(null);
    setIsSolved(false);
    setLastMove(null);
    setShowSolution(false);
  };

  const handleNextPuzzle = () => {
    if (puzzleIndex < puzzlesData.length - 1) {
      setPuzzleIndex(puzzleIndex + 1);
    }
  };

  const handlePrevPuzzle = () => {
    if (puzzleIndex > 0) {
      setPuzzleIndex(puzzleIndex - 1);
    }
  };

  const currentTurn = game.turn() === 'w' ? 'white' : 'black';
  const playerSide = currentPuzzle.turn === 'w' ? 'white' : 'black';
  const isMyTurn = currentTurn === playerSide;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Turn Notification */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Puzzle Header Bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2.5 px-4 bg-slate-900/90 rounded-xl mb-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {currentPuzzle.title}
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    Rating {currentPuzzle.rating}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Theme: <span className="text-slate-200 font-medium">{currentPuzzle.theme}</span> • {playerSide === 'white' ? 'White' : 'Black'} to move
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={puzzleIndex === 0}
                onClick={handlePrevPuzzle}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Puzzle"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-400 px-1">
                {puzzleIndex + 1}/{puzzlesData.length}
              </span>
              <button
                disabled={puzzleIndex === puzzlesData.length - 1}
                onClick={handleNextPuzzle}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Puzzle"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chess Board */}
          <ChessBoardView
            fen={fen}
            onMakeMove={handlePlayerMove}
            orientation={playerSide}
            disabled={!isMyTurn || isSolved}
            isCheck={game.inCheck()}
            turn={currentTurn}
            lastMove={lastMove}
            chessInstance={game}
          />

          {/* Interactive Feedback Alert */}
          <div className="w-full max-w-[560px] mt-3">
            {statusMessage ? (
              <div
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                {statusMessage.type === 'hint' && <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
                <div className="flex-1">{statusMessage.text}</div>
                {statusMessage.type === 'error' && (
                  <button
                    onClick={handleResetPuzzle}
                    className="text-xs underline font-bold hover:text-white"
                  >
                    Try Again
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                Find the best tactical move for <span className="text-white font-semibold">{playerSide}</span>.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Puzzle Info, Controls & Selector */}
        <div className="lg:col-span-4 space-y-4">
          {/* Puzzle Goal & Description */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Objective</h4>
            <p className="text-sm text-slate-200 leading-relaxed mb-4">
              {currentPuzzle.description}
            </p>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={handleResetPuzzle}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Board
              </button>

              <button
                onClick={() => setShowSolution(!showSolution)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showSolution ? 'Hide Solution' : 'Show Solution'}
              </button>
            </div>

            {showSolution && (
              <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-amber-300">
                Solution: {currentPuzzle.moves.join(' → ')}
              </div>
            )}
          </div>

          {/* Puzzle Collection Browser */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Puzzle Library</h4>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {puzzlesData.map((p, idx) => {
                const isCurrent = idx === puzzleIndex;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPuzzleIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="truncate">
                      <span className="opacity-75 mr-1.5">{idx + 1}.</span>
                      {p.title}
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isCurrent ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-900 text-amber-400'
                    }`}>
                      {p.rating}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Move History */}
          <MoveHistory history={game.history({ verbose: true })} />
        </div>
      </div>
    </div>
  );
}
