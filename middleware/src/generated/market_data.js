var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// middleware/src/generated/ts/market_data/market_data.ts
var market_data_exports = {};
__export(market_data_exports, {
  TradingTerminal: () => trading_terminal_exports
});
module.exports = __toCommonJS(market_data_exports);

// middleware/src/generated/ts/market_data/trading-terminal.ts
var trading_terminal_exports = {};
__export(trading_terminal_exports, {
  MarketEnvelope: () => MarketEnvelope,
  MarketMessage: () => MarketMessage,
  OrderBookDelta: () => OrderBookDelta,
  OrderBookLevel: () => OrderBookLevel,
  OrderBookSnapshot: () => OrderBookSnapshot,
  Side: () => Side,
  TickerUpdate: () => TickerUpdate,
  UpdateType: () => UpdateType
});

// middleware/src/generated/ts/market_data/trading-terminal/market-envelope.ts
var flatbuffers5 = __toESM(require("flatbuffers"));

// middleware/src/generated/ts/market_data/trading-terminal/order-book-delta.ts
var flatbuffers2 = __toESM(require("flatbuffers"));

// middleware/src/generated/ts/market_data/trading-terminal/order-book-level.ts
var flatbuffers = __toESM(require("flatbuffers"));
var OrderBookLevel = class _OrderBookLevel {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderBookLevel(bb, obj) {
    return (obj || new _OrderBookLevel()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderBookLevel(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderBookLevel()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  price() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  size() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  static startOrderBookLevel(builder) {
    builder.startObject(2);
  }
  static addPrice(builder, price) {
    builder.addFieldFloat64(0, price, 0);
  }
  static addSize(builder, size) {
    builder.addFieldFloat64(1, size, 0);
  }
  static endOrderBookLevel(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createOrderBookLevel(builder, price, size) {
    _OrderBookLevel.startOrderBookLevel(builder);
    _OrderBookLevel.addPrice(builder, price);
    _OrderBookLevel.addSize(builder, size);
    return _OrderBookLevel.endOrderBookLevel(builder);
  }
};

// middleware/src/generated/ts/market_data/trading-terminal/side.ts
var Side = /* @__PURE__ */ ((Side2) => {
  Side2[Side2["Bid"] = 0] = "Bid";
  Side2[Side2["Ask"] = 1] = "Ask";
  return Side2;
})(Side || {});

// middleware/src/generated/ts/market_data/trading-terminal/update-type.ts
var UpdateType = /* @__PURE__ */ ((UpdateType2) => {
  UpdateType2[UpdateType2["New"] = 0] = "New";
  UpdateType2[UpdateType2["Modify"] = 1] = "Modify";
  UpdateType2[UpdateType2["Delete"] = 2] = "Delete";
  return UpdateType2;
})(UpdateType || {});

// middleware/src/generated/ts/market_data/trading-terminal/order-book-delta.ts
var OrderBookDelta = class _OrderBookDelta {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderBookDelta(bb, obj) {
    return (obj || new _OrderBookDelta()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderBookDelta(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers2.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderBookDelta()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  symbol(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  side() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* Bid */;
  }
  updateType() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* New */;
  }
  level(obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? (obj || new OrderBookLevel()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
  }
  sequence() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  static startOrderBookDelta(builder) {
    builder.startObject(5);
  }
  static addSymbol(builder, symbolOffset) {
    builder.addFieldOffset(0, symbolOffset, 0);
  }
  static addSide(builder, side) {
    builder.addFieldInt8(1, side, 0 /* Bid */);
  }
  static addUpdateType(builder, updateType) {
    builder.addFieldInt8(2, updateType, 0 /* New */);
  }
  static addLevel(builder, levelOffset) {
    builder.addFieldOffset(3, levelOffset, 0);
  }
  static addSequence(builder, sequence) {
    builder.addFieldInt64(4, sequence, BigInt("0"));
  }
  static endOrderBookDelta(builder) {
    const offset = builder.endObject();
    return offset;
  }
};

// middleware/src/generated/ts/market_data/trading-terminal/order-book-snapshot.ts
var flatbuffers3 = __toESM(require("flatbuffers"));
var OrderBookSnapshot = class _OrderBookSnapshot {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderBookSnapshot(bb, obj) {
    return (obj || new _OrderBookSnapshot()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderBookSnapshot(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers3.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderBookSnapshot()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  symbol(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  bids(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new OrderBookLevel()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  bidsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  asks(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new OrderBookLevel()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  asksLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  sequence() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  static startOrderBookSnapshot(builder) {
    builder.startObject(4);
  }
  static addSymbol(builder, symbolOffset) {
    builder.addFieldOffset(0, symbolOffset, 0);
  }
  static addBids(builder, bidsOffset) {
    builder.addFieldOffset(1, bidsOffset, 0);
  }
  static createBidsVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startBidsVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addAsks(builder, asksOffset) {
    builder.addFieldOffset(2, asksOffset, 0);
  }
  static createAsksVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startAsksVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addSequence(builder, sequence) {
    builder.addFieldInt64(3, sequence, BigInt("0"));
  }
  static endOrderBookSnapshot(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createOrderBookSnapshot(builder, symbolOffset, bidsOffset, asksOffset, sequence) {
    _OrderBookSnapshot.startOrderBookSnapshot(builder);
    _OrderBookSnapshot.addSymbol(builder, symbolOffset);
    _OrderBookSnapshot.addBids(builder, bidsOffset);
    _OrderBookSnapshot.addAsks(builder, asksOffset);
    _OrderBookSnapshot.addSequence(builder, sequence);
    return _OrderBookSnapshot.endOrderBookSnapshot(builder);
  }
};

// middleware/src/generated/ts/market_data/trading-terminal/ticker-update.ts
var flatbuffers4 = __toESM(require("flatbuffers"));
var TickerUpdate = class _TickerUpdate {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsTickerUpdate(bb, obj) {
    return (obj || new _TickerUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsTickerUpdate(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers4.SIZE_PREFIX_LENGTH);
    return (obj || new _TickerUpdate()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  symbol(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  price() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  change24h() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  changePercent() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  high24h() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  low24h() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  volume() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  static startTickerUpdate(builder) {
    builder.startObject(7);
  }
  static addSymbol(builder, symbolOffset) {
    builder.addFieldOffset(0, symbolOffset, 0);
  }
  static addPrice(builder, price) {
    builder.addFieldFloat64(1, price, 0);
  }
  static addChange24h(builder, change24h) {
    builder.addFieldFloat64(2, change24h, 0);
  }
  static addChangePercent(builder, changePercent) {
    builder.addFieldFloat64(3, changePercent, 0);
  }
  static addHigh24h(builder, high24h) {
    builder.addFieldFloat64(4, high24h, 0);
  }
  static addLow24h(builder, low24h) {
    builder.addFieldFloat64(5, low24h, 0);
  }
  static addVolume(builder, volume) {
    builder.addFieldFloat64(6, volume, 0);
  }
  static endTickerUpdate(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createTickerUpdate(builder, symbolOffset, price, change24h, changePercent, high24h, low24h, volume) {
    _TickerUpdate.startTickerUpdate(builder);
    _TickerUpdate.addSymbol(builder, symbolOffset);
    _TickerUpdate.addPrice(builder, price);
    _TickerUpdate.addChange24h(builder, change24h);
    _TickerUpdate.addChangePercent(builder, changePercent);
    _TickerUpdate.addHigh24h(builder, high24h);
    _TickerUpdate.addLow24h(builder, low24h);
    _TickerUpdate.addVolume(builder, volume);
    return _TickerUpdate.endTickerUpdate(builder);
  }
};

// middleware/src/generated/ts/market_data/trading-terminal/market-message.ts
var MarketMessage = /* @__PURE__ */ ((MarketMessage2) => {
  MarketMessage2[MarketMessage2["NONE"] = 0] = "NONE";
  MarketMessage2[MarketMessage2["OrderBookSnapshot"] = 1] = "OrderBookSnapshot";
  MarketMessage2[MarketMessage2["OrderBookDelta"] = 2] = "OrderBookDelta";
  MarketMessage2[MarketMessage2["TickerUpdate"] = 3] = "TickerUpdate";
  return MarketMessage2;
})(MarketMessage || {});

// middleware/src/generated/ts/market_data/trading-terminal/market-envelope.ts
var MarketEnvelope = class _MarketEnvelope {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsMarketEnvelope(bb, obj) {
    return (obj || new _MarketEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsMarketEnvelope(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers5.SIZE_PREFIX_LENGTH);
    return (obj || new _MarketEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  timestampUs() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  messageType() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
  }
  message(obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  static startMarketEnvelope(builder) {
    builder.startObject(3);
  }
  static addTimestampUs(builder, timestampUs) {
    builder.addFieldInt64(0, timestampUs, BigInt("0"));
  }
  static addMessageType(builder, messageType) {
    builder.addFieldInt8(1, messageType, 0 /* NONE */);
  }
  static addMessage(builder, messageOffset) {
    builder.addFieldOffset(2, messageOffset, 0);
  }
  static endMarketEnvelope(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishMarketEnvelopeBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedMarketEnvelopeBuffer(builder, offset) {
    builder.finish(offset, void 0, true);
  }
  static createMarketEnvelope(builder, timestampUs, messageType, messageOffset) {
    _MarketEnvelope.startMarketEnvelope(builder);
    _MarketEnvelope.addTimestampUs(builder, timestampUs);
    _MarketEnvelope.addMessageType(builder, messageType);
    _MarketEnvelope.addMessage(builder, messageOffset);
    return _MarketEnvelope.endMarketEnvelope(builder);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TradingTerminal
});
