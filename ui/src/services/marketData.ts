/**
 * marketData — hot-path market data service.
 *
 * Market data lives OUTSIDE React state: socket events mutate plain maps, and
 * subscribers are notified at most once per animation frame. Widgets consume
 * per-symbol slices via useSyncExternalStore hooks (useTicker, useOrderBook,
 * useKlines), so a BTC tick never re-renders an ETH widget.
 *
 * Symbol subscriptions to the middleware are ref-counted: the first hook for a
 * symbol subscribes upstream, the last one to unmount unsubscribes.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { socketManager } from './socketManager';
import { mockTickers, generateOrderBook } from '../data/mockMarket';
import type {
    Ticker,
    OrderBook,
    Candle,
    OrderBookSnapshotPayload,
    OrderBookDeltaPayload,
    TickerPayload,
    KlineHistoryPayload,
    KlineUpdatePayload,
} from '@shared/types';

export type { Candle };

export interface ConnectionState {
    connected: boolean;
    /** Measured engine→middleware feed latency in ms (from message envelopes) */
    feedLatencyMs: number;
}

const TICKER_NAMES: Record<string, string> = {
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'SOL/USD': 'Solana',
    'DOGE/USD': 'Dogecoin',
    'XRP/USD': 'Ripple',
};

/** Symbols the middleware streams by default; the watchlist needs all of them live. */
const DEFAULT_SYMBOLS = Object.keys(TICKER_NAMES);

const EMPTY_BOOK: OrderBook = { bids: [], asks: [], spread: 0, spreadPercent: 0 };
const EMPTY_CANDLES: Candle[] = [];
const MAX_KLINE_BARS = 500;

type Listener = () => void;

/** Cadence used while the window is hidden and rAF is paused by the browser. */
const HIDDEN_FLUSH_MS = 250;

/**
 * Batch to one commit per animation frame while the window is visible.
 *
 * When the window is minimised, occluded, or on a background virtual desktop
 * the browser stops firing requestAnimationFrame entirely. For a dashboard
 * that would only mean stale pixels, but this terminal drives price alerts off
 * the same publish step — so a hidden window must keep processing, just at a
 * slower cadence.
 */
const scheduleFrame: (cb: () => void) => void = (cb) => {
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden || typeof requestAnimationFrame === 'undefined') {
        setTimeout(cb, hidden ? HIDDEN_FLUSH_MS : 16);
        return;
    }
    requestAnimationFrame(cb);
};

class MarketDataService {
    // ── Internal (mutable, updated per socket event) ─────────────────────────
    private books = new Map<string, OrderBook>();
    private candles = new Map<string, Candle[]>();

    // ── Published (stable references, swapped once per frame) ────────────────
    private pubTickers = new Map<string, Ticker>(
        mockTickers.map(t => [t.symbol, t]));
    private pubBooks = new Map<string, OrderBook>();
    private pubCandles = new Map<string, Candle[]>();
    private pubTickerList: Ticker[] = [...mockTickers];
    private pubConnection: ConnectionState = { connected: false, feedLatencyMs: 0 };
    private mockBookCache = new Map<string, OrderBook>();

    // ── Subscribers & batching ────────────────────────────────────────────────
    private symbolListeners = new Map<string, Set<Listener>>();
    private globalListeners = new Set<Listener>();
    private refCounts = new Map<string, number>();
    private dirtySymbols = new Set<string>();
    private globalDirty = false;
    private flushScheduled = false;

