/**
 * ordersStore — live order blotter fed by the engine's paper matcher.
 *
 * Orders are submitted over Socket.IO (order:submit) and the middleware routes
 * them to the C++ engine via ZMQ. Every reply carries hop timestamps, so this
 * store records MEASURED latencies:
 *   rttMs        — full UI round trip (submit → first reply received in the UI)
 *   engineUs     — matching time inside the engine
 *   serverTotalUs— ui-submit → middleware-reply (server-side clock path)
 */
import { create } from 'zustand';
import { socketManager } from '../services/socketManager';
import type {
    OrderSide,
    OrderType,
    OrderStatus,
    OrderFill,
    OrderUpdatePayload,
    OrderLatencyBreakdown,
} from '@shared/types';

export type { OrderStatus, OrderFill };

/** Shared per-hop breakdown plus the UI-measured full round trip */
export type OrderLatency = Partial<OrderLatencyBreakdown> & { rttMs?: number };

export interface OrderRecord {
    clientOrderId: string;
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
    status: OrderStatus;
    filledQuantity: number;
    avgFillPrice: number;
    fills: OrderFill[];
    reason?: string;
    submittedAt: number;        // ms epoch
    latency: OrderLatency;
}

export interface SubmitOrderInput {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    limitPrice?: number;
}

interface OrdersState {
    orders: OrderRecord[];          // newest first, capped
    lastLatency: OrderLatency | null;
    init: () => void;
    submitOrder: (input: SubmitOrderInput) => string | null;
}

const MAX_ORDERS = 200;

function nowUs() {
    return (performance.timeOrigin + performance.now()) * 1000;
}

let initialized = false;

export const useOrdersStore = create<OrdersState>((set) => ({
    orders: [],
    lastLatency: null,

    init: () => {
        socketManager.connect();
        if (initialized) return;
        initialized = true;

        // Registered via socketManager so the handler survives socket recreation
        socketManager.on('order:update', (data: OrderUpdatePayload) => {
            set(state => {
                const orders = [...state.orders];
                const idx = orders.findIndex(o => o.clientOrderId === data.clientOrderId);
                if (idx === -1) return state;   // reply for an order from another session

                const existing = orders[idx];
                const isFirstReply = existing.status === 'PENDING';
                const latency: OrderLatency = {
                    ...existing.latency,
                    ...(data.latency ?? {}),
                    ...(isFirstReply
                        ? { rttMs: Math.round((Date.now() - existing.submittedAt) * 10) / 10 }
                        : {}),
                };

                orders[idx] = {
                    ...existing,
                    status: data.status,
                    filledQuantity: data.filledQuantity,
                    avgFillPrice: data.avgFillPrice,
                    fills: [...existing.fills, ...(data.fills ?? [])],
                    reason: data.reason,
                    latency,
                };

                return { orders, lastLatency: latency };
            });
        });
    },

    submitOrder: (input) => {
        const clientOrderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const record: OrderRecord = {
            clientOrderId,
            symbol: input.symbol,
            side: input.side,
            type: input.type,
            quantity: input.quantity,
            limitPrice: input.limitPrice,
            status: 'PENDING',
            filledQuantity: 0,
            avgFillPrice: 0,
            fills: [],
            submittedAt: Date.now(),
            latency: {},
        };

        const sent = socketManager.emit('order:submit', {
            clientOrderId,
            symbol: input.symbol,
            side: input.side,
            type: input.type,
            quantity: input.quantity,
            limitPrice: input.limitPrice,
            tsUiSubmitUs: nowUs(),
        });

        if (!sent) {
            record.status = 'REJECTED';
            record.reason = 'not connected to middleware';
        }

        set(state => ({
            orders: [record, ...state.orders].slice(0, MAX_ORDERS),
        }));

        return sent ? clientOrderId : null;
    },
}));
