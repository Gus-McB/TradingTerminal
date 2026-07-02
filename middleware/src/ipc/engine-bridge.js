/**
 * EngineBridge — subscribes to the C++ engine's ZMQ market data feed
 * (FlatBuffers over PUB/SUB) and fans out to Socket.IO clients.
 *
 * - Decoding uses flatc-generated accessors (src/generated/market_data.js,
 *   regenerate with `npm run gen:fbs`).
 * - Per-symbol sequence numbers are checked; on a gap (ZMQ PUB/SUB drops under
 *   backpressure by design) deltas are suppressed until the next snapshot.
 * - 1-minute klines are synthesized from ticker updates so charts work in
 *   engine mode (the engine has no kline stream yet).
 */

const zmq = require('zeromq');
const flatbuffers = require('flatbuffers');
const { performance } = require('node:perf_hooks');
const { TradingTerminal: fb } = require('../generated/market_data.js');

const MAX_KLINE_BARS = 500;

/** Microseconds since epoch (sub-ms precision, anchored to the system clock) */
const EPOCH_OFFSET_US = Date.now() * 1000 - performance.now() * 1000;
function nowUs() {
  return EPOCH_OFFSET_US + performance.now() * 1000;
}

class EngineBridge {
  constructor(io, endpoint = 'tcp://localhost:5555') {
    this.io = io;
    this.endpoint = endpoint;
    this.sock = null;
    this.subscribedSymbols = new Set();
    this.orderBooks = new Map();   // symbol -> { bids, asks, spread, spreadPercent }
    this.tickers = new Map();      // symbol -> ticker data
    this.klines = new Map();       // symbol -> Candle[]
    this.sequences = new Map();    // symbol -> last seen sequence
    this.desynced = new Set();     // symbols dropping deltas until next snapshot
    this.gapCount = 0;
    this.lastFeedLatencyUs = 0;    // engine -> middleware, from envelope timestamp
    this.running = false;
  }

  async connect() {
    this.sock = new zmq.Subscriber();
    this.sock.connect(this.endpoint);
    this.running = true;

    const defaultSymbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'DOGE/USD', 'XRP/USD'];
    for (const sym of defaultSymbols) {
      this.sock.subscribe(sym);
      this.subscribedSymbols.add(sym);
    }

    console.log(`[EngineBridge] Connected to ${this.endpoint}`);
    console.log(`[EngineBridge] Subscribed to: ${defaultSymbols.join(', ')}`);

