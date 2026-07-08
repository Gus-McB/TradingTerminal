import React from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useOrderBook } from '../services/marketData';
import type { WidgetComponentProps } from './registry';

export function MarketDepthWidget({ widgetId: _w, workspaceId: _ws, config, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({
        pinSymbol: config.pinSymbol as string | undefined,
        linkGroup: config.linkGroup as string | undefined,
    });
    // Per-symbol book — follows this widget's symbol (incl. pin), not the global selection
    const orderBook = useOrderBook(symbol);

    const levels = typeof config.levels === 'number' ? config.levels : 10;
    const bids = orderBook.bids.slice(0, levels);
    const asks = orderBook.asks.slice(0, levels);

    const maxTotal = Math.max(
        ...bids.map(b => b.total),
        ...asks.map(a => a.total),
        1,
    );

    const fmtPrice = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtSize  = (n: number) => n.toFixed(4);

    const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '2px 6px', position: 'relative', overflow: 'hidden' };
    const numCell = (color: string): React.CSSProperties => ({ fontFamily: 'monospace', fontSize: 11, color, textAlign: 'right', zIndex: 1, position: 'relative' });

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-cyan)', fontSize: 12 }}>{symbol}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Spread: <span style={{ color: 'var(--color-amber)' }}>{orderBook.spread.toFixed(2)} ({orderBook.spreadPercent.toFixed(3)}%)</span>
                </span>
            </div>

            {/* Col headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '2px 6px', borderBottom: '1px solid var(--color-border)' }}>
                {['Price','Size','Total'].map(h => (
                    <span key={h} style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'right', textTransform: 'uppercase' }}>{h}</span>
                ))}
            </div>

            {/* Asks (reversed so best ask is closest to spread) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {[...asks].reverse().map((a, i) => (
                    <div key={i} style={rowStyle}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(255,51,102,0.12)', width: `${(a.total / maxTotal) * 100}%` }} />
                        <span style={numCell('var(--color-red)')}>{fmtPrice(a.price)}</span>
                        <span style={numCell('var(--color-text)')}>{fmtSize(a.size)}</span>
                        <span style={numCell('var(--color-text-muted)')}>{fmtSize(a.total)}</span>
                    </div>
                ))}
            </div>

            {/* Spread divider */}
            <div style={{ textAlign: 'center', padding: '3px 0', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-amber)' }}>{orderBook.spread.toFixed(2)}</span>
            </div>

            {/* Bids */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {bids.map((b, i) => (
                    <div key={i} style={rowStyle}>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, background: 'rgba(0,255,106,0.12)', width: `${(b.total / maxTotal) * 100}%` }} />
                        <span style={numCell('var(--color-green)')}>{fmtPrice(b.price)}</span>
                        <span style={numCell('var(--color-text)')}>{fmtSize(b.size)}</span>
                        <span style={numCell('var(--color-text-muted)')}>{fmtSize(b.total)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
