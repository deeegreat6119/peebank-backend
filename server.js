const app = require('./app.js');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_BASE,
    methods: ["GET", "POST", "PATCH"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for user identification to join room
  socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


// Export io for use in other modules to emit events
module.exports.io = io;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
