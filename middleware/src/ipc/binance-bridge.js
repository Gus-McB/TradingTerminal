/**
 * BinanceBridge — replaces EngineBridge (ZMQ/FlatBuffers mock).
 *
 * Connects to Binance public WebSocket combined stream (no API key required).
 * Emits the same Socket.IO events the UI already consumes:
 *   orderbook:snapshot  — full top-20 book (pushed every depth update)
 *   ticker:update       — 24 hr rolling stats
 *   kline:update        — 1-minute OHLCV bar (current + closed)
 *
 * Binance symbol format:  BTC/USD  →  btcusdt
 * Streams used per symbol:
 *   {sym}@depth20@100ms   — full 20-level book snapshot every 100 ms
 *   {sym}@ticker          — rolling 24 hr stats
 *   {sym}@kline_1m        — 1-minute OHLCV
 *
 * Historical klines are fetched via REST on first subscribe so the chart
 * has data immediately (up to 200 bars).
 */

const BINANCE_WS   = 'wss://stream.binance.com:9443/stream';
const BINANCE_REST = 'https://api.binance.com/api/v3';
const KLINE_LIMIT  = 200; // bars of history fetched on subscribe

/** Convert app symbol (BTC/USD) to Binance stream symbol (btcusdt) */
function toBinanceSym(symbol) {
  return symbol.replace('/', '').toLowerCase().replace('usd', 'usdt');
}

/** The three streams consumed per symbol */
function streamsFor(symbol) {
  const bs = toBinanceSym(symbol);
  return [`${bs}@depth20@100ms`, `${bs}@ticker`, `${bs}@kline_1m`];
}

/** Convert Binance stream symbol back to app symbol */
function toAppSym(binanceSym) {
  // btcusdt → BTC/USD  (strip trailing 't', uppercase, insert '/')
  const upper = binanceSym.replace('usdt', '').toUpperCase();
  return `${upper}/USD`;
}

class BinanceBridge {
  constructor(io) {
    this.io               = io;
    this.ws               = null;
    this.running          = false;
    this.subscribedSymbols = new Set();   // app-format  e.g. 'BTC/USD'
    this.orderBooks       = new Map();    // symbol → { bids, asks, spread, spreadPercent }
    this.tickers          = new Map();    // symbol → ticker object
    this.klines           = new Map();    // symbol → Candle[]
    this._reconnectTimer  = null;
    this._nextRequestId   = 1;            // Binance WS SUBSCRIBE/UNSUBSCRIBE request ids
  }

  // ─── Public API (matches EngineBridge) ───────────────────────────────────

  async connect() {
    this.running = true;
    const defaultSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD'];
    for (const sym of defaultSymbols) {
      this.subscribedSymbols.add(sym);
    }
    await this._fetchHistoricalKlines();
    this._openWebSocket();
  }

  subscribe(symbol) {
    if (this.subscribedSymbols.has(symbol)) return;
    this.subscribedSymbols.add(symbol);
    // Subscribe on the live socket — no reconnect, other streams keep flowing
    this._sendStreamRequest('SUBSCRIBE', streamsFor(symbol));
    this._fetchKlinesForSymbol(symbol).catch(() => {});
  }

  unsubscribe(symbol) {
    const room = this.io.sockets.adapter.rooms.get(symbol);
    if (room && room.size > 0) return; // still have clients
    this.subscribedSymbols.delete(symbol);
    this._sendStreamRequest('UNSUBSCRIBE', streamsFor(symbol));
  }

