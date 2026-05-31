const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// In-memory rooms and users (no DB, fully ephemeral)
const rooms = {}; // roomId -> { name, users: Set<socketId>, messages: [] }
const users = {}; // socketId -> { alias, roomId }

const ADJECTIVES = ['Silent','Ghost','Shadow','Phantom','Void','Echo','Drift','Neon','Cipher','Rogue','Mist','Ember','Stealth','Wraith','Nomad'];
const NOUNS      = ['Fox','Wolf','Crow','Lynx','Hawk','Viper','Raven','Dusk','Storm','Byte','Specter','Flare','Pulse','Node','Wren'];

function randomAlias() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}#${num}`;
}

function roomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9B2"
}

function ensureRoom(id, name) {
  if (!rooms[id]) {
    rooms[id] = { name: name || `Room ${id}`, users: new Set(), messages: [] };
  }
  return rooms[id];
}

// Public lobby room
ensureRoom('lobby', '🌐 Global Lobby');

io.on('connection', (socket) => {
  const alias = randomAlias();
  users[socket.id] = { alias, roomId: null };

  // Send identity immediately
  socket.emit('identity', { alias });

  // Send public room list
  socket.emit('room_list', getRoomList());

  /* -------- JOIN ROOM -------- */
  socket.on('join_room', ({ roomId }) => {
    roomId = roomId.toUpperCase().trim() || 'LOBBY';
    if (roomId === 'LOBBY') roomId = 'lobby';

    const room = ensureRoom(roomId);
    const user = users[socket.id];

    // Leave old room
    if (user.roomId) {
      leaveRoom(socket, user.roomId);
    }

    // Join new room
    socket.join(roomId);
    room.users.add(socket.id)
    user.roomId = roomId;

    // Send recent history (last 50 msgs)
    socket.emit('room_joined', {
      roomId,
      roomName: room.name,
      history: [],
      userCount: room.users.size
    });

    // Notify others
    const sysMsg = systemMsg(roomId, `${alias} joined the room`);
    socket.to(roomId).emit('message', sysMsg);

    // Update user count for everyone
    io.to(roomId).emit('user_count', { roomId, count: room.users.size });
  });

  /* -------- CREATE PRIVATE ROOM -------- */
  socket.on('create_room', () => {
    const id = roomCode();
    ensureRoom(id, `Private #${id}`);
    socket.emit('room_created', { roomId: id });
  });

  /* -------- SEND MESSAGE -------- */
  socket.on('send_message', ({ text }) => {
    const user = users[socket.id];
    if (!user || !user.roomId) return;
    text = text.trim().slice(0, 500);
    if (!text) return;

    const msg = {
      id: crypto.randomBytes(4).toString('hex'),
      alias: user.alias,
      text,
      ts: Date.now()
    };

    const room = rooms[user.roomId];
    if (room) {
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.shift(); // cap history
      io.to(user.roomId).emit('message', msg);
    }
  });

  /* -------- TYPING -------- */
  socket.on('typing', () => {
    const user = users[socket.id];
    if (user?.roomId) {
      socket.to(user.roomId).emit('typing', { alias: user.alias });
    }
  });

  /* -------- DISCONNECT -------- */
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user?.roomId) {
      leaveRoom(socket, user.roomId);
    }
    delete users[socket.id];
  });
});

function leaveRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.users.delete(socket.id);
  socket.leave(roomId);
  const alias = users[socket.id]?.alias || 'Someone';
  const sysMsg = systemMsg(roomId, `${alias} left the room`);
  socket.to(roomId).emit('message', sysMsg);
  io.to(roomId).emit('user_count', { roomId, count: room.users.size });
  // Clean up empty private rooms (not lobby)
  if (room.users.size === 0 && roomId !== 'lobby') {
    delete rooms[roomId];
  }
}

function systemMsg(roomId, text) {
  return { id: crypto.randomBytes(4).toString('hex'), alias: 'system', text, ts: Date.now() };
}

function getRoomList() {
  return Object.entries(rooms)
    .filter(([id]) => id === 'lobby')
    .map(([id, r]) => ({ id, name: r.name, count: r.users.size }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🔒 AnonChat running → http://localhost:${PORT}`));
