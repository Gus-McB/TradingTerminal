/**
 * algoRuntime — runs user trading algorithms in a Web Worker.
 *
 * Isolation: user code executes in its own worker thread with no access to
 * app internals — it sees only the algo API (onTick / submitOrder / log).
 * Orders are validated and rate-limited on the main thread before being
 * proxied to ordersStore, so a runaway algorithm cannot flood the engine.
 *
 * The tick feed is the same per-symbol subscription API widgets use
 * (services/marketData) — the Widget SDK and the algo API are one contract.
 */
import { marketData } from './marketData';
import { useOrdersStore } from '../stores/ordersStore';
import type { Ticker } from '@shared/types';

export interface AlgoLogEntry {
    time: number;                      // ms epoch
    level: 'info' | 'warn' | 'error';
    message: string;
}

export type AlgoStatus = 'running' | 'stopped' | 'error';

export interface AlgoCallbacks {
    onLog: (entry: AlgoLogEntry) => void;
    onStatus: (status: AlgoStatus) => void;
}

export interface AlgoHandle {
    stop: () => void;
}

/** Safety rail: max orders an algorithm may submit per rolling minute */
const MAX_ORDERS_PER_MINUTE = 12;

/** Worker harness — user code is embedded as a JSON string and run inside. */
function buildWorkerSource(userCode: string): string {
    return `
'use strict';
let tickHandler = null;

const onTick = (fn) => { tickHandler = fn; };
const submitOrder = (order) => { postMessage({ type: 'order', order }); };
const log = (...args) => {
    postMessage({ type: 'log', message: args.map(a =>
        typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
};

self.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === 'tick' && tickHandler) {
        try {
            tickHandler(msg.symbol, msg.ticker);
        } catch (err) {
            postMessage({ type: 'error', message: 'onTick threw: ' + String(err) });
        }
    }
};

try {
    const run = new Function('onTick', 'submitOrder', 'log', ${JSON.stringify(userCode)});
    run(onTick, submitOrder, log);
    postMessage({ type: 'ready' });
} catch (err) {
    postMessage({ type: 'error', message: String(err) });
}
`;
}

interface WorkerOrderMessage {
    symbol?: unknown;
    side?: unknown;
    type?: unknown;
    quantity?: unknown;
    limitPrice?: unknown;
}

function validateAlgoOrder(o: WorkerOrderMessage): string | null {
    if (typeof o.symbol !== 'string' || !o.symbol) return 'order.symbol must be a string';
    if (o.side !== 'BUY' && o.side !== 'SELL') return 'order.side must be BUY or SELL';
    if (o.type !== 'MARKET' && o.type !== 'LIMIT') return 'order.type must be MARKET or LIMIT';
    if (typeof o.quantity !== 'number' || !Number.isFinite(o.quantity) || o.quantity <= 0) {
        return 'order.quantity must be a positive number';
    }
    if (o.type === 'LIMIT' && (typeof o.limitPrice !== 'number' || !(o.limitPrice > 0))) {
        return 'order.limitPrice must be a positive number for LIMIT';
    }
    return null;
}

export function startAlgo(code: string, symbols: string[], cb: AlgoCallbacks): AlgoHandle {
    const log = (level: AlgoLogEntry['level'], message: string) =>
        cb.onLog({ time: Date.now(), level, message });

    const blob = new Blob([buildWorkerSource(code)], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    let stopped = false;
    const orderTimes: number[] = [];

    // Feed ticks from the shared per-symbol subscriptions (RAF-batched)
    const unsubs = symbols.map(symbol =>
        marketData.subscribeSymbol(symbol, () => {
            const ticker: Ticker | undefined = marketData.getTicker(symbol);
            if (ticker && !stopped) {
                worker.postMessage({ type: 'tick', symbol, ticker });
            }
        }));

    const stop = () => {
        if (stopped) return;
        stopped = true;
        unsubs.forEach(u => u());
        worker.terminate();
        URL.revokeObjectURL(url);
        cb.onStatus('stopped');
        log('info', 'algorithm stopped');
    };

    worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        switch (msg.type) {
            case 'ready':
                cb.onStatus('running');
                log('info', `algorithm started (${symbols.join(', ')})`);
                break;

            case 'log':
                log('info', String(msg.message));
                break;

            case 'error':
                log('error', String(msg.message));
                cb.onStatus('error');
                break;

            case 'order': {
                const err = validateAlgoOrder(msg.order ?? {});
                if (err) {
                    log('warn', `order rejected: ${err}`);
                    return;
                }
                const now = Date.now();
                while (orderTimes.length && now - orderTimes[0] > 60_000) orderTimes.shift();
                if (orderTimes.length >= MAX_ORDERS_PER_MINUTE) {
                    log('warn', `order rejected: rate limit (${MAX_ORDERS_PER_MINUTE}/min)`);
                    return;
                }
                orderTimes.push(now);

                const id = useOrdersStore.getState().submitOrder({
                    symbol: msg.order.symbol,
                    side: msg.order.side,
                    type: msg.order.type,
                    quantity: msg.order.quantity,
                    limitPrice: msg.order.limitPrice,
                });
                log(id ? 'info' : 'warn',
                    id ? `order submitted: ${msg.order.side} ${msg.order.quantity} ${msg.order.symbol}`
                       : 'order rejected: not connected to middleware');
                break;
            }
        }
    };

    worker.onerror = (e) => {
        log('error', `worker error: ${e.message}`);
        cb.onStatus('error');
    };

    return { stop };
}
