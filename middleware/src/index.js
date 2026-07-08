const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const EngineBridge  = require('./ipc/engine-bridge');
const BinanceBridge = require('./ipc/binance-bridge');
const OrderBridge   = require('./ipc/order-bridge');
const { socketAuthMiddleware, authEnabled } = require('./auth/authMiddleware');

// DATA_SOURCE=engine (default) — C++ engine over ZMQ/FlatBuffers, orders matched
// DATA_SOURCE=binance          — live Binance market data (orders still route to the engine)
const DATA_SOURCE = (process.env.DATA_SOURCE ?? 'engine').toLowerCase();

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(express.json());
app.use(express.static('public'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dataSource: DATA_SOURCE, timestamp: Date.now() });
});

// Supabase JWT gate — enforced only when SUPABASE_JWT_SECRET is configured
io.use(socketAuthMiddleware);
if (authEnabled()) console.log('[Auth] Supabase JWT verification enabled');

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Replay current paper account state so widgets render immediately
  const account = bridge.getAccount?.();
  if (account) socket.emit('account:update', account);

  socket.on('subscribe', (symbol) => {
    if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 32) return;
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
    if (typeof symbol !== 'string') return;
    socket.leave(symbol);
    bridge.unsubscribe(symbol);
  });

  socket.on('order:submit', (payload) => {
    orderBridge.submit(socket, payload);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Market data bridge (engine is the default source of truth)
const bridge = DATA_SOURCE === 'binance'
  ? new BinanceBridge(io)
  : new EngineBridge(io);
bridge.connect().catch(console.error);

// Order path always routes to the engine's paper matcher
const orderBridge = new OrderBridge(io);
orderBridge.connect().catch(console.error);

httpServer.listen(3000, () => {
  console.log(`Middleware running on http://localhost:3000 (data source: ${DATA_SOURCE})`);
});