    this._listen();
  }

  async _listen() {
    try {
      for await (const [topicBuf, msgBuf] of this.sock) {
        if (!this.running) break;
        this._processMessage(topicBuf.toString(), msgBuf);
      }
    } catch (err) {
      if (this.running) {
        console.error('[EngineBridge] ZMQ receive error:', err.message);
      }
    }
  }

  _processMessage(symbol, buffer) {
    try {
      const bb = new flatbuffers.ByteBuffer(new Uint8Array(buffer));
      const envelope = fb.MarketEnvelope.getRootAsMarketEnvelope(bb);
      const engineTsUs = Number(envelope.timestampUs());
      this.lastFeedLatencyUs = Math.max(0, nowUs() - engineTsUs);

      switch (envelope.messageType()) {
        case fb.MarketMessage.OrderBookSnapshot:
          this._handleSnapshot(symbol, envelope.message(new fb.OrderBookSnapshot()));
          break;
        case fb.MarketMessage.OrderBookDelta:
          this._handleDelta(symbol, envelope.message(new fb.OrderBookDelta()));
          break;
        case fb.MarketMessage.TickerUpdate:
          this._handleTicker(symbol, envelope.message(new fb.TickerUpdate()));
          break;
      }
    } catch (err) {
      console.error(`[EngineBridge] Error processing message for ${symbol}:`, err.message);
    }
  }

  /**
   * Sequence tracking. Snapshots re-anchor the stream; deltas must be
   * contiguous. Returns false when the message must be dropped.
   */
  _checkSequence(symbol, seq, isSnapshot) {
    const last = this.sequences.get(symbol);

    if (isSnapshot) {
      this.sequences.set(symbol, seq);
      if (this.desynced.delete(symbol)) {
        console.log(`[EngineBridge] ${symbol} re-synced at seq ${seq}`);
      }
      return true;
    }

    if (this.desynced.has(symbol)) return false;

    if (last !== undefined && seq !== last + 1) {
      this.gapCount++;
      this.desynced.add(symbol);
      console.warn(`[EngineBridge] Sequence gap on ${symbol}: expected ${last + 1}, got ${seq}. ` +
                   `Dropping deltas until next snapshot (gap #${this.gapCount}).`);
      return false;
    }

    this.sequences.set(symbol, seq);
    return true;
  }

  _handleSnapshot(symbol, snapshot) {
    if (!snapshot) return;
    if (!this._checkSequence(symbol, Number(snapshot.sequence()), true)) return;

    const readLevels = (count, getter) => {
      const levels = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
        const level = getter(i);
        if (!level) continue;
        total += level.size();
        levels.push({ price: level.price(), size: level.size(), total });
      }
      return levels;
    };

    const bids = readLevels(snapshot.bidsLength(), i => snapshot.bids(i));
    const asks = readLevels(snapshot.asksLength(), i => snapshot.asks(i));

    const spread = bids.length && asks.length ? asks[0].price - bids[0].price : 0;
    const mid = bids.length ? bids[0].price : 0;

    const bookData = {
      bids,
      asks,
      spread,
      spreadPercent: mid > 0 ? (spread / mid) * 100 : 0,
    };

    this.orderBooks.set(symbol, bookData);
    this.io.to(symbol).emit('orderbook:snapshot', { symbol, ...bookData });
  }

  _handleDelta(symbol, delta) {
    if (!delta) return;
    if (!this._checkSequence(symbol, Number(delta.sequence()), false)) return;

    const side = delta.side() === fb.Side.Bid ? 'bid' : 'ask';
    const updateType = ['new', 'modify', 'delete'][delta.updateType()] ?? 'new';
    const level = delta.level();
    const price = level ? level.price() : 0;
    const size = level ? level.size() : 0;

    this._applyDeltaToBook(symbol, side, updateType, price, size);

    this.io.to(symbol).emit('orderbook:update', {
      symbol,
      side,
      type: updateType,
      price,
      size,
    });
  }

  _applyDeltaToBook(symbol, side, type, price, size) {
    const book = this.orderBooks.get(symbol);
    if (!book) return;

    const levels = side === 'bid' ? book.bids : book.asks;

    if (type === 'delete') {
      const idx = levels.findIndex(l => l.price === price);
      if (idx !== -1) levels.splice(idx, 1);
    } else if (type === 'modify') {
      const level = levels.find(l => l.price === price);
      if (level) level.size = size;
    } else {
      const newLevel = { price, size, total: 0 };
      const idx = side === 'bid'
        ? levels.findIndex(l => l.price < price)   // bids: descending
        : levels.findIndex(l => l.price > price);  // asks: ascending
      if (idx === -1) levels.push(newLevel);
      else levels.splice(idx, 0, newLevel);
      if (levels.length > 25) levels.length = 25;
    }

    // Recompute running totals
    let total = 0;
    for (const level of levels) {
      total += level.size;
      level.total = total;
    }

    if (book.bids.length && book.asks.length) {
      book.spread = book.asks[0].price - book.bids[0].price;
      book.spreadPercent = book.bids[0].price > 0
        ? (book.spread / book.bids[0].price) * 100
        : 0;
    }
  }

  _handleTicker(symbol, tickerMsg) {
    if (!tickerMsg) return;

    const ticker = {
      symbol,
      price: tickerMsg.price(),
      change24h: tickerMsg.change24h(),
      changePercent: tickerMsg.changePercent(),
      high24h: tickerMsg.high24h(),
      low24h: tickerMsg.low24h(),
      volume: tickerMsg.volume(),
      // Measured engine -> middleware feed latency, surfaced for the UI
      feedLatencyUs: Math.round(this.lastFeedLatencyUs),
    };

    this.tickers.set(symbol, ticker);
    this.io.to(symbol).emit('ticker:update', ticker);

    this._updateKline(symbol, ticker.price);
  }

  /** Synthesize 1-minute OHLC bars from ticker prices. */
  _updateKline(symbol, price) {
    const barTime = Math.floor(Date.now() / 60000) * 60;
    const bars = this.klines.get(symbol) ?? [];
    const last = bars[bars.length - 1];

    let candle;
    if (last && last.time === barTime) {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      candle = last;
    } else {
      if (last) last.closed = true;
      candle = { time: barTime, open: price, high: price, low: price, close: price, volume: 0, closed: false };
      bars.push(candle);
      if (bars.length > MAX_KLINE_BARS) bars.shift();
      this.klines.set(symbol, bars);
    }

    this.io.to(symbol).emit('kline:update', { symbol, candle });
  }

  // ─── Public API (mirrors BinanceBridge) ────────────────────────────────────

  getSnapshot(symbol) { return this.orderBooks.get(symbol) || null; }
  getTicker(symbol)   { return this.tickers.get(symbol)    || null; }
  getKlines(symbol)   { return this.klines.get(symbol)     || [];   }

  subscribe(symbol) {
    if (!this.subscribedSymbols.has(symbol)) {
      this.sock.subscribe(symbol);
      this.subscribedSymbols.add(symbol);
      console.log(`[EngineBridge] Subscribed to ${symbol}`);
    }
  }

  unsubscribe(symbol) {
    const room = this.io.sockets.adapter.rooms.get(symbol);
    if (!room || room.size === 0) {
      this.sock.unsubscribe(symbol);
      this.subscribedSymbols.delete(symbol);
      this.sequences.delete(symbol);
      this.desynced.delete(symbol);
      console.log(`[EngineBridge] Unsubscribed from ${symbol}`);
    }
  }

  async disconnect() {
    this.running = false;
    if (this.sock) {
      this.sock.close();
      this.sock = null;
    }
  }
}

module.exports = EngineBridge;
