/**
 * OrderBridge — forwards orders from Socket.IO clients to the engine's ZMQ
 * ROUTER order gateway (tcp://localhost:5556) as FlatBuffers OrderRequests,
 * and routes OrderReply messages back to the submitting client.
 *
 * Every hop is timestamped (µs since epoch) so order latency is measured:
 *   ts_ui_submit -> ts_mw_in -> ts_mw_out -> ts_engine_in -> ts_engine_done -> ts_mw_reply
 */

const zmq = require('zeromq');
const flatbuffers = require('flatbuffers');
const { performance } = require('node:perf_hooks');
const { TradingTerminal: fb } = require('../generated/orders.js');

const STATUS_NAMES = ['ACCEPTED', 'FILLED', 'PARTIALLY_FILLED', 'RESTING', 'REJECTED', 'CANCELED'];
const TERMINAL_STATUSES = new Set(['FILLED', 'REJECTED', 'CANCELED']);
const MAX_PENDING = 1000;

// Anchored to the system clock at startup: performance.timeOrigin drifts from
// wall time, which skews cross-process (JS <-> C++) hop comparisons.
const EPOCH_OFFSET_US = Date.now() * 1000 - performance.now() * 1000;
function nowUs() {
  return EPOCH_OFFSET_US + performance.now() * 1000;
}

/** Validate an inbound order payload; returns an error string or null. */
function validateOrder(p) {
  if (!p || typeof p !== 'object') return 'invalid payload';
  if (typeof p.clientOrderId !== 'string' || p.clientOrderId.length === 0 || p.clientOrderId.length > 64) {
    return 'clientOrderId must be a 1-64 char string';
  }
  if (typeof p.symbol !== 'string' || p.symbol.length === 0 || p.symbol.length > 32) {
    return 'symbol must be a 1-32 char string';
  }
  if (p.side !== 'BUY' && p.side !== 'SELL') return 'side must be BUY or SELL';
  if (p.type !== 'MARKET' && p.type !== 'LIMIT') return `unsupported order type: ${p.type}`;
  if (typeof p.quantity !== 'number' || !Number.isFinite(p.quantity) || p.quantity <= 0) {
    return 'quantity must be a positive number';
  }
  if (p.type === 'LIMIT' && (typeof p.limitPrice !== 'number' || !Number.isFinite(p.limitPrice) || p.limitPrice <= 0)) {
    return 'limitPrice must be a positive number for LIMIT orders';
  }
  return null;
}

class OrderBridge {
  constructor(io, endpoint = 'tcp://localhost:5556') {
    this.io = io;
    this.endpoint = endpoint;
    this.sock = null;
    this.running = false;
    this.pending = new Map();  // clientOrderId -> socket.id (kept until terminal status)
  }

  async connect() {
    this.sock = new zmq.Dealer();
    this.sock.connect(this.endpoint);
    this.running = true;
    console.log(`[OrderBridge] Connected to ${this.endpoint}`);
    this._listen();
  }

  /** Handle an order:submit from a Socket.IO client. */
  async submit(socket, payload) {
    const tsMwInUs = nowUs();

    const error = validateOrder(payload);
    if (error) {
      socket.emit('order:update', {
        clientOrderId: payload?.clientOrderId ?? '',
        symbol: payload?.symbol ?? '',
        status: 'REJECTED',
        filledQuantity: 0,
        avgFillPrice: 0,
        fills: [],
        reason: error,
        timestamps: { uiSubmitUs: payload?.tsUiSubmitUs ?? 0, mwInUs: tsMwInUs },
      });
      return;
    }

    // Track which socket gets the replies for this order
    if (this.pending.size >= MAX_PENDING) {
      const oldest = this.pending.keys().next().value;
      this.pending.delete(oldest);
    }
    this.pending.set(payload.clientOrderId, socket.id);

    const builder = new flatbuffers.Builder(256);
    const cidOffset = builder.createString(payload.clientOrderId);
    const symOffset = builder.createString(payload.symbol);

    const side = payload.side === 'BUY' ? fb.OrderSide.Buy : fb.OrderSide.Sell;
    const type = payload.type === 'MARKET' ? fb.OrderType.Market : fb.OrderType.Limit;

    fb.OrderRequest.startOrderRequest(builder);
    fb.OrderRequest.addClientOrderId(builder, cidOffset);
    fb.OrderRequest.addSymbol(builder, symOffset);
    fb.OrderRequest.addSide(builder, side);
    fb.OrderRequest.addType(builder, type);
    fb.OrderRequest.addQuantity(builder, payload.quantity);
    fb.OrderRequest.addLimitPrice(builder, payload.limitPrice ?? 0);
    fb.OrderRequest.addTsUiSubmitUs(builder, BigInt(Math.round(payload.tsUiSubmitUs ?? 0)));
    fb.OrderRequest.addTsMwInUs(builder, BigInt(Math.round(tsMwInUs)));
    fb.OrderRequest.addTsMwOutUs(builder, BigInt(Math.round(nowUs())));
    const reqOffset = fb.OrderRequest.endOrderRequest(builder);

    const envelope = fb.OrderEnvelope.createOrderEnvelope(
      builder, fb.OrderMessage.OrderRequest, reqOffset);
    builder.finish(envelope);

    try {
      await this.sock.send(builder.asUint8Array());
    } catch (err) {
      console.error('[OrderBridge] Send failed:', err.message);
      socket.emit('order:update', {
        clientOrderId: payload.clientOrderId,
        symbol: payload.symbol,
        status: 'REJECTED',
        filledQuantity: 0,
        avgFillPrice: 0,
        fills: [],
        reason: 'engine unavailable',
        timestamps: { uiSubmitUs: payload.tsUiSubmitUs ?? 0, mwInUs: tsMwInUs },
      });
      this.pending.delete(payload.clientOrderId);
    }
  }

