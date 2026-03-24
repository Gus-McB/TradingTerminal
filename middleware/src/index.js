const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const BinanceBridge = require('./ipc/binance-bridge');

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.use(express.static('public'));

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

    // Send cached state immediately so the UI doesn't wait for the next tick
    const snapshot = bridge.getSnapshot(symbol);
    if (snapshot) socket.emit('orderbook:snapshot', { symbol, ...snapshot });

    const ticker = bridge.getTicker(symbol);
    if (ticker) socket.emit('ticker:update', ticker);

    // Send full kline history so chart renders immediately
    const klines = bridge.getKlines(symbol);
    if (klines.length > 0) socket.emit('kline:history', { symbol, klines });
  });

  socket.on('unsubscribe', (symbol) => {
    socket.leave(symbol);
    bridge.unsubscribe(symbol);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Binance bridge
const bridge = new BinanceBridge(io);
bridge.connect().catch(console.error);

httpServer.listen(3000, () => {
  console.log('Middleware running on http://localhost:3000');
});
