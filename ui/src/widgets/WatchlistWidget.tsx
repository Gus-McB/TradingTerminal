import { useTerminalSync } from '../hooks/useTerminalSync';
import { useMarketData } from '../stores/marketStore';
import type { WidgetComponentProps } from './registry';

export function WatchlistWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol: activeSymbol, setSymbol } = useTerminalSync();
    const { tickers } = useMarketData();

    return (
        <div
            className={className}
            style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
            {/* Column headers */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 70px',
                padding: '4px 10px', borderBottom: '1px solid #2a2a3a',
                background: '#12121a',
            }}>
                {['Symbol', 'Price', 'Chg%'].map(h => (
                    <span key={h} style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', textTransform: 'uppercase' }}>
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
                                borderBottom: '1px solid #1a1a26',
                                background: isActive ? '#1a1a30' : 'transparent',
                                borderLeft: isActive ? '2px solid #00f0ff' : '2px solid transparent',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#14141e'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                        >
                            <div>
                                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', fontWeight: 600 }}>
                                    {ticker.symbol}
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a' }}>
                                    {ticker.name}
                                </div>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', alignSelf: 'center' }}>
                                {ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span style={{
                                fontFamily: 'monospace', fontSize: 12, alignSelf: 'center',
                                color: positive ? '#00ff6a' : '#ff3366',
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