  async _listen() {
    try {
      for await (const [msgBuf] of this.sock) {
        if (!this.running) break;
        this._handleReply(msgBuf);
      }
    } catch (err) {
      if (this.running) {
        console.error('[OrderBridge] ZMQ receive error:', err.message);
      }
    }
  }

  _handleReply(buffer) {
    const tsMwReplyUs = nowUs();

    let reply;
    try {
      const bb = new flatbuffers.ByteBuffer(new Uint8Array(buffer));
      const envelope = fb.OrderEnvelope.getRootAsOrderEnvelope(bb);
      if (envelope.messageType() !== fb.OrderMessage.OrderReply) return;
      reply = envelope.message(new fb.OrderReply());
    } catch (err) {
      console.error('[OrderBridge] Failed to decode reply:', err.message);
      return;
    }
    if (!reply) return;

    const fills = [];
    for (let i = 0; i < reply.fillsLength(); i++) {
      const f = reply.fills(i);
      if (f) fills.push({ price: f.price(), quantity: f.quantity() });
    }

    const ts = {
      uiSubmitUs: Number(reply.tsUiSubmitUs()),
      mwInUs: Number(reply.tsMwInUs()),
      mwOutUs: Number(reply.tsMwOutUs()),
      engineInUs: Number(reply.tsEngineInUs()),
      engineDoneUs: Number(reply.tsEngineDoneUs()),
      mwReplyUs: Math.round(tsMwReplyUs),
    };

    const status = STATUS_NAMES[reply.status()] ?? 'ACCEPTED';
    const clientOrderId = reply.clientOrderId() ?? '';

    const update = {
      clientOrderId,
      symbol: reply.symbol() ?? '',
      status,
      filledQuantity: reply.filledQuantity(),
      avgFillPrice: reply.avgFillPrice(),
      fills,
      reason: reply.reason() || undefined,
      timestamps: ts,
      // Measured per-hop latencies (µs). Cross-process hops carry ~1 ms clock
      // uncertainty; zmqRoundTripUs and engineUs are single-clock and exact.
      latency: {
        uiToMwUs: ts.mwInUs && ts.uiSubmitUs ? ts.mwInUs - ts.uiSubmitUs : null,
        mwToEngineUs: ts.engineInUs && ts.mwOutUs ? ts.engineInUs - ts.mwOutUs : null,
        engineUs: ts.engineDoneUs && ts.engineInUs ? ts.engineDoneUs - ts.engineInUs : null,
        engineToMwUs: ts.engineDoneUs ? ts.mwReplyUs - ts.engineDoneUs : null,
        zmqRoundTripUs: ts.mwOutUs ? ts.mwReplyUs - ts.mwOutUs : null,
        serverTotalUs: ts.uiSubmitUs ? ts.mwReplyUs - ts.uiSubmitUs : null,
      },
    };

    const socketId = this.pending.get(clientOrderId);
    if (TERMINAL_STATUSES.has(status)) this.pending.delete(clientOrderId);

    const target = socketId ? this.io.sockets.sockets.get(socketId) : null;
    if (target) {
      target.emit('order:update', update);
    } else {
      // Submitting client disconnected (or reply from a previous session) —
      // broadcast so any blotter view still sees the fill.
      this.io.emit('order:update', update);
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

module.exports = OrderBridge;
module.exports.validateOrder = validateOrder;
