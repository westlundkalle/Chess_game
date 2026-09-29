const { Chess } = require('chess.js');

class GamesManager {
  constructor() {
    this.rooms = new Map();
    this.playerToRoom = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom(hostSocketId, hostName = 'Player 1', preferredColor = 'white') {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const hostColor = preferredColor === 'black' ? 'black' : preferredColor === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : 'white';
    const chess = new Chess();

    const room = {
      id: roomId,
      chess,
      fen: chess.fen(),
      history: [],
      capturedPieces: { white: [], black: [] },
      players: {
        white: hostColor === 'white' ? { id: hostSocketId, name: hostName, connected: true } : null,
        black: hostColor === 'black' ? { id: hostSocketId, name: hostName, connected: true } : null
      },
      spectators: [],
      status: 'waiting', // waiting, active, checkmate, stalemate, draw, resigned
      winner: null,
      rematchRequestedBy: null,
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.playerToRoom.set(hostSocketId, roomId);

    return { room, role: hostColor };
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase().trim()) || null;
  }

  joinRoom(roomId, socketId, playerName = 'Player 2') {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: 'Room not found' };
    }

    let role = 'spectator';

    if (!room.players.white) {
      room.players.white = { id: socketId, name: playerName, connected: true };
      role = 'white';
    } else if (!room.players.black) {
      room.players.black = { id: socketId, name: playerName, connected: true };
      role = 'black';
    } else {
      // Check if existing player reconnecting
      if (room.players.white.id === socketId) {
        room.players.white.connected = true;
        role = 'white';
      } else if (room.players.black.id === socketId) {
        room.players.black.connected = true;
        role = 'black';
      } else {
        const existingIndex = room.spectators.findIndex(s => s.id === socketId);
        if (existingIndex === -1) {
          room.spectators.push({ id: socketId, name: playerName });
        }
        role = 'spectator';
      }
    }

    if (room.players.white && room.players.black && room.status === 'waiting') {
      room.status = 'active';
    }

    this.playerToRoom.set(socketId, room.id);

    return { room, role };
  }

  calculateCapturedPieces(chess) {
    const startPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentPieces = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    const board = chess.board();
    for (const row of board) {
      for (const square of row) {
        if (square && square.type !== 'k') {
          currentPieces[square.color][square.type]++;
        }
      }
    }

    const capturedByWhite = [];
    const capturedByBlack = [];

    for (const [type, count] of Object.entries(startPieces)) {
      const missingBlack = count - currentPieces.b[type];
      for (let i = 0; i < missingBlack; i++) {
        capturedByWhite.push(type.toUpperCase());
      }

      const missingWhite = count - currentPieces.w[type];
      for (let i = 0; i < missingWhite; i++) {
        capturedByBlack.push(type.toLowerCase());
      }
    }

    return { white: capturedByWhite, black: capturedByBlack };
  }

  makeMove(roomId, socketId, moveData) {
    const room = this.getRoom(roomId);
    if (!room) return { error: 'Room not found' };

    const { white, black } = room.players;
    const currentTurn = room.chess.turn(); // 'w' or 'b'
    const expectedPlayerId = currentTurn === 'w' ? white?.id : black?.id;

    if (socketId !== expectedPlayerId) {
      return { error: 'Not your turn' };
    }

    try {
      // moveData can be { from: 'e2', to: 'e4', promotion: 'q' } or SAN string
      const result = room.chess.move(moveData);
      if (!result) {
        return { error: 'Invalid move' };
      }

      room.fen = room.chess.fen();
      room.history.push({
        san: result.san,
        from: result.from,
        to: result.to,
        piece: result.piece,
        color: result.color,
        captured: result.captured || null,
        promotion: result.promotion || null
      });

      room.capturedPieces = this.calculateCapturedPieces(room.chess);

      // Check game end conditions
      if (room.chess.isGameOver()) {
        if (room.chess.isCheckmate()) {
          room.status = 'checkmate';
          room.winner = result.color === 'w' ? 'white' : 'black';
        } else if (room.chess.isDraw()) {
          room.status = 'draw';
          room.winner = 'draw';
        } else if (room.chess.isStalemate()) {
          room.status = 'stalemate';
          room.winner = 'draw';
        } else if (room.chess.isThreefoldRepetition()) {
          room.status = 'draw';
          room.winner = 'draw';
        } else if (room.chess.isInsufficientMaterial()) {
          room.status = 'draw';
          room.winner = 'draw';
        }
      }

      return {
        success: true,
        move: result,
        fen: room.fen,
        turn: room.chess.turn() === 'w' ? 'white' : 'black',
        isCheck: room.chess.inCheck(),
        isGameOver: room.chess.isGameOver(),
        status: room.status,
        winner: room.winner,
        history: room.history,
        capturedPieces: room.capturedPieces
      };
    } catch (err) {
      return { error: err.message || 'Illegal move' };
    }
  }

  resign(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room || room.status !== 'active') return null;

    if (room.players.white?.id === socketId) {
      room.status = 'resigned';
      room.winner = 'black';
    } else if (room.players.black?.id === socketId) {
      room.status = 'resigned';
      room.winner = 'white';
    } else {
      return null;
    }

    return room;
  }

  requestRematch(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    if (!room.rematchRequestedBy) {
      room.rematchRequestedBy = socketId;
      return { status: 'offered', fromSocketId: socketId };
    }

    if (room.rematchRequestedBy !== socketId) {
      // Both agreed, reset game and swap colors
      const oldWhite = room.players.white;
      const oldBlack = room.players.black;

      room.chess = new Chess();
      room.fen = room.chess.fen();
      room.history = [];
      room.capturedPieces = { white: [], black: [] };
      room.players.white = oldBlack;
      room.players.black = oldWhite;
      room.status = 'active';
      room.winner = null;
      room.rematchRequestedBy = null;

      return { status: 'accepted', room };
    }

    return { status: 'already_requested' };
  }

  handleDisconnect(socketId) {
    const roomId = this.playerToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.getRoom(roomId);
    if (!room) {
      this.playerToRoom.delete(socketId);
      return null;
    }

    let changed = false;
    let playerColor = null;

    if (room.players.white && room.players.white.id === socketId) {
      room.players.white.connected = false;
      changed = true;
      playerColor = 'white';
    } else if (room.players.black && room.players.black.id === socketId) {
      room.players.black.connected = false;
      changed = true;
      playerColor = 'black';
    } else {
      room.spectators = room.spectators.filter(s => s.id !== socketId);
    }

    this.playerToRoom.delete(socketId);

    // If both disconnected and room is old, cleanup after a delay
    const whiteConnected = room.players.white?.connected;
    const blackConnected = room.players.black?.connected;

    if (!whiteConnected && !blackConnected && room.spectators.length === 0) {
      setTimeout(() => {
        const checkRoom = this.getRoom(roomId);
        if (checkRoom && !checkRoom.players.white?.connected && !checkRoom.players.black?.connected) {
          this.rooms.delete(roomId);
        }
      }, 10 * 60 * 1000); // 10 minutes retention
    }

    return { room, playerColor, changed };
  }
}

module.exports = new GamesManager();
