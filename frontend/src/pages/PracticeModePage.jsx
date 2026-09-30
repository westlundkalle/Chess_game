import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import ChessBoardView from '../components/ChessBoardView';
import MoveHistory from '../components/MoveHistory';
import GameOverModal from '../components/GameOverModal';
import puzzlesData from '../data/puzzles.json';
import { useStockfish } from '../hooks/useStockfish';
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
  Sparkles,
  Zap,
  ShieldAlert,
  Flame,
  Filter,
  Brain,
  Timer,
  Heart,
  TrendingUp,
  BookOpen,
  Info,
  Check,
  Eye,
  Play,
  Pause,
  Clock,
  Shuffle,
  Dices,
  Lock
} from 'lucide-react';

// Fisher-Yates shuffle algorithm for unbiassed puzzle randomization
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function PracticeModePage() {
  // Mode selection: 'training' | 'rush' | 'survival'
  const [activeMode, setActiveMode] = useState('training');

  // Filter states (for Training mode)
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  // Filtered puzzle collection for Training mode
  const filteredPuzzles = useMemo(() => {
    return puzzlesData.filter((p) => {
      const matchTheme = selectedTheme === 'All' || p.theme === selectedTheme;
      const matchDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
      return matchTheme && matchDiff;
    });
  }, [selectedTheme, selectedDifficulty]);

  const [puzzleIndex, setPuzzleIndex] = useState(0);

  // Difficulty settings for 3-Min Rush & Survival ('all' | 'beginner' | 'intermediate' | 'master')
  const [rushDifficulty, setRushDifficulty] = useState('all');
  const [survivalDifficulty, setSurvivalDifficulty] = useState('all');

  // Helper to fetch difficulty-specific best records from localStorage
  const getRushBest = (diff) => {
    return parseInt(localStorage.getItem(`chess_rush_best_${diff}`) || localStorage.getItem('chess_rush_best') || '0', 10);
  };
  const getSurvivalBest = (diff) => {
    return parseInt(localStorage.getItem(`chess_survival_best_${diff}`) || localStorage.getItem('chess_survival_best') || '0', 10);
  };

  // Randomized queues for Rush & Survival
  const [rushQueue, setRushQueue] = useState(() => shuffleArray(puzzlesData));
  const [rushQueueIndex, setRushQueueIndex] = useState(0);

  const [survivalQueue, setSurvivalQueue] = useState(() => shuffleArray(puzzlesData));
  const [survivalQueueIndex, setSurvivalQueueIndex] = useState(0);

  // Active puzzle based on current mode
  const currentPuzzle = useMemo(() => {
    if (activeMode === 'rush') {
      return rushQueue[rushQueueIndex] || puzzlesData[0];
    }
    if (activeMode === 'survival') {
      return survivalQueue[survivalQueueIndex] || puzzlesData[0];
    }
    return filteredPuzzles[puzzleIndex] || puzzlesData[0];
  }, [activeMode, rushQueue, rushQueueIndex, survivalQueue, survivalQueueIndex, filteredPuzzles, puzzleIndex]);

  // Board and puzzle progression states
  const [game, setGame] = useState(() => new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [moveStepIndex, setMoveStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isSolved, setIsSolved] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  // Feature 2: Player Puzzle ELO Rating System
  const [playerElo, setPlayerElo] = useState(() => {
    return parseInt(localStorage.getItem('chess_puzzle_elo') || '1200', 10);
  });
  const [winStreak, setWinStreak] = useState(() => {
    return parseInt(localStorage.getItem('chess_puzzle_streak') || '0', 10);
  });
  const [eloDelta, setEloDelta] = useState(null);

  // Feature 3: Progressive Multi-Stage Hints (0: None, 1: Piece, 2: Target, 3: Full Solution)
  const [hintStage, setHintStage] = useState(0);
  const [showTakeawayEarly, setShowTakeawayEarly] = useState(false);

  // Feature 5: Analyze with Stockfish
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { isReady, isThinking, evalScore, bestMove, getAiMove } = useStockfish('grandmaster');
  const analysisSnapshotRef = useRef(null);

  // Feature 1: Rush & Survival Game States
  const [rushTimeLeft, setRushTimeLeft] = useState(180); // 3 minutes
  const [rushScore, setRushScore] = useState(0);
  const [rushBest, setRushBest] = useState(() => getRushBest('all'));
  const [isRushActive, setIsRushActive] = useState(false);

  const [survivalLives, setSurvivalLives] = useState(3);
  const [survivalScore, setSurvivalScore] = useState(0);
  const [survivalBest, setSurvivalBest] = useState(() => getSurvivalBest('all'));
  const [isSurvivalActive, setIsSurvivalActive] = useState(false);
  const [rushGameOver, setRushGameOver] = useState(false);

  // Timer for Rush mode
  useEffect(() => {
    let timer = null;
    if (activeMode === 'rush' && isRushActive && rushTimeLeft > 0) {
      timer = setInterval(() => {
        setRushTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRushActive(false);
            setRushGameOver(true);
            playMoveSound('gameover');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeMode, isRushActive, rushTimeLeft]);

  // Load new puzzle position
  useEffect(() => {
    if (!currentPuzzle) return;
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(currentPuzzle.fen);
    setMoveStepIndex(0);
    setStatusMessage(null);
    setIsSolved(false);
    setLastMove(null);
    setHintStage(0);
    setEloDelta(null);
    setIsAnalyzing(false);
    analysisSnapshotRef.current = null;
    setShowTakeawayEarly(false);
  }, [puzzleIndex, currentPuzzle]);

  // Request Stockfish live evaluation when analysis mode is active
  useEffect(() => {
    if (isAnalyzing && isReady) {
      getAiMove(fen);
    }
  }, [isAnalyzing, fen, isReady, getAiMove]);

  // ELO calculation formula
  const updateElo = (solved) => {
    const expected = 1 / (1 + Math.pow(10, (currentPuzzle.rating - playerElo) / 400));
    let delta = 0;
    if (solved) {
      delta = Math.round(32 * (1 - expected));
      delta = Math.max(8, Math.min(32, delta));
      const newStreak = winStreak + 1;
      setWinStreak(newStreak);
      localStorage.setItem('chess_puzzle_streak', newStreak.toString());
    } else {
      delta = Math.round(32 * (0 - expected));
      delta = Math.min(-6, Math.max(-28, delta));
      setWinStreak(0);
      localStorage.setItem('chess_puzzle_streak', '0');
    }
    const newElo = Math.max(600, playerElo + delta);
    setPlayerElo(newElo);
    setEloDelta(delta);
    localStorage.setItem('chess_puzzle_elo', newElo.toString());
  };

  // Rank tier determination
  const getRankTier = (elo) => {
    if (elo < 1100) return { name: 'Tactical Novice', color: 'text-slate-400', border: 'border-slate-700' };
    if (elo < 1400) return { name: 'Club Tactician', color: 'text-emerald-400', border: 'border-emerald-500/30' };
    if (elo < 1700) return { name: 'Expert Tactician', color: 'text-blue-400', border: 'border-blue-500/30' };
    if (elo < 2000) return { name: 'Master Strategist', color: 'text-purple-400', border: 'border-purple-500/30' };
    return { name: 'Puzzle Grandmaster', color: 'text-amber-400 font-bold', border: 'border-amber-500/50' };
  };

  const rankTier = getRankTier(playerElo);

  // Compute hint visual styles on the board
  const hintStyles = useMemo(() => {
    const styles = {};
    if (!currentPuzzle) return styles;

    // Stage 1: Highlight piece to move with an amber glow
    if (hintStage >= 1 && currentPuzzle.hintPiece) {
      styles[currentPuzzle.hintPiece] = {
        boxShadow: 'inset 0 0 16px rgba(245, 158, 11, 0.95)',
        backgroundColor: 'rgba(245, 158, 11, 0.45)'
      };
    }

    // Stage 2: Highlight target square with a blue pulsing dot
    if (hintStage >= 2 && currentPuzzle.hintTarget) {
      styles[currentPuzzle.hintTarget] = {
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.9) 35%, transparent 35%)',
        borderRadius: '50%'
      };
    }

    return styles;
  }, [hintStage, currentPuzzle]);

  // Handle player attempt on the chessboard
  const handlePlayerMove = (move) => {
    if (isSolved && !isAnalyzing) return false;

    // In Analysis mode, allow free board exploration
    if (isAnalyzing) {
      try {
        const tempGame = new Chess(game.fen());
        const res = tempGame.move(move);
        if (res) {
          setGame(tempGame);
          setFen(tempGame.fen());
          setLastMove({ from: res.from, to: res.to });
          playMoveSound(res.captured ? 'capture' : 'move');
          getAiMove(tempGame.fen());
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }

    // Create a temporary clone to validate the move
    const tempGame = new Chess(game.fen());
    let playedMove;
    try {
      playedMove = tempGame.move(move);
    } catch {
      return false;
    }

    if (!playedMove) return false;

    // In Rush mode, automatically start the timer on the player's first move
    if (activeMode === 'rush' && !isRushActive && !rushGameOver) {
      setIsRushActive(true);
    }

    const expectedSan = currentPuzzle.moves[moveStepIndex];

    // Simulate expected solution move on a position clone
    const expectedGame = new Chess(game.fen());
    let expectedMoveObj = null;
    try {
      expectedMoveObj = expectedGame.move(expectedSan);
    } catch (e) {
      console.error('Error applying expected move:', e);
    }

    // Compare SAN or (from + to) squares
    const isCorrect = expectedMoveObj && (
      playedMove.san === expectedMoveObj.san ||
      (playedMove.from === expectedMoveObj.from && playedMove.to === expectedMoveObj.to)
    );

    if (!isCorrect) {
      playMoveSound('capture');
      setStatusMessage({
        type: 'error',
        text: 'Incorrect move. That was not the best continuation. Try again!'
      });

      if (activeMode === 'training') {
        updateElo(false);
      } else if (activeMode === 'survival') {
        const remaining = survivalLives - 1;
        setSurvivalLives(remaining);
        if (remaining <= 0) {
          setIsSurvivalActive(false);
          setRushGameOver(true);
          playMoveSound('gameover');
        }
      }

      return false;
    }

    // Correct Move! Create fresh Chess instance
    const updatedGame = new Chess(game.fen());
    updatedGame.move(move);
    setGame(updatedGame);
    setFen(updatedGame.fen());
    setLastMove({ from: playedMove.from, to: playedMove.to });

    if (updatedGame.inCheck()) {
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
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
      } catch {}

      if (activeMode === 'training') {
        updateElo(true);
      } else if (activeMode === 'rush') {
        const newScore = rushScore + 1;
        setRushScore(newScore);
        if (newScore > rushBest) {
          setRushBest(newScore);
          localStorage.setItem(`chess_rush_best_${rushDifficulty}`, newScore.toString());
          localStorage.setItem('chess_rush_best', newScore.toString());
        }
        setTimeout(() => advanceToNextPuzzle(), 450);
      } else if (activeMode === 'survival') {
        const newScore = survivalScore + 1;
        setSurvivalScore(newScore);
        if (newScore > survivalBest) {
          setSurvivalBest(newScore);
          localStorage.setItem(`chess_survival_best_${survivalDifficulty}`, newScore.toString());
          localStorage.setItem('chess_survival_best', newScore.toString());
        }
        setTimeout(() => advanceToNextPuzzle(), 450);
      }

      return true;
    }

    // Auto-play opponent response after 500ms
    setMoveStepIndex(nextStep);
    setStatusMessage({
      type: 'hint',
      text: 'Good move! Opponent responding...'
    });

    const opponentMoveSan = currentPuzzle.moves[nextStep];
    setTimeout(() => {
      try {
        const nextGame = new Chess(updatedGame.fen());
        const oppResult = nextGame.move(opponentMoveSan);
        if (oppResult) {
          setGame(nextGame);
          setFen(nextGame.fen());
          setLastMove({ from: oppResult.from, to: oppResult.to });
          setMoveStepIndex(nextStep + 1);

          if (nextGame.inCheck()) {
            playMoveSound('check');
          } else if (oppResult.captured) {
            playMoveSound('capture');
          } else {
            playMoveSound('move');
          }

          setStatusMessage({
            type: 'hint',
            text: 'Your turn to deliver the finishing blow!'
          });
        }
      } catch (e) {
        console.error('Opponent move error:', e);
      }
    }, 500);

    return true;
  };

  const advanceToNextPuzzle = () => {
    setIsAnalyzing(false);
    if (activeMode === 'rush') {
      setRushQueueIndex((prev) => {
        const next = prev + 1;
        if (next >= rushQueue.length) {
          const pool = rushDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === rushDifficulty);
          setRushQueue(shuffleArray(pool));
          return 0;
        }
        return next;
      });
    } else if (activeMode === 'survival') {
      setSurvivalQueueIndex((prev) => {
        const next = prev + 1;
        if (next >= survivalQueue.length) {
          const pool = survivalDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === survivalDifficulty);
          setSurvivalQueue(shuffleArray(pool));
          return 0;
        }
        return next;
      });
    } else {
      if (puzzleIndex < filteredPuzzles.length - 1) {
        setPuzzleIndex(puzzleIndex + 1);
      } else {
        setPuzzleIndex(0);
      }
    }
  };

  const handlePickRandomTrainingPuzzle = () => {
    setIsAnalyzing(false);
    if (filteredPuzzles.length <= 1) return;
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * filteredPuzzles.length);
    } while (nextIdx === puzzleIndex);
    setPuzzleIndex(nextIdx);
  };

  const handleResetPuzzle = () => {
    setIsAnalyzing(false);
    const newGame = new Chess(currentPuzzle.fen);
    setGame(newGame);
    setFen(currentPuzzle.fen);
    setMoveStepIndex(0);
    setStatusMessage(null);
    setIsSolved(false);
    setLastMove(null);
    setHintStage(0);
    setShowTakeawayEarly(false);
  };

  const handleNextPuzzle = () => {
    setIsAnalyzing(false);
    if (puzzleIndex < filteredPuzzles.length - 1) {
      setPuzzleIndex(puzzleIndex + 1);
    } else {
      setPuzzleIndex(0);
    }
  };

  const handlePrevPuzzle = () => {
    setIsAnalyzing(false);
    if (puzzleIndex > 0) {
      setPuzzleIndex(puzzleIndex - 1);
    }
  };

  // Toggle Stockfish Analysis Mode
  const handleToggleAnalysis = () => {
    if (isAnalyzing) {
      // Exit analysis mode: Restore board to current puzzle position
      const snapshot = analysisSnapshotRef.current;
      const targetFen = snapshot ? snapshot.fen : currentPuzzle.fen;
      const targetStep = snapshot ? snapshot.moveStepIndex : 0;
      const targetLastMove = snapshot ? snapshot.lastMove : null;

      const restoredGame = new Chess(targetFen);
      setGame(restoredGame);
      setFen(targetFen);
      setMoveStepIndex(targetStep);
      setLastMove(targetLastMove);
      setIsAnalyzing(false);
      setStatusMessage({
        type: 'hint',
        text: 'Analysis closed. Puzzle resumed!'
      });
    } else {
      // Enter analysis mode: Save current puzzle state
      analysisSnapshotRef.current = {
        fen: game.fen(),
        moveStepIndex,
        lastMove
      };
      setIsAnalyzing(true);
      getAiMove(game.fen());
    }
  };

  // Reset position inside analysis mode
  const handleResetAnalysisPosition = () => {
    const snapshot = analysisSnapshotRef.current;
    const targetFen = snapshot ? snapshot.fen : currentPuzzle.fen;
    const restoredGame = new Chess(targetFen);
    setGame(restoredGame);
    setFen(targetFen);
    setLastMove(snapshot ? snapshot.lastMove : null);
    getAiMove(targetFen);
  };

  const handleCycleHint = () => {
    if (hintStage < 3) {
      setHintStage(hintStage + 1);
    }
  };

  // Start Rush Mode (ready state: wait for player to click start or make first move)
  const startRushMode = (diff = rushDifficulty) => {
    setActiveMode('rush');
    const pool = diff === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === diff);
    const shuffled = shuffleArray(pool);
    setRushQueue(shuffled);
    setRushQueueIndex(0);
    setRushTimeLeft(180);
    setRushScore(0);
    setIsRushActive(false);
    setRushGameOver(false);
    setRushBest(getRushBest(diff));
  };

  // Restart Rush Run
  const handleRestartRush = () => {
    const pool = rushDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === rushDifficulty);
    const shuffled = shuffleArray(pool);
    setRushQueue(shuffled);
    setRushQueueIndex(0);
    setRushTimeLeft(180);
    setRushScore(0);
    setIsRushActive(false);
    setRushGameOver(false);
    setStatusMessage({
      type: 'hint',
      text: 'Rush deck randomized! Timer will start on your first move or when you click Start Timer.'
    });
  };

  // Change Rush Difficulty
  const handleRushDifficultyChange = (newDiff) => {
    setRushDifficulty(newDiff);
    setRushBest(getRushBest(newDiff));
    const pool = newDiff === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === newDiff);
    const shuffled = shuffleArray(pool);
    setRushQueue(shuffled);
    setRushQueueIndex(0);
    setRushTimeLeft(180);
    setRushScore(0);
    setIsRushActive(false);
    setRushGameOver(false);
    setStatusMessage({
      type: 'hint',
      text: `Rush difficulty set to ${newDiff.toUpperCase()}. Puzzle order randomized!`
    });
  };

  // Reshuffle Rush deck on demand
  const handleReshuffleRush = () => {
    const pool = rushDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === rushDifficulty);
    const shuffled = shuffleArray(pool);
    setRushQueue(shuffled);
    setRushQueueIndex(0);
    setStatusMessage({
      type: 'hint',
      text: '🎲 Rush puzzle order reshuffled!'
    });
  };

  // Start Survival Mode
  const startSurvivalMode = (diff = survivalDifficulty) => {
    setActiveMode('survival');
    const pool = diff === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === diff);
    const shuffled = shuffleArray(pool);
    setSurvivalQueue(shuffled);
    setSurvivalQueueIndex(0);
    setSurvivalLives(3);
    setSurvivalScore(0);
    setIsSurvivalActive(true);
    setRushGameOver(false);
    setSurvivalBest(getSurvivalBest(diff));
  };

  // Restart Survival Run
  const handleRestartSurvival = () => {
    const pool = survivalDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === survivalDifficulty);
    const shuffled = shuffleArray(pool);
    setSurvivalQueue(shuffled);
    setSurvivalQueueIndex(0);
    setSurvivalLives(3);
    setSurvivalScore(0);
    setIsSurvivalActive(true);
    setRushGameOver(false);
    setStatusMessage({
      type: 'hint',
      text: 'Survival deck randomized with 3 fresh lives!'
    });
  };

  // Change Survival Difficulty
  const handleSurvivalDifficultyChange = (newDiff) => {
    setSurvivalDifficulty(newDiff);
    setSurvivalBest(getSurvivalBest(newDiff));
    const pool = newDiff === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === newDiff);
    const shuffled = shuffleArray(pool);
    setSurvivalQueue(shuffled);
    setSurvivalQueueIndex(0);
    setSurvivalLives(3);
    setSurvivalScore(0);
    setIsSurvivalActive(true);
    setRushGameOver(false);
    setStatusMessage({
      type: 'hint',
      text: `Survival difficulty set to ${newDiff.toUpperCase()}. Puzzle deck randomized!`
    });
  };

  // Reshuffle Survival deck on demand
  const handleReshuffleSurvival = () => {
    const pool = survivalDifficulty === 'all' ? puzzlesData : puzzlesData.filter((p) => p.difficulty === survivalDifficulty);
    const shuffled = shuffleArray(pool);
    setSurvivalQueue(shuffled);
    setSurvivalQueueIndex(0);
    setStatusMessage({
      type: 'hint',
      text: '🎲 Survival puzzle deck reshuffled!'
    });
  };

  const diffOptions = useMemo(() => [
    { label: 'All Levels', value: 'all', count: puzzlesData.length },
    { label: 'Beginner', value: 'beginner', count: puzzlesData.filter((p) => p.difficulty === 'beginner').length },
    { label: 'Intermediate', value: 'intermediate', count: puzzlesData.filter((p) => p.difficulty === 'intermediate').length },
    { label: 'Master', value: 'master', count: puzzlesData.filter((p) => p.difficulty === 'master').length }
  ], []);

  const currentTurn = game.turn() === 'w' ? 'white' : 'black';
  const playerSide = currentPuzzle?.turn === 'w' ? 'white' : 'black';
  const isMyTurn = currentTurn === playerSide;

  const themesList = useMemo(() => {
    const list = ['All'];
    puzzlesData.forEach((p) => {
      if (p.theme && !list.includes(p.theme)) {
        list.push(p.theme);
      }
    });
    return list;
  }, []);
  const diffList = [
    { label: 'All Levels', value: 'All' },
    { label: 'Beginner (1000-1200)', value: 'beginner' },
    { label: 'Intermediate (1300-1650)', value: 'intermediate' },
    { label: 'Master (1700+)', value: 'master' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Banner: Mode Selectors & Player Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Mode Selector Tabs */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-2 flex items-center gap-1 shadow-sm">
          <button
            onClick={() => { setActiveMode('training'); setIsRushActive(false); setIsSurvivalActive(false); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'training'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Training Mode
          </button>

          <button
            onClick={startRushMode}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'rush'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            3-Min Rush
          </button>

          <button
            onClick={startSurvivalMode}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'survival'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Survival (3 Lives)
          </button>
        </div>

        {/* Feature 2: Player Rating & Streak Dashboard */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-white">{playerElo} ELO</span>
                {eloDelta !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    eloDelta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {eloDelta > 0 ? `+${eloDelta}` : eloDelta}
                  </span>
                )}
              </div>
              <div className={`text-[11px] font-medium ${rankTier.color}`}>
                {rankTier.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2">
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-400 font-bold text-xs justify-end">
                <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                {winStreak}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Streak</div>
            </div>

            <div className="h-7 w-px bg-slate-800" />

            <div className="text-right">
              <div className="text-xs font-bold text-white">
                {activeMode === 'rush' ? rushBest : activeMode === 'survival' ? survivalBest : filteredPuzzles.length}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                {activeMode === 'rush' ? `Best (${rushDifficulty})` : activeMode === 'survival' ? `Record (${survivalDifficulty})` : 'Puzzles'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Playing Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board & Immediate Feedback */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Header Bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2.5 px-4 bg-slate-900/90 rounded-xl mb-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                {activeMode === 'rush' ? <Timer className="w-5 h-5" /> : activeMode === 'survival' ? <Heart className="w-5 h-5 text-rose-400" /> : <Award className="w-5 h-5" />}
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

            {/* Mode-specific status */}
            {activeMode === 'rush' && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <Dices className="w-3 h-3 text-emerald-400" />
                  #{rushQueueIndex + 1}
                </span>
                {!isRushActive && !rushGameOver ? (
                  <button
                    onClick={() => setIsRushActive(true)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-sm transition-all animate-pulse"
                    title="Start 3-minute rush timer, or make a move on the board to start automatically"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    Start Timer (3:00)
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded font-mono ${
                        rushTimeLeft <= 30
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      ⏳ {Math.floor(rushTimeLeft / 60)}:{(rushTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setIsRushActive(!isRushActive)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title={isRushActive ? 'Pause Timer' : 'Resume Timer'}
                    >
                      {isRushActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                <span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-slate-200">
                  Score: {rushScore}
                </span>
              </div>
            )}

            {activeMode === 'survival' && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  <Dices className="w-3 h-3 text-emerald-400" />
                  #{survivalQueueIndex + 1}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((heart) => (
                    <Heart
                      key={heart}
                      className={`w-4 h-4 ${
                        heart <= survivalLives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 ml-1">
                  Score: {survivalScore}
                </span>
              </div>
            )}

            {activeMode === 'training' && (
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
                  {puzzleIndex + 1}/{filteredPuzzles.length}
                </span>
                <button
                  disabled={puzzleIndex === filteredPuzzles.length - 1}
                  onClick={handleNextPuzzle}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Puzzle"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePickRandomTrainingPuzzle}
                  className="flex items-center gap-1 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors ml-1"
                  title="Pick a random puzzle"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold hidden sm:inline">Random</span>
                </button>
              </div>
            )}
          </div>

          {/* Chess Board with Hint Overlays */}
          <ChessBoardView
            fen={fen}
            onMakeMove={handlePlayerMove}
            orientation={playerSide}
            disabled={!isMyTurn && !isAnalyzing}
            isCheck={game.inCheck()}
            turn={isAnalyzing ? currentTurn : playerSide}
            lastMove={lastMove}
            chessInstance={game}
            hintStyles={hintStyles}
          />

          {/* Interactive Feedback & Hint Alerts */}
          <div className="w-full max-w-[560px] mt-3 space-y-2">
            {/* Status notification */}
            {statusMessage ? (
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border text-sm font-medium animate-in fade-in duration-200 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : statusMessage.type === 'error'
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {statusMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                  {statusMessage.type === 'hint' && <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
                  <div>{statusMessage.text}</div>
                </div>

                {statusMessage.type === 'error' && (
                  <button
                    onClick={handleResetPuzzle}
                    className="text-xs underline font-bold hover:text-white shrink-0"
                  >
                    Try Again
                  </button>
                )}

                {isSolved && activeMode === 'training' && (
                  <button
                    onClick={handleNextPuzzle}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    Next Puzzle <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 text-center">
                Find the best tactical continuation for <span className="text-white font-semibold">{playerSide}</span>.
              </div>
            )}

            {/* Feature 3: Progressive Hint Banner */}
            {hintStage > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1 animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Hint Level {hintStage}/3
                </div>
                {hintStage === 1 && (
                  <p>Piece highlighted on <span className="font-mono font-bold text-white uppercase">{currentPuzzle.hintPiece}</span>. {currentPuzzle.hintText}</p>
                )}
                {hintStage === 2 && (
                  <p>Target square <span className="font-mono font-bold text-white uppercase">{currentPuzzle.hintTarget}</span> indicated on board. Aim your strike there!</p>
                )}
                {hintStage === 3 && (
                  <div className="pt-1">
                    <span className="font-semibold text-white">Full Solution Sequence:</span>
                    <span className="font-mono font-bold ml-1.5 text-amber-400">{currentPuzzle.moves.join(' → ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Controls, Hints, Grandmaster Breakdown, and Filter */}
        <div className="lg:col-span-4 space-y-4">
          {/* Action Buttons: Hints, Reset, Analyze */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Controls & Hints</h4>

            {/* Rush Mode Controls & Difficulty Widget */}
            {activeMode === 'rush' && (
              <div className="mb-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                {/* Difficulty Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Rush Difficulty:
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      Best: {rushBest}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {diffOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleRushDifficultyChange(opt.value)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                          rushDifficulty === opt.value
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div>{opt.label.split(' ')[0]}</div>
                        <div className="text-[9px] opacity-75">({opt.count})</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Randomizer Control */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <Dices className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Randomizer: ON ({rushQueue.length} in pool)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReshuffleRush}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Reshuffle puzzle order"
                  >
                    <Shuffle className="w-3 h-3" />
                    Reshuffle
                  </button>
                </div>

                {/* Timer Controls */}
                {!isRushActive && !rushGameOver ? (
                  <div className="pt-1">
                    <p className="text-[11px] text-slate-400 mb-2">
                      Timer starts on your <strong>first move</strong>, or click below:
                    </p>
                    <button
                      onClick={() => setIsRushActive(true)}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      Start Timer Now (3:00)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-amber-400" />
                        Rush In Progress
                      </span>
                      <p className="text-[10px] text-slate-400">Score: {rushScore} • {Math.floor(rushTimeLeft / 60)}:{(rushTimeLeft % 60).toString().padStart(2, '0')}</p>
                    </div>
                    <button
                      onClick={handleRestartRush}
                      className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                    >
                      Restart Run
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Survival Mode Controls & Difficulty Widget */}
            {activeMode === 'survival' && (
              <div className="mb-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                {/* Difficulty Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase text-slate-400">
                      Survival Difficulty:
                    </span>
                    <span className="text-[10px] text-rose-400 font-mono font-bold">
                      Record: {survivalBest}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {diffOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSurvivalDifficultyChange(opt.value)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center transition-all ${
                          survivalDifficulty === opt.value
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div>{opt.label.split(' ')[0]}</div>
                        <div className="text-[9px] opacity-75">({opt.count})</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Randomizer Control */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                    <Dices className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Randomizer: ON ({survivalQueue.length} in deck)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleReshuffleSurvival}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Reshuffle puzzle deck"
                  >
                    <Shuffle className="w-3 h-3" />
                    Reshuffle
                  </button>
                </div>

                {/* Lives & Restart */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((heart) => (
                      <Heart
                        key={heart}
                        className={`w-4 h-4 ${
                          heart <= survivalLives ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-white ml-1.5">
                      {survivalLives} {survivalLives === 1 ? 'Life' : 'Lives'} Left
                    </span>
                  </div>
                  <button
                    onClick={handleRestartSurvival}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    Restart Run
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Feature 3: Multi-Stage Hint Button */}
              <button
                onClick={handleCycleHint}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {hintStage === 0 ? 'Need a Hint?' : hintStage === 1 ? 'Show Target' : hintStage === 2 ? 'Reveal Solution' : 'Solution Shown'}
              </button>

              <button
                onClick={handleResetPuzzle}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Board
              </button>
            </div>

            {/* Feature 5: Analyze with Stockfish */}
            <button
              onClick={handleToggleAnalysis}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                isAnalyzing
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4 text-blue-400" />
              {isAnalyzing ? 'Exit Stockfish Analysis (Resume Puzzle)' : 'Analyze with Stockfish'}
            </button>

            {isAnalyzing && (
              <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-blue-500/30 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-400 mb-1.5 pb-1.5 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Engine Evaluation:
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {evalScore !== null ? evalScore : 'Calculating...'}
                  </span>
                </div>

                {bestMove && (
                  <div className="flex items-center justify-between text-slate-300 mb-2">
                    <span className="text-[11px] text-slate-400">Best Move:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {bestMove.san || bestMove.uci}
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                  Freely drag or click pieces for either side to test lines. Stockfish re-evaluates each move.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleResetAnalysisPosition}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Position
                  </button>
                  <button
                    onClick={handleToggleAnalysis}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Resume Puzzle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feature 6: Grandmaster Explanation / Educational Breakdown */}
          {currentPuzzle.explanation && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Info className="w-4 h-4 text-amber-400" />
                  Grandmaster Breakdown & Takeaway
                </div>
                {isSolved ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3 h-3" /> Unlocked
                  </span>
                ) : showTakeawayEarly ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Revealed Early
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>

              {isSolved || showTakeawayEarly ? (
                <div className="space-y-2.5 text-xs animate-in fade-in duration-300">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Core Concept:</span>
                    <p className="text-slate-200">{currentPuzzle.explanation.concept}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">The Opponent's Blunder:</span>
                    <p className="text-slate-300">{currentPuzzle.explanation.blunder}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-amber-400 font-bold block text-[10px] uppercase">Grandmaster Takeaway:</span>
                    <p className="text-slate-200 mt-0.5 leading-relaxed">{currentPuzzle.explanation.takeaway}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-center space-y-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Complete the puzzle to unlock the Grandmaster analysis, concept breakdown, and tactical takeaway!
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTakeawayEarly(true)}
                    className="text-[10px] text-slate-500 hover:text-amber-400 underline transition-colors cursor-pointer"
                  >
                    Peek takeaway early (Contains Spoilers)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Feature 4: Category & Theme Filtering (Training Mode only) */}
          {activeMode === 'training' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold uppercase text-slate-300">Filter By Theme</h4>
              </div>

              {/* Theme Pills */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {themesList.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setSelectedTheme(t); setPuzzleIndex(0); }}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                      selectedTheme === t
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Difficulty Dropdown */}
              <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">Difficulty Tier</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => { setSelectedDifficulty(e.target.value); setPuzzleIndex(0); }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 focus:outline-none focus:border-amber-500"
              >
                {diffList.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Move History */}
          <MoveHistory history={game.history({ verbose: true })} />
        </div>
      </div>

      {/* Rush / Survival Game Over Modal */}
      <GameOverModal
        isOpen={rushGameOver}
        title={activeMode === 'rush' ? 'Rush Time Expired!' : 'Survival Run Ended!'}
        subtitle={
          activeMode === 'rush'
            ? `You solved ${rushScore} tactical puzzles on ${rushDifficulty.toUpperCase()}! Best Score: ${rushBest}`
            : `You solved ${survivalScore} puzzles on ${survivalDifficulty.toUpperCase()}! Record: ${survivalBest}`
        }
        isWinner={activeMode === 'rush' ? rushScore >= 5 : survivalScore >= 5}
        onPlayAgain={activeMode === 'rush' ? () => startRushMode(rushDifficulty) : () => startSurvivalMode(survivalDifficulty)}
      />
    </div>
  );
}
