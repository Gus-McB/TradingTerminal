const express    = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const EngineBridge  = require('./ipc/engine-bridge');
const OrderBridge   = require('./ipc/order-bridge');
const { DataSourceManager } = require('./dataSourceManager');
const { socketAuthMiddleware, authEnabled } = require('./auth/authMiddleware');
const { testConnection } = require('./providers');

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

// ── Provider credential testing ──────────────────────────────────────────────
//
// Electron main (the vault) POSTs plaintext credentials here over loopback so
// the middleware can probe the provider. Credentials are used for the duration
// of the request and never stored, cached, or logged.
//
// Guards: loopback-only, and a shared session token when the vault supplies one
// (PROVIDER_API_TOKEN), so another local process cannot drive this endpoint.
const PROVIDER_API_TOKEN = process.env.PROVIDER_API_TOKEN;

/**
 * CORS for the *credential-free* provider routes so the browser dev build can
 * switch data sources. Deliberately NOT applied to /api/providers/test, which
 * carries credentials in its body — that endpoint stays reachable only from
 * Electron main (same-origin-less server-to-server call).
 */
const DEV_ORIGINS = new Set([
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:4173', 'http://127.0.0.1:4173',
]);

function allowDevOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && DEV_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

function loopbackOnly(req, res, next) {
  const ip = req.socket.remoteAddress ?? '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) return res.status(403).json({ error: 'loopback only' });
  if (PROVIDER_API_TOKEN && req.get('x-provider-token') !== PROVIDER_API_TOKEN) {
    return res.status(401).json({ error: 'invalid provider token' });
  }
  next();
}

/** Which provider is serving market data right now. */
app.get('/api/providers/status', allowDevOrigin, (req, res) => res.json(dataSource.status()));

app.options('/api/providers/activate', allowDevOrigin);
app.options('/api/providers/deactivate', allowDevOrigin);

/**
 * Point market data at a provider. Credentials (when the provider needs them)
 * are held in memory for the life of the connection only.
 */
app.post('/api/providers/activate', allowDevOrigin, loopbackOnly, async (req, res) => {
  const { providerId, fields } = req.body ?? {};
  if (typeof providerId !== 'string') {
    return res.status(400).json({ ok: false, message: 'providerId is required' });
  }
  try {
    const status = await dataSource.activate(providerId, fields);
    res.json({ ok: true, status });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message, status: dataSource.status() });
  }
});

/** Hand market data back to the simulated engine. */
app.post('/api/providers/deactivate', allowDevOrigin, loopbackOnly, async (req, res) => {
  const status = await dataSource.deactivate();
  res.json({ ok: true, status });
});

app.post('/api/providers/test', loopbackOnly, async (req, res) => {
  const { providerId, fields } = req.body ?? {};
  if (typeof providerId !== 'string') {
    return res.status(400).json({ ok: false, message: 'providerId is required' });
  }
  const result = await testConnection(providerId, fields);
  // Log the verdict only — never the credentials
  console.log(`[Providers] test ${providerId}: ${result.ok ? 'ok' : 'failed'} — ${result.message}`);
  res.json(result);
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

  // Tell the client which provider is serving market data
  socket.emit('datasource:changed', dataSource.status());

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

// The engine bridge is always connected: the paper account lives in the C++
// matcher regardless of which provider serves market data.
const engineBridge = new EngineBridge(io);
engineBridge.connect().catch(console.error);

const dataSource = new DataSourceManager(io, engineBridge);

// DATA_SOURCE=binance still works as a startup shortcut
if (DATA_SOURCE === 'binance') {
  dataSource.activate('binance').catch(err =>
    console.error('[DataSource] could not start Binance:', err.message));
}

/** Everything below talks to the manager, never a bridge directly. */
const bridge = dataSource;

// Order path always routes to the engine's paper matcher
const orderBridge = new OrderBridge(io);
orderBridge.connect().catch(console.error);

httpServer.listen(3000, () => {
  console.log(`Middleware running on http://localhost:3000 (data source: ${DATA_SOURCE})`);
});
