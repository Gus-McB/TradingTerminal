/**
 * Canonical market data types shared by middleware and UI.
 *
 * The engine's wire format is defined in engine/schema/market_data.fbs
 * (generated TS in shared/generated/market_data). These interfaces describe
 * the JSON payloads the middleware emits over Socket.IO — the middleware is
 * the translation boundary between the two.
 */

export interface Ticker {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
}

export interface OrderBookLevel {
    price: number;
    size: number;
    /** Cumulative size from best level to this one (computed by middleware) */
    total: number;
}

export interface OrderBook {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: number;
    spreadPercent: number;
}

export interface Candle {
    /** Unix seconds (UTC), bar open time */
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    /** True once the bar is finalized */
    closed?: boolean;
}

// ─── Socket.IO payloads (middleware → UI) ─────────────────────────────────────

/** orderbook:snapshot */
export interface OrderBookSnapshotPayload extends OrderBook {
    symbol: string;
}

/** orderbook:update */
export interface OrderBookDeltaPayload {
    symbol: string;
    side: 'bid' | 'ask';
    type: 'new' | 'modify' | 'delete';
    price: number;
    size: number;
}

/** ticker:update */
export interface TickerPayload {
    symbol: string;
    price: number;
    change24h: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
    /** Measured engine→middleware feed latency (µs), engine mode only */
    feedLatencyUs?: number;
}

/** kline:history */
export interface KlineHistoryPayload {
    symbol: string;
    klines: Candle[];
}

/** kline:update */
export interface KlineUpdatePayload {
    symbol: string;
    candle: Candle;
}

// ─── Paper account (engine matcher → middleware → UI) ─────────────────────────

export interface PositionState {
    symbol: string;
    /** Signed; negative = short */
    quantity: number;
    avgPrice: number;
    realizedPnl: number;
}

/** account:update — cash & realized P&L are engine-authoritative;
 *  unrealized P&L is derived in the UI from live tickers. */
export interface AccountUpdatePayload {
    cash: number;
    realizedPnl: number;
    positions: PositionState[];
}
