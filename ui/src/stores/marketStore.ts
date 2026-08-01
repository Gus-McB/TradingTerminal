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
import { useTerminalStore } from './terminalStore';

export type { Candle };

interface MarketState {
    initSocket: () => void;
    cleanupSocket: () => void;
}

// The selected symbol lives in terminalStore (single owner). Per-symbol
// upstream subscriptions are ref-counted by the marketData hooks, so changing
// selection never tears down another widget's feed.
const useMarketStore = create<MarketState>(() => ({
    initSocket: () => marketData.init(),
    cleanupSocket: () => marketData.dispose(),
}));

// ── Compatibility wrapper ─────────────────────────────────────────────────────
// Prefer the targeted hooks from services/marketData for new widgets; this
// wrapper subscribes to everything the old monolithic hook exposed.

export function useMarketData() {
    const selectedSymbol = useTerminalStore(s => s.activeSymbol);
    const setSelectedSymbol = useTerminalStore(s => s.setSymbol);
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
