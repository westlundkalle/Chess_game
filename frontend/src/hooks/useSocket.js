import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [socketError, setSocketError] = useState(null);
  const [rematchOffer, setRematchOffer] = useState(false);

  useEffect(() => {
    // In production or when proxied, empty string connects to current host
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket Connected]:', socket.id);
      setIsConnected(true);
      setSocketError(null);
    });

    socket.on('disconnect', () => {
      console.log('[Socket Disconnected]');
      setIsConnected(false);
    });

    socket.on('room_created', (data) => {
      setRoomData(data.room);
      setPlayerRole(data.role);
    });

    socket.on('room_joined', (data) => {
      setRoomData(data.room);
      setPlayerRole(data.role);
    });

    socket.on('player_joined', (data) => {
      setRoomData(data.room);
    });

    socket.on('move_made', (data) => {
      setRoomData(data.room);
    });

    socket.on('move_error', (data) => {
      setSocketError(data.error);
    });

    socket.on('join_error', (data) => {
      setSocketError(data.error);
    });

    socket.on('game_resigned', (data) => {
      setRoomData(data.room);
    });

    socket.on('rematch_offered', () => {
      setRematchOffer(true);
    });

    socket.on('rematch_started', (data) => {
      setRoomData(data.room);
      setRematchOffer(false);
      // In rematch, colors swap
      setPlayerRole(prev => (prev === 'white' ? 'black' : prev === 'black' ? 'white' : prev));
    });

    socket.on('chat_received', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('player_disconnected', (data) => {
      setRoomData(data.room);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName, preferredColor = 'white') => {
    if (!socketRef.current) return;
    setSocketError(null);
    socketRef.current.emit('create_room', { playerName, preferredColor }, (res) => {
      if (!res.success) setSocketError(res.error);
    });
  }, []);

  const joinRoom = useCallback((roomId, playerName) => {
    if (!socketRef.current) return;
    setSocketError(null);
    socketRef.current.emit('join_room', { roomId, playerName }, (res) => {
      if (!res.success) setSocketError(res.error);
    });
  }, []);

  const makeMove = useCallback((roomId, move) => {
    if (!socketRef.current) return;
    socketRef.current.emit('make_move', { roomId, move });
  }, []);

  const resign = useCallback((roomId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('resign_game', { roomId });
  }, []);

  const requestRematch = useCallback((roomId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('request_rematch', { roomId });
  }, []);

  const sendChat = useCallback((roomId, message, senderName) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send_chat', { roomId, message, senderName });
  }, []);

  const resetRoomState = useCallback(() => {
    setRoomData(null);
    setPlayerRole(null);
    setChatMessages([]);
    setSocketError(null);
    setRematchOffer(false);
  }, []);

  return {
    socket: socketRef.current,
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
  };
}
