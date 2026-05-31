const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 5e6 // 5MB max for image uploads
});

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};
const users = {};

const ADJECTIVES = ['Silent','Ghost','Shadow','Phantom','Void','Echo','Drift','Neon','Cipher','Rogue','Mist','Ember','Stealth','Wraith','Nomad'];
const NOUNS      = ['Fox','Wolf','Crow','Lynx','Hawk','Viper','Raven','Dusk','Storm','Byte','Specter','Flare','Pulse','Node','Wren'];

function randomAlias() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}#${num}`;
}

function roomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function ensureRoom(id, name) {
  if (!rooms[id]) {
    rooms[id] = { name: name || `Room ${id}`, users: new Set(), messages: [] };
  }
  return rooms[id];
}

ensureRoom('lobby', 'Global Lobby');

io.on('connection', (socket) => {
  const alias = randomAlias();
  users[socket.id] = { alias, roomId: null };
  socket.emit('identity', { alias });
  socket.emit('room_list', getRoomList());

  socket.on('join_room', ({ roomId }) => {
    roomId = roomId.toUpperCase().trim() || 'LOBBY';
    if (roomId === 'LOBBY') roomId = 'lobby';
    const room = ensureRoom(roomId);
    const user = users[socket.id];
    if (user.roomId) leaveRoom(socket, user.roomId);
    socket.join(roomId);
    room.users.add(socket.id);
    user.roomId = roomId;
    socket.emit('room_joined', {
      roomId,
      roomName: room.name,
      history: [],
      userCount: room.users.size
    });
    const sysMsg = systemMsg(roomId, `${alias} joined the room`);
    socket.to(roomId).emit('message', sysMsg);
    io.to(roomId).emit('user_count', { roomId, count: room.users.size });
  });

  socket.on('create_room', () => {
    const id = roomCode();
    ensureRoom(id, `Private #${id}`);
    socket.emit('room_created', { roomId: id });
  });

  socket.on('send_message', ({ text }) => {
    const user = users[socket.id];
    if (!user || !user.roomId) return;
    text = text.trim().slice(0, 500);
    if (!text) return;
    const msg = {
      id: crypto.randomBytes(4).toString('hex'),
      alias: user.alias,
      text,
      ts: Date.now(),
      type: 'text'
    };
    const room = rooms[user.roomId];
    if (room) {
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.shift();
      io.to(user.roomId).emit('message', msg);
    }
  });

  // IMAGE UPLOAD
  socket.on('send_image', ({ dataUrl, fileName }) => {
    const user = users[socket.id];
    if (!user || !user.roomId) return;
    // Validate it's an image
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
    // Max 4MB check
    if (dataUrl.length > 5500000) {
      socket.emit('error_msg', 'Image too large! Max 4MB.');
      return;
    }
    const msg = {
      id: crypto.randomBytes(4).toString('hex'),
      alias: user.alias,
      dataUrl,
      fileName: fileName || 'image',
      ts: Date.now(),
      type: 'image'
    };
    const room = rooms[user.roomId];
    if (room) {
      room.messages.push(msg);
      if (room.messages.length > 200) room.messages.shift();
      io.to(user.roomId).emit('message', msg);
    }
  });

  socket.on('typing', () => {
    const user = users[socket.id];
    if (user?.roomId) socket.to(user.roomId).emit('typing', { alias: user.alias });
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user?.roomId) leaveRoom(socket, user.roomId);
    delete users[socket.id];
  });
});

function leaveRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.users.delete(socket.id);
  socket.leave(roomId);
  const alias = users[socket.id]?.alias || 'Someone';
  socket.to(roomId).emit('message', systemMsg(roomId, `${alias} left the room`));
  io.to(roomId).emit('user_count', { roomId, count: room.users.size });
  if (room.users.size === 0 && roomId !== 'lobby') delete rooms[roomId];
}

function systemMsg(roomId, text) {
  return { id: crypto.randomBytes(4).toString('hex'), alias: 'system', text, ts: Date.now(), type: 'text' };
}

function getRoomList() {
  return Object.entries(rooms)
    .filter(([id]) => id === 'lobby')
    .map(([id, r]) => ({ id, name: r.name, count: r.users.size }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🔒 AnonChat running → http://localhost:${PORT}`));
