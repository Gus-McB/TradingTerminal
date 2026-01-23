import { useState, useEffect } from "react";
import { mockTickers, type Ticker, type OrderBook, generateOrderBook, simulatePriceUpdate } from "../data/mockMarket";

export function useMarketData() {
    const [tickers, setTickers] = useState<Ticker[]>(mockTickers);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
    const [orderBook, setOrderBook] = useState<OrderBook>(() =>
        generateOrderBook(mockTickers[0].price)
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setTickers(prev => prev.map(simulatePriceUpdate));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const selected = tickers.find(t => t.symbol === selectedSymbol);
        if (selected) {
            setOrderBook(generateOrderBook(selected.price));
        }
    }, [selectedSymbol, tickers]);

    const selectedTicker = tickers.find(t => t.symbol === selectedSymbol);

    return {
        tickers,
        selectedSymbol,
        setSelectedSymbol,
        selectedTicker,
        orderBook,
    };
}