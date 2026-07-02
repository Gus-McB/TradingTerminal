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

// middleware/src/generated/ts/orders/orders.ts
var orders_exports = {};
__export(orders_exports, {
  TradingTerminal: () => trading_terminal_exports
});
module.exports = __toCommonJS(orders_exports);

// middleware/src/generated/ts/orders/trading-terminal.ts
var trading_terminal_exports = {};
__export(trading_terminal_exports, {
  Fill: () => Fill,
  OrderEnvelope: () => OrderEnvelope,
  OrderMessage: () => OrderMessage,
  OrderReply: () => OrderReply,
  OrderRequest: () => OrderRequest,
  OrderSide: () => OrderSide,
  OrderStatus: () => OrderStatus,
  OrderType: () => OrderType
});

// middleware/src/generated/ts/orders/trading-terminal/fill.ts
var flatbuffers = __toESM(require("flatbuffers"));
var Fill = class _Fill {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsFill(bb, obj) {
    return (obj || new _Fill()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsFill(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new _Fill()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  price() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  quantity() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  static startFill(builder) {
    builder.startObject(2);
  }
  static addPrice(builder, price) {
    builder.addFieldFloat64(0, price, 0);
  }
  static addQuantity(builder, quantity) {
    builder.addFieldFloat64(1, quantity, 0);
  }
  static endFill(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createFill(builder, price, quantity) {
    _Fill.startFill(builder);
    _Fill.addPrice(builder, price);
    _Fill.addQuantity(builder, quantity);
    return _Fill.endFill(builder);
  }
};

// middleware/src/generated/ts/orders/trading-terminal/order-envelope.ts
var flatbuffers4 = __toESM(require("flatbuffers"));

// middleware/src/generated/ts/orders/trading-terminal/order-reply.ts
var flatbuffers2 = __toESM(require("flatbuffers"));

// middleware/src/generated/ts/orders/trading-terminal/order-status.ts
var OrderStatus = /* @__PURE__ */ ((OrderStatus2) => {
  OrderStatus2[OrderStatus2["Accepted"] = 0] = "Accepted";
  OrderStatus2[OrderStatus2["Filled"] = 1] = "Filled";
  OrderStatus2[OrderStatus2["PartiallyFilled"] = 2] = "PartiallyFilled";
  OrderStatus2[OrderStatus2["Resting"] = 3] = "Resting";
  OrderStatus2[OrderStatus2["Rejected"] = 4] = "Rejected";
  OrderStatus2[OrderStatus2["Canceled"] = 5] = "Canceled";
  return OrderStatus2;
})(OrderStatus || {});

// middleware/src/generated/ts/orders/trading-terminal/order-reply.ts
var OrderReply = class _OrderReply {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderReply(bb, obj) {
    return (obj || new _OrderReply()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderReply(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers2.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderReply()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  clientOrderId(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  symbol(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  status() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* Accepted */;
  }
  filledQuantity() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  avgFillPrice() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  fills(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? (obj || new Fill()).__init(this.bb.__indirect(this.bb.__vector(this.bb_pos + offset) + index * 4), this.bb) : null;
  }
  fillsLength() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  reason(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  tsUiSubmitUs() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsMwInUs() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsMwOutUs() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsEngineInUs() {
    const offset = this.bb.__offset(this.bb_pos, 24);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsEngineDoneUs() {
    const offset = this.bb.__offset(this.bb_pos, 26);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  static startOrderReply(builder) {
    builder.startObject(12);
  }
  static addClientOrderId(builder, clientOrderIdOffset) {
    builder.addFieldOffset(0, clientOrderIdOffset, 0);
  }
  static addSymbol(builder, symbolOffset) {
    builder.addFieldOffset(1, symbolOffset, 0);
  }
  static addStatus(builder, status) {
    builder.addFieldInt8(2, status, 0 /* Accepted */);
  }
  static addFilledQuantity(builder, filledQuantity) {
    builder.addFieldFloat64(3, filledQuantity, 0);
  }
  static addAvgFillPrice(builder, avgFillPrice) {
    builder.addFieldFloat64(4, avgFillPrice, 0);
  }
  static addFills(builder, fillsOffset) {
    builder.addFieldOffset(5, fillsOffset, 0);
  }
  static createFillsVector(builder, data) {
    builder.startVector(4, data.length, 4);
    for (let i = data.length - 1; i >= 0; i--) {
      builder.addOffset(data[i]);
    }
    return builder.endVector();
  }
  static startFillsVector(builder, numElems) {
    builder.startVector(4, numElems, 4);
  }
  static addReason(builder, reasonOffset) {
    builder.addFieldOffset(6, reasonOffset, 0);
  }
  static addTsUiSubmitUs(builder, tsUiSubmitUs) {
    builder.addFieldInt64(7, tsUiSubmitUs, BigInt("0"));
  }
  static addTsMwInUs(builder, tsMwInUs) {
    builder.addFieldInt64(8, tsMwInUs, BigInt("0"));
  }
  static addTsMwOutUs(builder, tsMwOutUs) {
    builder.addFieldInt64(9, tsMwOutUs, BigInt("0"));
  }
  static addTsEngineInUs(builder, tsEngineInUs) {
    builder.addFieldInt64(10, tsEngineInUs, BigInt("0"));
  }
  static addTsEngineDoneUs(builder, tsEngineDoneUs) {
    builder.addFieldInt64(11, tsEngineDoneUs, BigInt("0"));
  }
  static endOrderReply(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createOrderReply(builder, clientOrderIdOffset, symbolOffset, status, filledQuantity, avgFillPrice, fillsOffset, reasonOffset, tsUiSubmitUs, tsMwInUs, tsMwOutUs, tsEngineInUs, tsEngineDoneUs) {
    _OrderReply.startOrderReply(builder);
    _OrderReply.addClientOrderId(builder, clientOrderIdOffset);
    _OrderReply.addSymbol(builder, symbolOffset);
    _OrderReply.addStatus(builder, status);
    _OrderReply.addFilledQuantity(builder, filledQuantity);
    _OrderReply.addAvgFillPrice(builder, avgFillPrice);
    _OrderReply.addFills(builder, fillsOffset);
    _OrderReply.addReason(builder, reasonOffset);
    _OrderReply.addTsUiSubmitUs(builder, tsUiSubmitUs);
    _OrderReply.addTsMwInUs(builder, tsMwInUs);
    _OrderReply.addTsMwOutUs(builder, tsMwOutUs);
    _OrderReply.addTsEngineInUs(builder, tsEngineInUs);
    _OrderReply.addTsEngineDoneUs(builder, tsEngineDoneUs);
    return _OrderReply.endOrderReply(builder);
  }
};

// middleware/src/generated/ts/orders/trading-terminal/order-request.ts
var flatbuffers3 = __toESM(require("flatbuffers"));

// middleware/src/generated/ts/orders/trading-terminal/order-side.ts
var OrderSide = /* @__PURE__ */ ((OrderSide2) => {
  OrderSide2[OrderSide2["Buy"] = 0] = "Buy";
  OrderSide2[OrderSide2["Sell"] = 1] = "Sell";
  return OrderSide2;
})(OrderSide || {});

// middleware/src/generated/ts/orders/trading-terminal/order-type.ts
var OrderType = /* @__PURE__ */ ((OrderType2) => {
  OrderType2[OrderType2["Market"] = 0] = "Market";
  OrderType2[OrderType2["Limit"] = 1] = "Limit";
  return OrderType2;
})(OrderType || {});

// middleware/src/generated/ts/orders/trading-terminal/order-request.ts
var OrderRequest = class _OrderRequest {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderRequest(bb, obj) {
    return (obj || new _OrderRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderRequest(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers3.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderRequest()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  clientOrderId(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  symbol(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  side() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* Buy */;
  }
  type() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readInt8(this.bb_pos + offset) : 0 /* Market */;
  }
  quantity() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  limitPrice() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.readFloat64(this.bb_pos + offset) : 0;
  }
  tsUiSubmitUs() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsMwInUs() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  tsMwOutUs() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  static startOrderRequest(builder) {
    builder.startObject(9);
  }
  static addClientOrderId(builder, clientOrderIdOffset) {
    builder.addFieldOffset(0, clientOrderIdOffset, 0);
  }
  static addSymbol(builder, symbolOffset) {
    builder.addFieldOffset(1, symbolOffset, 0);
  }
  static addSide(builder, side) {
    builder.addFieldInt8(2, side, 0 /* Buy */);
  }
  static addType(builder, type) {
    builder.addFieldInt8(3, type, 0 /* Market */);
  }
  static addQuantity(builder, quantity) {
    builder.addFieldFloat64(4, quantity, 0);
  }
  static addLimitPrice(builder, limitPrice) {
    builder.addFieldFloat64(5, limitPrice, 0);
  }
  static addTsUiSubmitUs(builder, tsUiSubmitUs) {
    builder.addFieldInt64(6, tsUiSubmitUs, BigInt("0"));
  }
  static addTsMwInUs(builder, tsMwInUs) {
    builder.addFieldInt64(7, tsMwInUs, BigInt("0"));
  }
  static addTsMwOutUs(builder, tsMwOutUs) {
    builder.addFieldInt64(8, tsMwOutUs, BigInt("0"));
  }
  static endOrderRequest(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static createOrderRequest(builder, clientOrderIdOffset, symbolOffset, side, type, quantity, limitPrice, tsUiSubmitUs, tsMwInUs, tsMwOutUs) {
    _OrderRequest.startOrderRequest(builder);
    _OrderRequest.addClientOrderId(builder, clientOrderIdOffset);
    _OrderRequest.addSymbol(builder, symbolOffset);
    _OrderRequest.addSide(builder, side);
    _OrderRequest.addType(builder, type);
    _OrderRequest.addQuantity(builder, quantity);
    _OrderRequest.addLimitPrice(builder, limitPrice);
    _OrderRequest.addTsUiSubmitUs(builder, tsUiSubmitUs);
    _OrderRequest.addTsMwInUs(builder, tsMwInUs);
    _OrderRequest.addTsMwOutUs(builder, tsMwOutUs);
    return _OrderRequest.endOrderRequest(builder);
  }
};

// middleware/src/generated/ts/orders/trading-terminal/order-message.ts
var OrderMessage = /* @__PURE__ */ ((OrderMessage2) => {
  OrderMessage2[OrderMessage2["NONE"] = 0] = "NONE";
  OrderMessage2[OrderMessage2["OrderRequest"] = 1] = "OrderRequest";
  OrderMessage2[OrderMessage2["OrderReply"] = 2] = "OrderReply";
  return OrderMessage2;
})(OrderMessage || {});

// middleware/src/generated/ts/orders/trading-terminal/order-envelope.ts
var OrderEnvelope = class _OrderEnvelope {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsOrderEnvelope(bb, obj) {
    return (obj || new _OrderEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  static getSizePrefixedRootAsOrderEnvelope(bb, obj) {
    bb.setPosition(bb.position() + flatbuffers4.SIZE_PREFIX_LENGTH);
    return (obj || new _OrderEnvelope()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
  }
  messageType() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
  }
  message(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  static startOrderEnvelope(builder) {
    builder.startObject(2);
  }
  static addMessageType(builder, messageType) {
    builder.addFieldInt8(0, messageType, 0 /* NONE */);
  }
  static addMessage(builder, messageOffset) {
    builder.addFieldOffset(1, messageOffset, 0);
  }
  static endOrderEnvelope(builder) {
    const offset = builder.endObject();
    return offset;
  }
  static finishOrderEnvelopeBuffer(builder, offset) {
    builder.finish(offset);
  }
  static finishSizePrefixedOrderEnvelopeBuffer(builder, offset) {
    builder.finish(offset, void 0, true);
  }
  static createOrderEnvelope(builder, messageType, messageOffset) {
    _OrderEnvelope.startOrderEnvelope(builder);
    _OrderEnvelope.addMessageType(builder, messageType);
    _OrderEnvelope.addMessage(builder, messageOffset);
    return _OrderEnvelope.endOrderEnvelope(builder);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TradingTerminal
});