    private latestFeedLatencyMs = 0;
    private initialized = false;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    init(): void {
        // Reconnect if a previous dispose tore the socket down (StrictMode
        // remounts); listeners live in socketManager's persistent registry
        // and are re-applied to any new socket, so register them only once.
        if (this.initialized) {
            socketManager.connect();
            return;
        }
        this.initialized = true;
        this.watchVisibility();

        socketManager.connect();

        socketManager.on('connect', () => {
            this.pubConnection = { ...this.pubConnection, connected: true };
            this.markGlobalDirty();
            for (const sym of DEFAULT_SYMBOLS) socketManager.subscribe(sym);
        });

        socketManager.on('disconnect', () => {
            this.pubConnection = { ...this.pubConnection, connected: false };
            this.markGlobalDirty();
        });

        socketManager.on('orderbook:snapshot', (data: OrderBookSnapshotPayload) => {
            this.books.set(data.symbol, {
                bids: data.bids, asks: data.asks,
                spread: data.spread, spreadPercent: data.spreadPercent,
            });
            this.markSymbolDirty(data.symbol);
        });

        socketManager.on('orderbook:update', (data: OrderBookDeltaPayload) => {
            this.applyDelta(data);
            this.markSymbolDirty(data.symbol);
        });

        socketManager.on('ticker:update', (data: TickerPayload) => {
            const existing = this.pubTickers.get(data.symbol);
            this.pubTickers.set(data.symbol, {
                symbol: data.symbol,
                name: existing?.name ?? TICKER_NAMES[data.symbol] ?? data.symbol,
                price: data.price,
                change24h: data.change24h,
                changePercent: data.changePercent,
                high24h: data.high24h,
                low24h: data.low24h,
                volume: data.volume,
            });
            if (typeof data.feedLatencyUs === 'number') {
                this.latestFeedLatencyMs = data.feedLatencyUs / 1000;
            }
            this.markSymbolDirty(data.symbol);
            this.markGlobalDirty();
        });

        socketManager.on('kline:history', (data: KlineHistoryPayload) => {
            this.candles.set(data.symbol, [...data.klines]);
            this.markSymbolDirty(data.symbol);
        });

        socketManager.on('kline:update', (data: KlineUpdatePayload) => {
            const bars = this.candles.get(data.symbol) ?? [];
            const last = bars[bars.length - 1];
            if (last && last.time === data.candle.time) {
                bars[bars.length - 1] = data.candle;
            } else {
                bars.push(data.candle);
                if (bars.length > MAX_KLINE_BARS) bars.shift();
            }
            this.candles.set(data.symbol, bars);
            this.markSymbolDirty(data.symbol);
        });
    }

