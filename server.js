const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// In-memory structures (simple, no DB)
const users = {}; // socketId -> { username, room }
const rooms = {}; // roomName -> Set of usernames

io.on('connection', (socket) => {
  // new connection
  console.log('socket connected:', socket.id);

  // join room event: payload { username, room }
  socket.on('join', ({ username, room }) => {
    username = (username || 'Anonymous').trim().slice(0, 32);
    room = (room || 'General').trim().slice(0, 32);

    // store
    users[socket.id] = { username, room };
    rooms[room] = rooms[room] || new Set();
    rooms[room].add(username);

    socket.join(room);

    // notify this socket
    socket.emit('systemMessage', {
      text: `Welcome ${username}! You joined "${room}".`,
      ts: Date.now()
    });

    // notify others in room
    socket.to(room).emit('systemMessage', {
      text: `${username} joined the chat.`,
      ts: Date.now()
    });

    // update user list in room
    io.in(room).emit('userList', Array.from(rooms[room]));

    console.log(`${username} joined ${room}`);
  });

  // chat message: payload { text }
  socket.on('chatMessage', (payload) => {
    const meta = users[socket.id];
    if (!meta) return;
    const { username, room } = meta;
    const text = (payload.text || '').slice(0, 2000);
    const msg = {
      username,
      text,
      ts: Date.now(),
      id: socket.id
    };
    io.in(room).emit('chatMessage', msg);
  });

  // typing indicator: payload { typing: true/false }
  socket.on('typing', ({ typing }) => {
    const meta = users[socket.id];
    if (!meta) return;
    const { username, room } = meta;
    socket.to(room).emit('typing', { username, typing: !!typing });
  });

  // disconnect
  socket.on('disconnect', () => {
    const meta = users[socket.id];
    if (!meta) return;
    const { username, room } = meta;

    // remove from room set
    if (rooms[room]) {
      rooms[room].delete(username);
      if (rooms[room].size === 0) delete rooms[room];
    }

    // notify room
    socket.to(room).emit('systemMessage', {
      text: `${username} left the chat.`,
      ts: Date.now()
    });

    // update user list
    if (rooms[room]) io.in(room).emit('userList', Array.from(rooms[room]));
    else io.in(room).emit('userList', []);

    delete users[socket.id];
    console.log(`${username} disconnected from ${room}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
