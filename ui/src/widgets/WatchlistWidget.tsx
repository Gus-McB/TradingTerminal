import { useTerminalSync } from '../hooks/useTerminalSync';
import { useTickerList } from '../services/marketData';
import type { WidgetComponentProps } from './registry';

export function WatchlistWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    // In a link group, clicking a row retargets that channel only
    const { symbol: activeSymbol, setSymbol } = useTerminalSync({
        linkGroup: _c?.linkGroup as string | undefined,
    });
    const tickers = useTickerList();

    return (
        <div
            className={className}
            style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            {/* Column headers */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 70px',
                padding: '4px 10px', borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
            }}>
                {['Symbol', 'Price', 'Chg%'].map(h => (
                    <span key={h} style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                        {h}
                    </span>
                ))}
            </div>

            {/* Ticker rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {tickers.map(ticker => {
                    const isActive = ticker.symbol === activeSymbol;
                    const positive = ticker.changePercent >= 0;
                    return (
                        <div
                            key={ticker.symbol}
                            onClick={() => setSymbol(ticker.symbol)}
                            style={{
                                display: 'grid', gridTemplateColumns: '1fr 80px 70px',
                                padding: '7px 10px', cursor: 'pointer',
                                borderBottom: '1px solid var(--color-row)',
                                background: isActive ? 'var(--color-active)' : 'transparent',
                                borderLeft: isActive ? '2px solid var(--color-cyan)' : '2px solid transparent',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-hover)'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            <div>
                                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)', fontWeight: 600 }}>
                                    {ticker.symbol}
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>
                                    {ticker.name}
                                </div>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)', alignSelf: 'center' }}>
                                {ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{
                                fontFamily: 'monospace', fontSize: 12, alignSelf: 'center',
                                color: positive ? 'var(--color-green)' : 'var(--color-red)',
                            }}>
                                {positive ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
