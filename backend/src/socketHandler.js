const gamesManager = require('./gamesManager');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // Create a new room
    socket.on('create_room', ({ playerName, preferredColor }, callback) => {
      try {
        const { room, role } = gamesManager.createRoom(socket.id, playerName, preferredColor);
        socket.join(room.id);
        console.log(`[Room Created] Room: ${room.id} by ${playerName} (${role})`);

        const response = {
          success: true,
          roomId: room.id,
          role,
          room: serializeRoom(room)
        };

        if (typeof callback === 'function') callback(response);
        socket.emit('room_created', response);
      } catch (err) {
        console.error('Error creating room:', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Join an existing room
    socket.on('join_room', ({ roomId, playerName }, callback) => {
      try {
        const result = gamesManager.joinRoom(roomId, socket.id, playerName);

        if (result.error) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          socket.emit('join_error', { error: result.error });
          return;
        }

        const { room, role } = result;
        socket.join(room.id);
        console.log(`[Room Joined] Room: ${room.id}, User: ${playerName}, Role: ${role}`);

        const response = {
          success: true,
          roomId: room.id,
          role,
          room: serializeRoom(room)
        };

        if (typeof callback === 'function') callback(response);
        socket.emit('room_joined', response);

        // Broadcast to other users in the room
        socket.to(room.id).emit('player_joined', {
          role,
          playerName,
          room: serializeRoom(room)
        });
      } catch (err) {
        console.error('Error joining room:', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Make a move
    socket.on('make_move', ({ roomId, move }, callback) => {
      try {
        const result = gamesManager.makeMove(roomId, socket.id, move);

        if (result.error) {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
          socket.emit('move_error', { error: result.error });
          return;
        }

        const room = gamesManager.getRoom(roomId);
        const payload = {
          ...result,
          room: serializeRoom(room)
        };

        if (typeof callback === 'function') callback({ success: true, result });

        // Broadcast move to everyone in room including sender (or io.to(roomId))
        io.to(roomId).emit('move_made', payload);
      } catch (err) {
        console.error('Error making move:', err);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Resign
    socket.on('resign_game', ({ roomId }) => {
      const room = gamesManager.resign(roomId, socket.id);
      if (room) {
        io.to(roomId).emit('game_resigned', {
          room: serializeRoom(room),
          winner: room.winner,
          resignedBy: socket.id
        });
      }
    });

    // Request rematch
    socket.on('request_rematch', ({ roomId }) => {
      const result = gamesManager.requestRematch(roomId, socket.id);
      if (!result) return;

      if (result.status === 'offered') {
        socket.to(roomId).emit('rematch_offered', { from: socket.id });
      } else if (result.status === 'accepted') {
        io.to(roomId).emit('rematch_started', {
          room: serializeRoom(result.room)
        });
      }
    });

    // Chat message
    socket.on('send_chat', ({ roomId, message, senderName }) => {
      if (!roomId || !message) return;
      io.to(roomId).emit('chat_received', {
        id: Date.now() + Math.random().toString(36).substring(2, 6),
        message: message.slice(0, 300),
        senderName: senderName || 'Player',
        senderId: socket.id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      const result = gamesManager.handleDisconnect(socket.id);
      if (result && result.changed) {
        const { room, playerColor } = result;
        io.to(room.id).emit('player_disconnected', {
          playerColor,
          room: serializeRoom(room)
        });
      }
    });
  });
}

function serializeRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    fen: room.fen,
    turn: room.chess.turn() === 'w' ? 'white' : 'black',
    status: room.status,
    winner: room.winner,
    history: room.history,
    capturedPieces: room.capturedPieces,
    players: {
      white: room.players.white ? { name: room.players.white.name, connected: room.players.white.connected } : null,
      black: room.players.black ? { name: room.players.black.name, connected: room.players.black.connected } : null
    },
    spectatorCount: room.spectators.length,
    isCheck: room.chess.inCheck(),
    isGameOver: room.chess.isGameOver()
  };
}

module.exports = { setupSocketHandlers };
