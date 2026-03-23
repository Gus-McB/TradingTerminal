import { create } from 'zustand';
import { socketManager } from '../services/socketManager';
import { type Ticker, type OrderBook, type OrderBookLevel, mockTickers, generateOrderBook } from '../data/mockMarket';

interface SnapshotPayload {
    symbol: string;
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: number;
    spreadPercent: number;
}

interface DeltaPayload {
    symbol: string;
    side: 'bid' | 'ask';
    type: 'new' | 'modify' | 'delete';
    price: number;
    size: number;
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

interface MarketState {
    tickers: Map<string, Ticker>;
    orderBooks: Map<string, OrderBook>;
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
            // Subscribe to selected symbol
            socketManager.subscribe(get().selectedSymbol);
        });

        socket.on('disconnect', () => {
            set({ connected: false });
        });

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

        socket.on('orderbook:update', (data: DeltaPayload) => {
            set(state => {
                const book = state.orderBooks.get(data.symbol);
                if (!book) return state;

                const newBook = applyDelta(book, data);
                const newBooks = new Map(state.orderBooks);
                newBooks.set(data.symbol, newBook);
                return { orderBooks: newBooks };
            });
        });

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
    },

    cleanupSocket: () => {
        socketManager.disconnect();
        set({ connected: false, useRealData: false });
    },
}));

function applyDelta(book: OrderBook, delta: DeltaPayload): OrderBook {
    const levels = delta.side === 'bid' ? [...book.bids] : [...book.asks];

    if (delta.type === 'delete') {
        const idx = levels.findIndex(l => l.price === delta.price);
        if (idx !== -1) levels.splice(idx, 1);
    } else if (delta.type === 'modify') {
        const idx = levels.findIndex(l => l.price === delta.price);
        if (idx !== -1) {
            levels[idx] = { ...levels[idx], size: delta.size };
        }
    } else {
        // New level — insert in sorted position
        const newLevel: OrderBookLevel = { price: delta.price, size: delta.size, total: 0 };
        if (delta.side === 'bid') {
            // Bids: descending
            const idx = levels.findIndex(l => l.price < delta.price);
            if (idx === -1) levels.push(newLevel);
            else levels.splice(idx, 0, newLevel);
        } else {
            // Asks: ascending
            const idx = levels.findIndex(l => l.price > delta.price);
            if (idx === -1) levels.push(newLevel);
            else levels.splice(idx, 0, newLevel);
        }
        // Trim to 25
        if (levels.length > 25) levels.length = 25;
    }

    // Recompute running totals
    let total = 0;
    for (const level of levels) {
        total += level.size;
        level.total = total;
    }

    const newBids = delta.side === 'bid' ? levels : [...book.bids];
    const newAsks = delta.side === 'ask' ? levels : [...book.asks];

    const spread = newBids.length && newAsks.length
        ? newAsks[0].price - newBids[0].price
        : 0;
    const midPrice = newBids.length ? newBids[0].price : 0;

    return {
        bids: newBids,
        asks: newAsks,
        spread,
        spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
    };
}

// ── Compatibility wrapper ────────────────────────────────────────────────────
// Preserves the exact API shape that existing components consume:
//   { tickers, selectedSymbol, setSelectedSymbol, selectedTicker, orderBook }

export function useMarketData() {
    const store = useMarketStore();

    const tickers = Array.from(store.tickers.values());
    const selectedTicker = store.tickers.get(store.selectedSymbol);
    const orderBook = store.orderBooks.get(store.selectedSymbol) ?? (
        // Fallback to generated mock book if no real data yet
        selectedTicker ? generateOrderBook(selectedTicker.price) : emptyBook
    );

    return {
        tickers,
        selectedSymbol: store.selectedSymbol,
        setSelectedSymbol: store.setSelectedSymbol,
        selectedTicker,
        orderBook,
    };
}

export { useMarketStore };
