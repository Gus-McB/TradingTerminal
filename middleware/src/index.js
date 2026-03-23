// middleware/src/index.js (your updated server.js)
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const EngineBridge = require('./ipc/engine-bridge');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }  // For development
});

app.use(express.json());
app.use(express.static('public'));

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe', (symbol) => {
    console.log(`${socket.id} subscribed to ${symbol}`);
    socket.join(symbol);
    bridge.subscribe(symbol);

    // Send current snapshot to the joining client immediately
    const snapshot = bridge.getSnapshot(symbol);
    if (snapshot) {
      socket.emit('orderbook:snapshot', { symbol, ...snapshot });
    }
    const ticker = bridge.getTicker(symbol);
    if (ticker) {
      socket.emit('ticker:update', ticker);
    }
  });

  socket.on('unsubscribe', (symbol) => {
    socket.leave(symbol);
    bridge.unsubscribe(symbol);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to C++ Engine
const bridge = new EngineBridge(io);
bridge.connect().catch(console.error);

httpServer.listen(3000, () => {
  console.log('Middleware running on http://localhost:3000');
});