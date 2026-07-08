/**
 * ⚠ MOCK DATA — quarantined here so it is trivial to delete.
 *
 * Everything in this file is fake and exists only to fill navbar UI that has
 * no real data source yet. When a real source lands (index feed, brokerage
 * accounts), delete the corresponding export and wire the component to it.
 * Nothing else in the app may import from this file.
 */

export interface IndexQuote {
    symbol: string;
    price: number;
    change: number;
    changePct: number;
}

/** Fake index quotes — no index feed exists yet */
export const MOCK_INDEX_QUOTES: IndexQuote[] = [
    { symbol: 'SPX', price: 5287.34,  change:  14.22, changePct:  0.27 },
    { symbol: 'NDX', price: 18432.10, change:  61.45, changePct:  0.33 },
    { symbol: 'DJI', price: 39158.80, change: -42.11, changePct: -0.11 },
    { symbol: 'VIX', price: 14.72,    change:  -0.38, changePct: -2.52 },
];

/** Jitter a quote slightly for the live ticker illusion */
export function jitterQuote(q: IndexQuote): IndexQuote {
    const delta = (Math.random() - 0.49) * q.price * 0.0003;
    const price = +(q.price + delta).toFixed(2);
    const change = +(q.change + delta).toFixed(2);
    const changePct = +((change / (price - change)) * 100).toFixed(2);
    return { ...q, price, change, changePct };
}

/** Fake brokerage accounts — no brokerage integration yet */
export const MOCK_ACCOUNTS = [
    { id: 'live',  label: 'LIVE',  num: 'U1234567' },
    { id: 'paper', label: 'PAPER', num: 'U9999999' },
] as const;

/** Fake unread badges on module launchers */
export const MOCK_MODULE_BADGES: Record<string, number> = {
    watchlist: 2,
    orders: 1,
    news: 5,
};
