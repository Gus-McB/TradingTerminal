import { create } from 'zustand';
import { socketManager } from '../services/socketManager';
import { type Ticker, type OrderBook, type OrderBookLevel, mockTickers, generateOrderBook } from '../data/mockMarket';

export interface Candle {
    time: number;   // Unix seconds (UTC), bar open time
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    closed?: boolean;
}

interface SnapshotPayload {
    symbol: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: number;
    spreadPercent: number;
}

interface TickerPayload {
    symbol: string;
    price: number;
    change24h: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volume: number;
}

interface KlineHistoryPayload {
    symbol: string;
    klines: Candle[];
}

interface KlineUpdatePayload {
    symbol: string;
    candle: Candle;
}

interface MarketState {
    tickers: Map<string, Ticker>;
    orderBooks: Map<string, OrderBook>;
    candles: Map<string, Candle[]>;
    selectedSymbol: string;
    connected: boolean;
    useRealData: boolean;

    setSelectedSymbol: (symbol: string) => void;
    initSocket: () => void;
    cleanupSocket: () => void;
}

const TICKER_NAMES: Record<string, string> = {
    'BTC/USD': 'Bitcoin',
    'ETH/USD': 'Ethereum',
    'SOL/USD': 'Solana',
    'DOGE/USD': 'Dogecoin',
    'XRP/USD': 'Ripple',
};

const emptyBook: OrderBook = {
    bids: [],
    asks: [],
    spread: 0,
    spreadPercent: 0,
};

const useMarketStore = create<MarketState>((set, get) => ({
    tickers: new Map(mockTickers.map(t => [t.symbol, t])),
    orderBooks: new Map(),
    candles: new Map(),
    selectedSymbol: 'BTC/USD',
    connected: false,
    useRealData: false,

    setSelectedSymbol: (symbol: string) => {
        const prev = get().selectedSymbol;
        if (prev === symbol) return;
        if (get().useRealData) {
            socketManager.unsubscribe(prev);
            socketManager.subscribe(symbol);
        }
        set({ selectedSymbol: symbol });
    },

    initSocket: () => {
        const socket = socketManager.connect();

        socket.on('connect', () => {
            set({ connected: true, useRealData: true });
            socketManager.subscribe(get().selectedSymbol);
        });

        socket.on('disconnect', () => {
            set({ connected: false });
        });

        // ── Order book ──────────────────────────────────────────────────
        socket.on('orderbook:snapshot', (data: SnapshotPayload) => {
            set(state => {
                const newBooks = new Map(state.orderBooks);
                newBooks.set(data.symbol, {
                    bids: data.bids,
                    asks: data.asks,
                    spread: data.spread,
                    spreadPercent: data.spreadPercent,
                });
                return { orderBooks: newBooks };
            });
        });

        // ── Ticker ──────────────────────────────────────────────────────
        socket.on('ticker:update', (data: TickerPayload) => {
            set(state => {
                const newTickers = new Map(state.tickers);
                const existing = newTickers.get(data.symbol);
                newTickers.set(data.symbol, {
                    symbol: data.symbol,
                    name: existing?.name ?? TICKER_NAMES[data.symbol] ?? data.symbol,
                    price: data.price,
                    change24h: data.change24h,
                    changePercent: data.changePercent,
                    high24h: data.high24h,
                    low24h: data.low24h,
                    volume: data.volume,
                });
                return { tickers: newTickers };
            });
        });

        // ── Kline history (sent once on subscribe) ───────────────────────
        socket.on('kline:history', (data: KlineHistoryPayload) => {
            set(state => {
                const newCandles = new Map(state.candles);
                newCandles.set(data.symbol, data.klines);
                return { candles: newCandles };
            });
        });

        // ── Live kline updates ───────────────────────────────────────────
        socket.on('kline:update', (data: KlineUpdatePayload) => {
            set(state => {
                const bars  = state.candles.get(data.symbol) ?? [];
                const last  = bars[bars.length - 1];
                let updated: Candle[];

                if (last && last.time === data.candle.time) {
                    // Replace the live (open) bar
                    updated = [...bars.slice(0, -1), data.candle];
                } else {
                    // New bar opened
                    const trimmed = bars.length >= 500 ? bars.slice(1) : bars;
                    updated = [...trimmed, data.candle];
                }

                const newCandles = new Map(state.candles);
                newCandles.set(data.symbol, updated);
                return { candles: newCandles };
            });
        });
    },

    cleanupSocket: () => {
        socketManager.disconnect();
        set({ connected: false, useRealData: false });
    },
}));

// ── Compatibility wrapper ─────────────────────────────────────────────────────

export function useMarketData() {
    const store = useMarketStore();

    const tickers       = Array.from(store.tickers.values());
    const selectedTicker = store.tickers.get(store.selectedSymbol);
    const orderBook     = store.orderBooks.get(store.selectedSymbol) ?? (
        selectedTicker ? generateOrderBook(selectedTicker.price) : emptyBook
    );
    const candles = store.candles.get(store.selectedSymbol) ?? [];

    return {
        tickers,
        selectedSymbol:   store.selectedSymbol,
        setSelectedSymbol: store.setSelectedSymbol,
        selectedTicker,
        orderBook,
        candles,
    };
}

export { useMarketStore };
