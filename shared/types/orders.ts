/**
 * Canonical order flow types shared by middleware and UI.
 *
 * The engine's wire format is defined in engine/schema/orders.fbs (generated
 * TS in shared/generated/orders). The string unions below are the JSON-level
 * representations the middleware maps the FlatBuffers enums to; keep them in
 * sync with the schema.
 */

export type OrderSide = 'BUY' | 'SELL';

/** STOP arrives with the risk engine (Phase 4) */
export type OrderType = 'MARKET' | 'LIMIT';

/** Mirrors TradingTerminal.OrderStatus in orders.fbs (plus UI-only PENDING) */
export type OrderStatus =
    | 'PENDING'            // UI-local: submitted, no reply yet
    | 'ACCEPTED'
    | 'FILLED'
    | 'PARTIALLY_FILLED'
    | 'RESTING'
    | 'REJECTED'
    | 'CANCELED';

export interface OrderFill {
    price: number;
    quantity: number;
}

/** order:submit (UI → middleware) */
export interface SubmitOrderPayload {
    clientOrderId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
    /** µs since epoch, stamped in the UI at submit time */
    tsUiSubmitUs: number;
}

/** Hop timestamps echoed through the full path (µs since epoch) */
export interface OrderHopTimestamps {
    uiSubmitUs: number;
    mwInUs: number;
    mwOutUs?: number;
    engineInUs?: number;
    engineDoneUs?: number;
    mwReplyUs?: number;
}

/**
 * Measured per-hop latencies (µs). Cross-process hops carry ~1 ms clock
 * anchor uncertainty; engineUs and zmqRoundTripUs are single-clock and exact.
 */
export interface OrderLatencyBreakdown {
    uiToMwUs: number | null;
    mwToEngineUs: number | null;
    engineUs: number | null;
    engineToMwUs: number | null;
    zmqRoundTripUs: number | null;
    serverTotalUs: number | null;
}

/** order:update (middleware → UI) */
export interface OrderUpdatePayload {
    clientOrderId: string;
    symbol: string;
    status: Exclude<OrderStatus, 'PENDING'>;
    /** Cumulative filled quantity */
    filledQuantity: number;
    /** Cumulative average fill price */
    avgFillPrice: number;
    /** Fills from this matching pass only */
    fills: OrderFill[];
    reason?: string;
    timestamps?: OrderHopTimestamps;
    latency?: OrderLatencyBreakdown;
}
