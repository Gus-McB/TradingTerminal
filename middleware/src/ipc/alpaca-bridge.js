/**
 * AlpacaBridge — live US equities market data from Alpaca.
 *
 * Emits the same Socket.IO events as the other bridges:
 *   ticker:update       from trades + the daily snapshot
 *   orderbook:snapshot  from quotes (see limitation below)
 *   kline:history       REST 1-minute bars on subscribe
 *   kline:update        streamed 1-minute bars
 *
 * Limitations worth knowing:
 *   • The free tier streams the IEX feed, which is a single venue — prices
 *     are real but thinner than the full SIP consolidated tape.
 *   • Quotes are top-of-book only, so the "order book" is one level per side,
 *     not the 25-level depth the simulated engine produces.
 *   • Market data only. Order routing still goes to the paper matcher.
 *
 * Credentials arrive in memory from the Electron vault and are never written
 * to disk or logged.
 */

const DATA_REST = 'https://data.alpaca.markets';
const DATA_WS_EQUITY = 'wss://stream.data.alpaca.markets/v2/iex';
const HISTORY_BARS = 200;
const MAX_KLINE_BARS = 500;

class AlpacaBridge {
  constructor(io, credentials = {}) {
    this.io = io;
    this.key = credentials.apiKeyId;
    this.secret = credentials.secretKey;
    this.ws = null;
    this.running = false;
    this.authed = false;
    this.subscribedSymbols = new Set();
    this.orderBooks = new Map();
    this.tickers = new Map();
    this.klines = new Map();
    this._reconnectTimer = null;
  }