  /** Live stream management on the open socket (Binance combined stream API). */
  _sendStreamRequest(method, params) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return; // picked up on next (re)connect
    this.ws.send(JSON.stringify({ method, params, id: this._nextRequestId++ }));
    console.log(`[BinanceBridge] ${method} ${params.join(', ')}`);
  }

  getSnapshot(symbol) { return this.orderBooks.get(symbol) || null; }
  getTicker(symbol)   { return this.tickers.get(symbol)   || null; }
  getKlines(symbol)   { return this.klines.get(symbol)    || [];   }

  async disconnect() {
    this.running = false;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── WebSocket lifecycle ─────────────────────────────────────────────────

  _openWebSocket() {
    if (!this.running) return;

    const streams = [...this.subscribedSymbols].flatMap(streamsFor);

    const url = `${BINANCE_WS}?streams=${streams.join('/')}`;
    console.log(`[BinanceBridge] Connecting: ${streams.length} streams`);

    this.ws = new WebSocket(url);

    this.ws.addEventListener('open', () => {
      console.log('[BinanceBridge] Connected to Binance WebSocket');
    });

    this.ws.addEventListener('message', ({ data }) => {
      try {
        const msg = JSON.parse(data);
        if (!msg.stream || !msg.data) return; // SUBSCRIBE/UNSUBSCRIBE acks land here
        this._dispatch(msg.stream, msg.data);
      } catch (e) {
        console.error('[BinanceBridge] Parse error:', e.message);
      }
    });

    this.ws.addEventListener('close', (ev) => {
      if (!this.running) return;
      console.warn(`[BinanceBridge] Disconnected (${ev.code}), reconnecting in 3 s…`);
      this._reconnectTimer = setTimeout(() => this._openWebSocket(), 3000);
    });

    this.ws.addEventListener('error', (ev) => {
      console.error('[BinanceBridge] WS error:', ev.message ?? ev.type);
    });
  }

  _reconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    // _openWebSocket is called by the 'close' handler above
  }

  // ─── Stream dispatcher ───────────────────────────────────────────────────

  _dispatch(stream, data) {
    // stream format: "btcusdt@depth20@100ms" / "btcusdt@ticker" / "btcusdt@kline_1m"
    if (stream.includes('@depth'))  return this._handleDepth(stream, data);
    if (stream.includes('@ticker')) return this._handleTicker(stream, data);
    if (stream.includes('@kline'))  return this._handleKline(stream, data);
  }

  // ─── Order book ──────────────────────────────────────────────────────────

  _handleDepth(stream, data) {
    // data.bids / data.asks  — arrays of [price, qty] strings, best-first
    const binanceSym = stream.split('@')[0];
    const symbol     = toAppSym(binanceSym);

    const parseLevels = (raw) => {
      let total = 0;
      return raw.map(([p, s]) => {
        const price = parseFloat(p);
        const size  = parseFloat(s);
        total += size;
        return { price, size, total };
      });
    };

    const bids = parseLevels(data.bids);
    const asks = parseLevels(data.asks);

    const spread = bids.length && asks.length ? asks[0].price - bids[0].price : 0;
    const mid    = bids.length ? bids[0].price : 0;

    const book = {
      bids,
      asks,
      spread,
      spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
    };

    this.orderBooks.set(symbol, book);
    this.io.to(symbol).emit('orderbook:snapshot', { symbol, ...book });
  }

  // ─── Ticker ──────────────────────────────────────────────────────────────

  _handleTicker(stream, data) {
    const binanceSym = stream.split('@')[0];
    const symbol     = toAppSym(binanceSym);

    const ticker = {
      symbol,
      price:         parseFloat(data.c),   // last price
      change24h:     parseFloat(data.p),   // price change
      changePercent: parseFloat(data.P),   // price change %
      high24h:       parseFloat(data.h),
      low24h:        parseFloat(data.l),
      volume:        parseFloat(data.v) * parseFloat(data.c), // quote volume approx
    };

    this.tickers.set(symbol, ticker);
    this.io.to(symbol).emit('ticker:update', ticker);
  }

  // ─── Klines ──────────────────────────────────────────────────────────────

  _handleKline(stream, data) {
    const binanceSym = stream.split('@')[0];
    const symbol     = toAppSym(binanceSym);
    const k          = data.k;

    const candle = {
      time:   Math.floor(k.t / 1000), // ms → unix seconds
      open:   parseFloat(k.o),
      high:   parseFloat(k.h),
      low:    parseFloat(k.l),
      close:  parseFloat(k.c),
      volume: parseFloat(k.v),
      closed: k.x,                    // true when bar closes
    };

    // Merge into local history
    const bars  = this.klines.get(symbol) ?? [];
    const last  = bars[bars.length - 1];

    if (last && last.time === candle.time) {
      bars[bars.length - 1] = candle;
    } else {
      bars.push(candle);
      if (bars.length > 500) bars.shift();
    }
    this.klines.set(symbol, bars);

    this.io.to(symbol).emit('kline:update', { symbol, candle });
  }

  // ─── Historical klines (REST) ────────────────────────────────────────────

  async _fetchHistoricalKlines() {
    const fetches = [...this.subscribedSymbols].map(sym => this._fetchKlinesForSymbol(sym));
    await Promise.allSettled(fetches);
  }

  async _fetchKlinesForSymbol(symbol) {
    const binanceSym = toBinanceSym(symbol).toUpperCase();
    const url = `${BINANCE_REST}/klines?symbol=${binanceSym}&interval=1m&limit=${KLINE_LIMIT}`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data)) return;

      // Each entry: [openTime, open, high, low, close, volume, ...]
      const bars = data.map(row => ({
        time:   Math.floor(row[0] / 1000),
        open:   parseFloat(row[1]),
        high:   parseFloat(row[2]),
        low:    parseFloat(row[3]),
        close:  parseFloat(row[4]),
        volume: parseFloat(row[5]),
        closed: true,
      }));

      this.klines.set(symbol, bars);
      console.log(`[BinanceBridge] Loaded ${bars.length} historical klines for ${symbol}`);
    } catch (e) {
      console.error(`[BinanceBridge] Failed to fetch klines for ${symbol}:`, e.message);
    }
  }
}

module.exports = BinanceBridge;