    dispose(): void {
        // Tear down the socket only — listener registrations persist in
        // socketManager and re-apply if init() reconnects (StrictMode remount)
        socketManager.disconnect();
        this.pubConnection = { connected: false, feedLatencyMs: 0 };
        this.markGlobalDirty();
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    /** Listen to a symbol's data and hold an upstream subscription while mounted. */
    subscribeSymbol(symbol: string, listener: Listener): () => void {
        let set = this.symbolListeners.get(symbol);
        if (!set) {
            set = new Set();
            this.symbolListeners.set(symbol, set);
        }
        set.add(listener);
        this.acquire(symbol);

        return () => {
            set.delete(listener);
            if (set.size === 0) this.symbolListeners.delete(symbol);
            this.release(symbol);
        };
    }

    subscribeGlobal(listener: Listener): () => void {
        this.globalListeners.add(listener);
        return () => this.globalListeners.delete(listener);
    }

    private acquire(symbol: string): void {
        const count = (this.refCounts.get(symbol) ?? 0) + 1;
        this.refCounts.set(symbol, count);
        if (count === 1) socketManager.subscribe(symbol);
    }

    private release(symbol: string): void {
        const count = (this.refCounts.get(symbol) ?? 1) - 1;
        if (count <= 0) {
            this.refCounts.delete(symbol);
            // Keep default symbols flowing for the watchlist
            if (!DEFAULT_SYMBOLS.includes(symbol)) socketManager.unsubscribe(symbol);
        } else {
            this.refCounts.set(symbol, count);
        }
    }

    // ── Snapshots (stable between flushes) ────────────────────────────────────

    getTicker(symbol: string): Ticker | undefined {
        return this.pubTickers.get(symbol);
    }

    getOrderBook(symbol: string): OrderBook {
        const book = this.pubBooks.get(symbol);
        if (book) return book;
        // Offline fallback: deterministic mock book per symbol (cached so the
        // snapshot reference is stable across renders)
        const cached = this.mockBookCache.get(symbol);
        if (cached) return cached;
        const ticker = this.pubTickers.get(symbol);
        if (!ticker) return EMPTY_BOOK;
        const mock = generateOrderBook(ticker.price);
        this.mockBookCache.set(symbol, mock);
        return mock;
    }

    getKlines(symbol: string): Candle[] {
        return this.pubCandles.get(symbol) ?? EMPTY_CANDLES;
    }

    getTickerList(): Ticker[] {
        return this.pubTickerList;
    }

    getConnection(): ConnectionState {
        return this.pubConnection;
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private applyDelta(delta: OrderBookDeltaPayload): void {
        const book = this.books.get(delta.symbol);
        if (!book) return;

        const levels = delta.side === 'bid' ? book.bids : book.asks;

        if (delta.type === 'delete') {
            const idx = levels.findIndex(l => l.price === delta.price);
            if (idx !== -1) levels.splice(idx, 1);
        } else if (delta.type === 'modify') {
            const level = levels.find(l => l.price === delta.price);
            if (level) level.size = delta.size;
        } else {
            const newLevel = { price: delta.price, size: delta.size, total: 0 };
            const idx = delta.side === 'bid'
                ? levels.findIndex(l => l.price < delta.price)
                : levels.findIndex(l => l.price > delta.price);
            if (idx === -1) levels.push(newLevel);
            else levels.splice(idx, 0, newLevel);
            if (levels.length > 25) levels.length = 25;
        }

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

    private markSymbolDirty(symbol: string): void {
        this.dirtySymbols.add(symbol);
        this.scheduleFlush();
    }

    private markGlobalDirty(): void {
        this.globalDirty = true;
        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.flushScheduled) return;
        this.flushScheduled = true;
        scheduleFrame(() => this.flush());
    }

    /**
     * A frame requested while visible never fires if the window is hidden
     * before it runs, which would leave `flushScheduled` stuck true and drop
     * every later update. Re-arm on visibility changes.
     */
    private watchVisibility(): void {
        if (typeof document === 'undefined') return;
        document.addEventListener('visibilitychange', () => {
            if (this.flushScheduled) {
                this.flushScheduled = false;
                this.scheduleFlush();
            }
        });
    }

    /** Publish fresh snapshots for dirty symbols and notify — once per frame. */
    private flush(): void {
        this.flushScheduled = false;

        for (const symbol of this.dirtySymbols) {
            const book = this.books.get(symbol);
            if (book) {
                this.pubBooks.set(symbol, {
                    bids: book.bids.map(l => ({ ...l })),
                    asks: book.asks.map(l => ({ ...l })),
                    spread: book.spread,
                    spreadPercent: book.spreadPercent,
                });
                // Real depth supersedes the offline placeholder for good
                this.mockBookCache.delete(symbol);
            }
            const bars = this.candles.get(symbol);
            if (bars) this.pubCandles.set(symbol, [...bars]);

            const listeners = this.symbolListeners.get(symbol);
            if (listeners) for (const l of listeners) l();
        }
        this.dirtySymbols.clear();

        if (this.globalDirty) {
            this.globalDirty = false;
            this.pubTickerList = Array.from(this.pubTickers.values());
            const latencyMs = Math.round(this.latestFeedLatencyMs * 10) / 10;
            if (latencyMs !== this.pubConnection.feedLatencyMs) {
                this.pubConnection = { ...this.pubConnection, feedLatencyMs: latencyMs };
            }
            for (const l of this.globalListeners) l();
        }
    }
}

export const marketData = new MarketDataService();

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTicker(symbol: string): Ticker | undefined {
    const subscribe = useCallback(
        (cb: Listener) => marketData.subscribeSymbol(symbol, cb), [symbol]);
    return useSyncExternalStore(subscribe, () => marketData.getTicker(symbol));
}

export function useOrderBook(symbol: string): OrderBook {
    const subscribe = useCallback(
        (cb: Listener) => marketData.subscribeSymbol(symbol, cb), [symbol]);
    return useSyncExternalStore(subscribe, () => marketData.getOrderBook(symbol));
}

export function useKlines(symbol: string): Candle[] {
    const subscribe = useCallback(
        (cb: Listener) => marketData.subscribeSymbol(symbol, cb), [symbol]);
    return useSyncExternalStore(subscribe, () => marketData.getKlines(symbol));
}

export function useTickerList(): Ticker[] {
    const subscribe = useCallback(
        (cb: Listener) => marketData.subscribeGlobal(cb), []);
    return useSyncExternalStore(subscribe, () => marketData.getTickerList());
}

export function useConnection(): ConnectionState {
    const subscribe = useCallback(
        (cb: Listener) => marketData.subscribeGlobal(cb), []);
    return useSyncExternalStore(subscribe, () => marketData.getConnection());
}
