const zmq = require('zeromq');
const flatbuffers = require('flatbuffers');

// FlatBuffers generated imports will be added once flatc generates the JS code.
// For now we use manual binary decoding that matches the schema structure.
// When generated code is available, replace the decode functions below.

const MSG_TYPE = {
  OrderBookSnapshot: 1,
  OrderBookDelta: 2,
  TickerUpdate: 3,
};

class EngineBridge {
  constructor(io, endpoint = 'tcp://localhost:5555') {
    this.io = io;
    this.endpoint = endpoint;
    this.sock = null;
    this.subscribedSymbols = new Set();
    this.orderBooks = new Map();    // symbol -> { bids, asks, spread, spreadPercent }
    this.tickers = new Map();       // symbol -> ticker data
    this.running = false;
  }

  async connect() {
    this.sock = new zmq.Subscriber();
    this.sock.connect(this.endpoint);
    this.running = true;

    // Subscribe to all default symbols
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

        const symbol = topicBuf.toString();
        this._processMessage(symbol, msgBuf);
      }
    } catch (err) {
      if (this.running) {
        console.error('[EngineBridge] ZMQ receive error:', err.message);
      }
    }
  }

  _processMessage(symbol, buffer) {
    try {
      const buf = new flatbuffers.ByteBuffer(new Uint8Array(buffer));

      // Read MarketEnvelope
      // The FlatBuffer root table starts at the offset stored at position 0
      const rootOffset = buf.readInt32(buf.position()) + buf.position();

      // Read timestamp_us (field 0, voffset 4)
      // Read message_type (field 1, voffset 6) - union type byte
      // Read message (field 2, voffset 8) - union offset

      const vtableOffset = rootOffset - buf.readInt32(rootOffset);
      const vtableSize = buf.readInt16(vtableOffset);

      // Get message type (union discriminator)
      let messageType = 0;
      if (vtableSize > 6) {
        const typeFieldOffset = buf.readInt16(vtableOffset + 6);
        if (typeFieldOffset !== 0) {
          messageType = buf.readUint8(rootOffset + typeFieldOffset);
        }
      }

      // Get message table offset
      let messageTableOffset = 0;
      if (vtableSize > 8) {
        const msgFieldOffset = buf.readInt16(vtableOffset + 8);
        if (msgFieldOffset !== 0) {
          messageTableOffset = rootOffset + msgFieldOffset;
          messageTableOffset = buf.readInt32(messageTableOffset) + (rootOffset + msgFieldOffset);
        }
      }

      if (messageTableOffset === 0) return;

      switch (messageType) {
        case MSG_TYPE.OrderBookSnapshot:
          this._handleSnapshot(symbol, buf, messageTableOffset);
          break;
        case MSG_TYPE.OrderBookDelta:
          this._handleDelta(symbol, buf, messageTableOffset);
          break;
        case MSG_TYPE.TickerUpdate:
          this._handleTicker(symbol, buf, messageTableOffset);
          break;
      }
    } catch (err) {
      console.error(`[EngineBridge] Error processing message for ${symbol}:`, err.message);
    }
  }

  _readString(buf, tableOffset, fieldIndex) {
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + fieldIndex * 2;
    if (buf.readInt16(vtableOffset) <= voffset) return '';
    const fieldOff = buf.readInt16(vtableOffset + voffset);
    if (fieldOff === 0) return '';
    const strOffset = tableOffset + fieldOff;
    const strRef = strOffset + buf.readInt32(strOffset);
    const len = buf.readInt32(strRef);
    let str = '';
    for (let i = 0; i < len; i++) {
      str += String.fromCharCode(buf.readUint8(strRef + 4 + i));
    }
    return str;
  }

  _readDouble(buf, tableOffset, fieldIndex, defaultVal = 0) {
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + fieldIndex * 2;
    if (buf.readInt16(vtableOffset) <= voffset) return defaultVal;
    const fieldOff = buf.readInt16(vtableOffset + voffset);
    if (fieldOff === 0) return defaultVal;
    return buf.readFloat64(tableOffset + fieldOff);
  }

  _readUint64(buf, tableOffset, fieldIndex, defaultVal = 0) {
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + fieldIndex * 2;
    if (buf.readInt16(vtableOffset) <= voffset) return defaultVal;
    const fieldOff = buf.readInt16(vtableOffset + voffset);
    if (fieldOff === 0) return defaultVal;
    // Read as two 32-bit values (JS doesn't have native uint64)
    const low = buf.readUint32(tableOffset + fieldOff);
    const high = buf.readUint32(tableOffset + fieldOff + 4);
    return low + high * 0x100000000;
  }

  _readUint8(buf, tableOffset, fieldIndex, defaultVal = 0) {
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + fieldIndex * 2;
    if (buf.readInt16(vtableOffset) <= voffset) return defaultVal;
    const fieldOff = buf.readInt16(vtableOffset + voffset);
    if (fieldOff === 0) return defaultVal;
    return buf.readUint8(tableOffset + fieldOff);
  }

  _readVector(buf, tableOffset, fieldIndex) {
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + fieldIndex * 2;
    if (buf.readInt16(vtableOffset) <= voffset) return { offset: 0, length: 0 };
    const fieldOff = buf.readInt16(vtableOffset + voffset);
    if (fieldOff === 0) return { offset: 0, length: 0 };
    const vecOffset = tableOffset + fieldOff;
    const vecRef = vecOffset + buf.readInt32(vecOffset);
    const length = buf.readInt32(vecRef);
    return { offset: vecRef + 4, length };
  }

  _readOrderBookLevel(buf, tableOffset) {
    return {
      price: this._readDouble(buf, tableOffset, 0),
      size: this._readDouble(buf, tableOffset, 1),
    };
  }

  _handleSnapshot(symbol, buf, tableOffset) {
    // OrderBookSnapshot: symbol(0), bids(1), asks(2), sequence(3)
    const bidsVec = this._readVector(buf, tableOffset, 1);
    const asksVec = this._readVector(buf, tableOffset, 2);

    const bids = [];
    const asks = [];
    let bidTotal = 0;
    let askTotal = 0;

    // Read bid levels (vector of table offsets)
    for (let i = 0; i < bidsVec.length; i++) {
      const entryOffset = bidsVec.offset + i * 4;
      const levelTableOffset = entryOffset + buf.readInt32(entryOffset);
      const level = this._readOrderBookLevel(buf, levelTableOffset);
      bidTotal += level.size;
      bids.push({ price: level.price, size: level.size, total: bidTotal });
    }

    // Read ask levels
    for (let i = 0; i < asksVec.length; i++) {
      const entryOffset = asksVec.offset + i * 4;
      const levelTableOffset = entryOffset + buf.readInt32(entryOffset);
      const level = this._readOrderBookLevel(buf, levelTableOffset);
      askTotal += level.size;
      asks.push({ price: level.price, size: level.size, total: askTotal });
    }

    const spread = bids.length && asks.length ? asks[0].price - bids[0].price : 0;
    const midPrice = bids.length ? bids[0].price : 0;

    const bookData = {
      bids,
      asks,
      spread,
      spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
    };

    this.orderBooks.set(symbol, bookData);
    this.io.to(symbol).emit('orderbook:snapshot', { symbol, ...bookData });
  }

  _handleDelta(symbol, buf, tableOffset) {
    // OrderBookDelta: symbol(0), side(1), update_type(2), level(3), sequence(4)
    const side = this._readUint8(buf, tableOffset, 1) === 0 ? 'bid' : 'ask';
    const updateType = ['new', 'modify', 'delete'][this._readUint8(buf, tableOffset, 2)];

    // Read level (table reference at field 3)
    const vtableOffset = tableOffset - buf.readInt32(tableOffset);
    const voffset = 4 + 3 * 2; // field index 3
    let price = 0, size = 0;
    if (buf.readInt16(vtableOffset) > voffset) {
      const fieldOff = buf.readInt16(vtableOffset + voffset);
      if (fieldOff !== 0) {
        const levelRef = tableOffset + fieldOff;
        const levelTableOffset = levelRef + buf.readInt32(levelRef);
        const level = this._readOrderBookLevel(buf, levelTableOffset);
        price = level.price;
        size = level.size;
      }
    }

    // Apply delta to local book copy
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
      // New level - insert in sorted position
      const newLevel = { price, size, total: 0 };
      if (side === 'bid') {
        // Bids: descending by price
        const idx = levels.findIndex(l => l.price < price);
        if (idx === -1) levels.push(newLevel);
        else levels.splice(idx, 0, newLevel);
        // Trim to 25
        if (levels.length > 25) levels.length = 25;
      } else {
        // Asks: ascending by price
        const idx = levels.findIndex(l => l.price > price);
        if (idx === -1) levels.push(newLevel);
        else levels.splice(idx, 0, newLevel);
        if (levels.length > 25) levels.length = 25;
      }
    }

    // Recompute running totals
    let total = 0;
    for (const level of levels) {
      total += level.size;
      level.total = total;
    }

    // Recompute spread
    if (book.bids.length && book.asks.length) {
      book.spread = book.asks[0].price - book.bids[0].price;
      book.spreadPercent = book.bids[0].price > 0
        ? (book.spread / book.bids[0].price) * 100
        : 0;
    }
  }

  _handleTicker(symbol, buf, tableOffset) {
    // TickerUpdate: symbol(0), price(1), change_24h(2), change_percent(3),
    //              high_24h(4), low_24h(5), volume(6)
    const ticker = {
      symbol,
      price: this._readDouble(buf, tableOffset, 1),
      change24h: this._readDouble(buf, tableOffset, 2),
      changePercent: this._readDouble(buf, tableOffset, 3),
      high24h: this._readDouble(buf, tableOffset, 4),
      low24h: this._readDouble(buf, tableOffset, 5),
      volume: this._readDouble(buf, tableOffset, 6),
    };

    this.tickers.set(symbol, ticker);
    this.io.to(symbol).emit('ticker:update', ticker);
  }

  getSnapshot(symbol) {
    return this.orderBooks.get(symbol) || null;
  }

  getTicker(symbol) {
    return this.tickers.get(symbol) || null;
  }

  subscribe(symbol) {
    if (!this.subscribedSymbols.has(symbol)) {
      this.sock.subscribe(symbol);
      this.subscribedSymbols.add(symbol);
      console.log(`[EngineBridge] Subscribed to ${symbol}`);
    }
  }

  unsubscribe(symbol) {
    // Only unsubscribe from ZMQ if no Socket.IO clients are in this room
    const room = this.io.sockets.adapter.rooms.get(symbol);
    if (!room || room.size === 0) {
      this.sock.unsubscribe(symbol);
      this.subscribedSymbols.delete(symbol);
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
