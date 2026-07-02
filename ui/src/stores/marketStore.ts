/**
 * marketStore — thin UI-state store on top of the marketData service.
 *
 * Hot market data (tickers, books, klines) lives in services/marketData.ts and
 * is consumed via per-symbol hooks (useTicker/useOrderBook/useKlines). This
 * store only holds cross-widget UI state: the globally selected symbol.
 */
import { create } from 'zustand';
import {
    marketData,
    useTicker,
    useOrderBook,
    useKlines,
    useTickerList,
    useConnection,
    type Candle,
} from '../services/marketData';

export type { Candle };

interface MarketState {
    selectedSymbol: string;
    setSelectedSymbol: (symbol: string) => void;
    initSocket: () => void;
    cleanupSocket: () => void;
}

const useMarketStore = create<MarketState>((set, get) => ({
    selectedSymbol: 'BTC/USD',

    // Per-symbol upstream subscriptions are ref-counted by the hooks; changing
    // selection must NOT tear down the previous symbol's feed (watchlists and
    // pinned widgets keep it alive).
    setSelectedSymbol: (symbol: string) => {
        if (get().selectedSymbol === symbol) return;
        set({ selectedSymbol: symbol });
    },

    initSocket: () => marketData.init(),
    cleanupSocket: () => marketData.dispose(),
}));

// ── Compatibility wrapper ─────────────────────────────────────────────────────
// Prefer the targeted hooks from services/marketData for new widgets; this
// wrapper subscribes to everything the old monolithic hook exposed.

export function useMarketData() {
    const selectedSymbol = useMarketStore(s => s.selectedSymbol);
    const setSelectedSymbol = useMarketStore(s => s.setSelectedSymbol);
    const tickers = useTickerList();
    const selectedTicker = useTicker(selectedSymbol);
    const orderBook = useOrderBook(selectedSymbol);
    const candles = useKlines(selectedSymbol);

    return {
        tickers,
        selectedSymbol,
        setSelectedSymbol,
        selectedTicker,
        orderBook,
        candles,
    };
}

export { useMarketStore, useConnection };
