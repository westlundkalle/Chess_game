import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoardView from '../components/ChessBoardView';
import MoveHistory from '../components/MoveHistory';
import CapturedPieces from '../components/CapturedPieces';
import GameOverModal from '../components/GameOverModal';
import { useSocket } from '../hooks/useSocket';
import { playMoveSound } from '../utils/sound';
import {
  Users,
  Copy,
  Check,
  Link,
  Send,
  Flag,
  RotateCcw,
  User,
  Shield,
  MessageSquare,
  LogOut,
  Sparkles,
  WifiOff
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export default function MultiplayerPage() {
  const {
    isConnected,
    roomData,
    playerRole,
    chatMessages,
    socketError,
    rematchOffer,
    createRoom,
    joinRoom,
    makeMove,
    resign,
    requestRematch,
    sendChat,
    resetRoomState
  } = useSocket();

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('chess_player_name') || 'Grandmaster');
  const [inputRoomId, setInputRoomId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('room') || params.get('join') || '').toUpperCase();
    } catch {
      return '';
    }
  });
  const [preferredColor, setPreferredColor] = useState('white');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [gameOverInfo, setGameOverInfo] = useState({ isOpen: false, title: '', subtitle: '', isWinner: false });

  // Local chess instance to aid legal move calculation & square highlighting
  const [localChess, setLocalChess] = useState(() => new Chess());
  const [lastMove, setLastMove] = useState(null);

  // Sync local chess instance whenever roomData updates
  useEffect(() => {
    if (roomData && roomData.fen) {
      try {
        const c = new Chess(roomData.fen);
        setLocalChess(c);

        if (roomData.history && roomData.history.length > 0) {
          const latest = roomData.history[roomData.history.length - 1];
          setLastMove({ from: latest.from, to: latest.to });

          if (c.inCheck()) {
            playMoveSound('check');
          } else if (latest.captured) {
            playMoveSound('capture');
          } else {
            playMoveSound('move');
          }
        }

        // Check game over
        if (roomData.isGameOver || roomData.status === 'checkmate' || roomData.status === 'draw' || roomData.status === 'resigned') {
          let title = 'Game Over';
          let subtitle = '';
          let isWinner = false;

          if (roomData.status === 'checkmate') {
            const winner = roomData.winner;
            isWinner = (winner === playerRole);
            title = isWinner ? 'Victory by Checkmate!' : 'Defeated by Checkmate';
            subtitle = `${winner?.toUpperCase()} won the match.`;
            playMoveSound('gameover');
          } else if (roomData.status === 'resigned') {
            const winner = roomData.winner;
            isWinner = (winner === playerRole);
            title = isWinner ? 'Opponent Resigned!' : 'You Resigned';
            subtitle = `${winner?.toUpperCase()} wins by resignation.`;
            playMoveSound('gameover');
          } else {
            title = 'Draw';
            subtitle = 'The match ended in a draw.';
            playMoveSound('gameover');
          }

          setGameOverInfo({ isOpen: true, title, subtitle, isWinner });
        } else {
          setGameOverInfo({ isOpen: false, title: '', subtitle: '', isWinner: false });
        }
      } catch (err) {
        console.error('Error syncing room board:', err);
      }
    }
  }, [roomData, playerRole]);

  const handleNameChange = (name) => {
    setPlayerName(name);
    localStorage.setItem('chess_player_name', name);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!isConnected) return;
    createRoom(playerName || 'Player 1', preferredColor);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!isConnected || !inputRoomId.trim()) return;
    joinRoom(inputRoomId.trim().toUpperCase(), playerName || 'Player 2');
  };

  const handlePieceDrop = (move) => {
    if (!roomData || !playerRole || playerRole === 'spectator') return false;

    // Check if player's turn
    const isWhiteTurn = localChess.turn() === 'w';
    if ((isWhiteTurn && playerRole !== 'white') || (!isWhiteTurn && playerRole !== 'black')) {
      return false;
    }

    try {
      // Test move locally
      const testChess = new Chess(localChess.fen());
      const res = testChess.move(move);
      if (!res) return false;

      // Send to server
      makeMove(roomData.id, move);
      return true;
    } catch {
      return false;
    }
  };

  const copyRoomCode = async () => {
    if (!roomData?.id) return;
    const ok = await copyToClipboard(roomData.id);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const copyInviteLink = async () => {
    if (!roomData?.id) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomData.id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomData?.id) return;
    sendChat(roomData.id, chatInput.trim(), playerName);
    setChatInput('');
  };

  const handleResign = () => {
    if (!roomData?.id) return;
    resign(roomData.id);
  };

  const handleRematch = () => {
    if (!roomData?.id) return;
    requestRematch(roomData.id);
  };

  // Determine whose turn it is
  const currentTurn = localChess.turn() === 'w' ? 'white' : 'black';
  const isMyTurn = currentTurn === playerRole;

  // LOBBY VIEW (No active room yet)
  if (!roomData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Play with a Friend</h2>
          <p className="text-slate-400 text-sm mt-2">
            Create a private chess room or enter an invite code to challenge anyone anywhere in real-time.
          </p>

          {!isConnected && (
            <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              <WifiOff className="w-4 h-4 shrink-0" />
              Connecting to real-time multiplayer server...
            </div>
          )}

          {socketError && (
            <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {socketError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Room Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Create New Room
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Host a game and share the generated alphanumeric code.
              </p>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={20}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Grandmaster"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Preferred Side</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['white', 'random', 'black'].map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setPreferredColor(color)}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                          preferredColor === color
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isConnected}
                  className="w-full mt-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Create Private Room
                </button>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-1">
                <Users className="w-5 h-5 text-blue-400" />
                Join Existing Room
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Enter the 6-character room code shared by your friend.
              </p>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    maxLength={20}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Player 2"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Room Code</label>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                    maxLength={8}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono uppercase tracking-widest text-sm focus:outline-none focus:border-amber-500"
                    placeholder="e.g. AB49K2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isConnected || !inputRoomId.trim()}
                  className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  Join Room
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE ROOM VIEW
  const opponentRole = playerRole === 'white' ? 'black' : 'white';
  const opponentData = roomData.players ? roomData.players[opponentRole] : null;
  const isOpponentConnected = opponentData?.connected ?? false;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Room Header & Share Bar */}
      <div className="max-w-[560px] lg:max-w-none mx-auto mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <span className="text-xs text-slate-400 uppercase font-semibold">Room Code:</span>
          
          <button
            type="button"
            onClick={copyRoomCode}
            title="Click to copy code"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 hover:border-amber-500/60 transition-all cursor-pointer group"
          >
            <span className="text-lg font-mono font-bold text-amber-400 tracking-wider">
              {roomData.id}
            </span>
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
            )}
          </button>

          <button
            type="button"
            onClick={copyRoomCode}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              copiedCode
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Code Copied!' : 'Copy Code'}
          </button>

          <button
            type="button"
            onClick={copyInviteLink}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {rematchOffer && (
            <div className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded font-medium animate-pulse">
              Opponent offered a rematch!
            </div>
          )}
          <button
            onClick={resetRoomState}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Leave Room
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Board */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Opponent Bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2 px-3 bg-slate-900/90 rounded-xl mb-3 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {opponentData?.name || 'Waiting for opponent to join...'}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpponentConnected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  {isOpponentConnected ? `Playing as ${opponentRole}` : 'Disconnected / Empty'}
                </div>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              currentTurn === opponentRole && roomData.status === 'active'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {currentTurn === opponentRole && roomData.status === 'active' ? "Opponent's Turn" : 'Waiting'}
            </div>
          </div>

          {/* Chess Board */}
          <ChessBoardView
            fen={roomData.fen}
            onMakeMove={handlePieceDrop}
            orientation={playerRole === 'black' ? 'black' : 'white'}
            disabled={!isMyTurn || roomData.status !== 'active'}
            isCheck={localChess.inCheck()}
            turn={currentTurn}
            lastMove={lastMove}
            chessInstance={localChess}
          />

          {/* Current User Bar */}
          <div className="w-full max-w-[560px] flex items-center justify-between py-2 px-3 bg-slate-900/90 rounded-xl mt-3 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {playerName} (You)
                </div>
                <div className="text-xs text-slate-400">
                  Role: <span className="font-semibold text-slate-200 uppercase">{playerRole}</span>
                </div>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              isMyTurn && roomData.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isMyTurn && roomData.status === 'active' ? 'Your Turn' : 'Waiting'}
            </div>
          </div>
        </div>

        {/* Right Column: Game Controls, Move Notation, and Live Chat */}
        <div className="lg:col-span-4 space-y-4">
          {/* Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRematch}
                disabled={roomData.status === 'active'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Rematch
              </button>

              <button
                onClick={handleResign}
                disabled={roomData.status !== 'active'}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/20 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Flag className="w-3.5 h-3.5" />
                Resign
              </button>
            </div>
          </div>

          {/* Captured Pieces */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">Captured Material</h4>
            <CapturedPieces captured={roomData.capturedPieces || { white: [], black: [] }} />
          </div>

          {/* Move History */}
          <MoveHistory history={roomData.history || []} />

          {/* Live In-Game Chat */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-64 shadow-sm">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800 mb-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Room Chat</h3>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-slate-600 text-center py-8 italic">No messages yet</div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <p className="text-slate-200 break-words">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={200}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={gameOverInfo.isOpen}
        title={gameOverInfo.title}
        subtitle={gameOverInfo.subtitle}
        isWinner={gameOverInfo.isWinner}
        onPlayAgain={handleRematch}
      />
    </div>
  );
}