  get _authHeaders() {
    return {
      'APCA-API-KEY-ID': this.key,
      'APCA-API-SECRET-KEY': this.secret,
    };
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async connect() {
    if (!this.key || !this.secret) {
      throw new Error('Alpaca market data needs an API key pair');
    }
    this.running = true;
    await this._openWebSocket();
  }

  async disconnect() {
    this.running = false;
    clearTimeout(this._reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch { /* already closing */ }
      this.ws = null;
    }
    this.authed = false;
  }

  _openWebSocket() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(DATA_WS_EQUITY);
      this.ws = ws;
      let settled = false;

      const fail = (err) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const timer = setTimeout(() => fail(new Error('Alpaca stream did not authenticate in time')), 12_000);

      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ action: 'auth', key: this.key, secret: this.secret }));
      });

      ws.addEventListener('message', ({ data }) => {
        let messages;
        try {
          messages = JSON.parse(data);
        } catch {
          return;
        }
        if (!Array.isArray(messages)) return;

        for (const msg of messages) {
          // Control frames
          if (msg.T === 'success' && msg.msg === 'authenticated') {
            this.authed = true;
            clearTimeout(timer);
            if (!settled) { settled = true; resolve(); }
            // Restore any symbols requested before auth completed
            if (this.subscribedSymbols.size > 0) {
              this._sendSubscribe([...this.subscribedSymbols]);
            }
            continue;
          }
          if (msg.T === 'error') {
            const err = new Error(`Alpaca stream error ${msg.code}: ${msg.msg}`);
            clearTimeout(timer);
            fail(err);
            console.error(`[Alpaca] ${err.message}`);
            continue;
          }
          this._handleMessage(msg);
        }
      });

      ws.addEventListener('error', () => {
        clearTimeout(timer);
        fail(new Error('Alpaca stream connection failed'));
      });

      ws.addEventListener('close', () => {
        this.authed = false;
        if (!this.running) return;
        clearTimeout(timer);
        fail(new Error('Alpaca stream closed before authenticating'));
        console.warn('[Alpaca] stream closed, reconnecting in 3s…');
        this._reconnectTimer = setTimeout(() => {
          this._openWebSocket().catch(e => console.error('[Alpaca] reconnect failed:', e.message));
        }, 3000);
      });
    });
  }

  // ── Stream handling ────────────────────────────────────────────────────────

  _handleMessage(msg) {
    switch (msg.T) {
      case 't': return this._handleTrade(msg);
      case 'q': return this._handleQuote(msg);
      case 'b': return this._handleBar(msg);
      default:  return undefined;
    }
  }

  /** Trade — moves the last price. */
  _handleTrade(msg) {
    const symbol = msg.S;
    const price = msg.p;
    if (!symbol || typeof price !== 'number') return;

    const prev = this.tickers.get(symbol) ?? {};
    const open = prev.sessionOpen ?? price;
    const ticker = {
      ...prev,
      symbol,
      price,
      change24h: price - open,
      changePercent: open > 0 ? ((price - open) / open) * 100 : 0,
      high24h: Math.max(prev.high24h ?? price, price),
      low24h: Math.min(prev.low24h ?? price, price),
      volume: prev.volume ?? 0,
      sessionOpen: open,
    };
    this.tickers.set(symbol, ticker);
    this.io.to(symbol).emit('ticker:update', ticker);
  }

  /**
   * Quote — top of book only on the IEX feed, so this is a 1-level book
   * rather than true depth.
   */
  _handleQuote(msg) {
    const symbol = msg.S;
    if (!symbol) return;

    const bids = typeof msg.bp === 'number' && msg.bp > 0
      ? [{ price: msg.bp, size: msg.bs ?? 0, total: msg.bs ?? 0 }] : [];
    const asks = typeof msg.ap === 'number' && msg.ap > 0
      ? [{ price: msg.ap, size: msg.as ?? 0, total: msg.as ?? 0 }] : [];

    const spread = bids.length && asks.length ? asks[0].price - bids[0].price : 0;
    const mid = bids.length ? bids[0].price : 0;

    const book = {
      bids, asks, spread,
      spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
      /** Flagged so the UI can say "top of book" rather than imply depth */
      depthLimited: true,
    };
    this.orderBooks.set(symbol, book);
    this.io.to(symbol).emit('orderbook:snapshot', { symbol, ...book });
  }

  /** Streamed 1-minute bar. */
  _handleBar(msg) {
    const symbol = msg.S;
    if (!symbol) return;

    const candle = {
      time: Math.floor(new Date(msg.t).getTime() / 1000),
      open: msg.o, high: msg.h, low: msg.l, close: msg.c,
      volume: msg.v ?? 0,
      closed: true,
    };

    const bars = this.klines.get(symbol) ?? [];
    const last = bars[bars.length - 1];
    if (last && last.time === candle.time) bars[bars.length - 1] = candle;
    else {
      bars.push(candle);
      if (bars.length > MAX_KLINE_BARS) bars.shift();
    }
    this.klines.set(symbol, bars);
    this.io.to(symbol).emit('kline:update', { symbol, candle });
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  _sendSubscribe(symbols) {
    if (!this.authed || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      action: 'subscribe',
      trades: symbols,
      quotes: symbols,
      bars: symbols,
    }));
  }

  subscribe(symbol) {
    // Alpaca equities use plain tickers; skip pair-style crypto symbols, which
    // live on a different Alpaca stream we do not open here.
    if (symbol.includes('/')) return;
    if (this.subscribedSymbols.has(symbol)) return;
    this.subscribedSymbols.add(symbol);
    this._sendSubscribe([symbol]);
    void this._loadInitialState(symbol);
  }

  unsubscribe(symbol) {
    const room = this.io.sockets.adapter.rooms.get(symbol);
    if (room && room.size > 0) return;
    this.subscribedSymbols.delete(symbol);
    if (this.authed && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe', trades: [symbol], quotes: [symbol], bars: [symbol],
      }));
    }
  }

  // ── REST seeding ───────────────────────────────────────────────────────────

  /** Daily stats + bar history so the chart renders before the first tick. */
  async _loadInitialState(symbol) {
    await Promise.allSettled([
      this._loadSnapshot(symbol),
      this._loadBars(symbol),
    ]);
  }

  async _loadSnapshot(symbol) {
    try {
      const res = await fetch(
        `${DATA_REST}/v2/stocks/snapshots?symbols=${encodeURIComponent(symbol)}`,
        { headers: this._authHeaders },
      );
      if (!res.ok) return;
      const json = await res.json();
      const snap = json?.[symbol] ?? json?.snapshots?.[symbol];
      if (!snap) return;

      const daily = snap.dailyBar ?? {};
      const last = snap.latestTrade?.p ?? daily.c ?? 0;
      const open = daily.o ?? last;

      const ticker = {
        symbol,
        price: last,
        change24h: last - open,
        changePercent: open > 0 ? ((last - open) / open) * 100 : 0,
        high24h: daily.h ?? last,
        low24h: daily.l ?? last,
        volume: daily.v ?? 0,
        sessionOpen: open,
      };
      this.tickers.set(symbol, ticker);
      this.io.to(symbol).emit('ticker:update', ticker);
    } catch (err) {
      console.error(`[Alpaca] snapshot for ${symbol} failed:`, err.message);
    }
  }

  async _loadBars(symbol) {
    try {
      const url = `${DATA_REST}/v2/stocks/bars?symbols=${encodeURIComponent(symbol)}` +
                  `&timeframe=1Min&limit=${HISTORY_BARS}`;
      const res = await fetch(url, { headers: this._authHeaders });
      if (!res.ok) return;
      const json = await res.json();
      const raw = json?.bars?.[symbol] ?? [];

      const bars = raw.map(b => ({
        time: Math.floor(new Date(b.t).getTime() / 1000),
        open: b.o, high: b.h, low: b.l, close: b.c,
        volume: b.v ?? 0,
        closed: true,
      }));
      if (bars.length === 0) return;

      this.klines.set(symbol, bars);
      this.io.to(symbol).emit('kline:history', { symbol, klines: bars });
    } catch (err) {
      console.error(`[Alpaca] bars for ${symbol} failed:`, err.message);
    }
  }

  // ── Public API (mirrors the other bridges) ─────────────────────────────────

  getSnapshot(symbol) { return this.orderBooks.get(symbol) || null; }
  getTicker(symbol)   { return this.tickers.get(symbol)    || null; }
  getKlines(symbol)   { return this.klines.get(symbol)     || [];   }
}

module.exports = AlpacaBridge;
