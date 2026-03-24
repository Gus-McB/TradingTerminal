import { useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useMarketData } from '../stores/marketStore';
import { CandleChart } from '../components/market/CandleChart';
import type { WidgetComponentProps } from './registry';

export function ChartWidget({ widgetId: _widgetId, workspaceId: _workspaceId, config, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({
        pinSymbol: config.pinSymbol as string | undefined,
    });

    const { candles, selectedTicker, selectedSymbol, setSelectedSymbol } = useMarketData();

    // Keep market store in sync with terminal symbol
    useEffect(() => {
        if (symbol && symbol !== selectedSymbol) {
            setSelectedSymbol(symbol);
        }
    }, [symbol, selectedSymbol, setSelectedSymbol]);

    const currentPrice = selectedTicker?.price;

    return (
        <div
            className={className}
            style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            {/* Header bar */}
            <div
                style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '6px 10px', borderBottom: '1px solid #2a2a3a',
                    background: '#12121a',
                }}
            >
                <span style={{ fontFamily: 'monospace', color: '#00f0ff', fontWeight: 700, fontSize: 13 }}>
                    {symbol}
                </span>
                {selectedTicker && (
                    <>
                        <span style={{ fontFamily: 'monospace', color: '#e0e0e8', fontSize: 13 }}>
                            {selectedTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{
                            fontFamily: 'monospace', fontSize: 12,
                            color: selectedTicker.changePercent >= 0 ? '#00ff6a' : '#ff3366',
                        }}>
                            {selectedTicker.changePercent >= 0 ? '+' : ''}
                            {selectedTicker.changePercent.toFixed(2)}%
                        </span>
                        <span style={{ fontFamily: 'monospace', color: '#6a6a7a', fontSize: 11 }}>
                            H: {selectedTicker.high24h.toFixed(2)} &nbsp; L: {selectedTicker.low24h.toFixed(2)}
                        </span>
                    </>
                )}
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {candles.length > 0 ? (
                    <CandleChart symbol={symbol} candles={candles} currentPrice={currentPrice} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ color: '#6a6a7a', fontFamily: 'monospace', fontSize: 13 }}>
                            Loading chart data…
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
