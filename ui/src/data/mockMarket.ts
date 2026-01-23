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
    total: number;
}

export interface OrderBook {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    spread: number;
    spreadPercent: number;
}

export const mockTickers: Ticker[] = [
    { symbol: 'BTC/USD', name: 'Bitcoin', price: 67543.21, change24h: 1523.45, changePercent: 2.31, high24h: 68100, low24h: 65800, volume: 28400000000 },
    { symbol: 'ETH/USD', name: 'Ethereum', price: 3421.87, change24h: -38.22, changePercent: -1.10, high24h: 3520, low24h: 3380, volume: 14200000000 },
    { symbol: 'SOL/USD', name: 'Solana', price: 187.43, change24h: 10.21, changePercent: 5.76, high24h: 192, low24h: 175, volume: 3100000000 },
    { symbol: 'DOGE/USD', name: 'Dogecoin', price: 0.0872, change24h: 0.0001, changePercent: 0.11, high24h: 0.091, low24h: 0.084, volume: 890000000 },
    { symbol: 'XRP/USD', name: 'Ripple', price: 2.34, change24h: -0.05, changePercent: -2.09, high24h: 2.45, low24h: 2.28, volume: 2100000000 },
  ];

export function generateOrderBook(midPrice: number): OrderBook {
    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 8; i++) {
        const bidPrice = midPrice - (i + 1) * (midPrice * 0.0001);
        const askPrice = midPrice + (i + 1) * (midPrice * 0.0001);
        const bidSize = Math.random() * 2 + 0.1;
        const askSize = Math.random() * 2 + 0.1;

        bidTotal += bidSize;
        askTotal += askSize;

        bids.push({ price: bidPrice, size: bidSize, total: bidTotal });
        asks.push({ price: askPrice, size: askPrice, total: askTotal });
    }
        
        const spread = asks[0].price - bids[0].price;

        return {
            bids,
            asks,
            spread,
            spreadPercent: (spread / midPrice) * 100,
    };
}

export function simulatePriceUpdate(ticker: Ticker): Ticker {
    const volatility = ticker.price * 0.0002;
    const change = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = ticker.price + change;

    return {
        ...ticker,
        price: newPrice,
        change24h: ticker.change24h + change,
        changePercent: ((ticker.change24h + change) / (newPrice - ticker.change24h - change)) * 100,
        high24h: Math.max(ticker.high24h, newPrice),
        low24h: Math.min(ticker.low24h, newPrice),
    }
}