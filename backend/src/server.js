const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { setupSocketHandlers } = require('./socketHandler');
const gamesManager = require('./gamesManager');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeRooms: gamesManager.rooms.size
  });
});

// API endpoint to inspect or verify room
app.get('/api/rooms/:roomId', (req, res) => {
  const room = gamesManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    id: room.id,
    status: room.status,
    fen: room.fen,
    turn: room.chess.turn() === 'w' ? 'white' : 'black',
    players: {
      white: !!room.players.white,
      black: !!room.players.black
    }
  });
});

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Setup socket event routing
setupSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  Chess Real-time Server running on port ${PORT}`);
  console.log(`  Ready for WebSocket & HTTP connections`);
  console.log(`===============================================`);
});
