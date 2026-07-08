/**
 * MarketStrip — index quote ticker in the navbar.
 * Currently mock-driven (no index feed); data comes from ./mockData only.
 */
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { MOCK_INDEX_QUOTES, jitterQuote, type IndexQuote } from './mockData';

export function MarketStrip() {
    const [quotes, setQuotes] = useState<IndexQuote[]>(MOCK_INDEX_QUOTES);

    useEffect(() => {
        const t = setInterval(() => setQuotes(prev => prev.map(jitterQuote)), 1500);
        return () => clearInterval(t);
    }, []);

    return (
        <div
            className="flex items-center gap-1 px-3 overflow-hidden"
            style={{
                borderRight: '1px solid var(--color-divider)',
                minWidth: 0,
                flex: '1 1 0',
            }}
        >
            {quotes.map(q => {
                const up = q.changePct >= 0;
                return (
                    <div
                        key={q.symbol}
                        className="flex items-baseline gap-1 px-2 shrink-0"
                        style={{ borderRight: '1px solid var(--color-divider-faint)' }}
                    >
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-steel)', letterSpacing: '0.05em' }}>
                            {q.symbol}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-text-bright)' }}>
                            {q.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span
                            style={{
                                fontSize: 10,
                                fontFamily: 'monospace',
                                color: up ? 'var(--color-green-alt)' : 'var(--color-red-alt)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {up ? '+' : ''}{q.changePct.toFixed(2)}%
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
