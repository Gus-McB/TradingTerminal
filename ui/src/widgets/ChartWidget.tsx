import { useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useMarketData } from '../stores/marketStore';
import { CandleChart } from '../components/market/CandleChart';
import type { WidgetComponentProps } from './registry';

export function ChartWidget({ widgetId: _w, workspaceId: _ws, config, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({ pinSymbol: config.pinSymbol as string | undefined });
    const { candles, selectedTicker, selectedSymbol, setSelectedSymbol } = useMarketData();

    useEffect(() => {
        if (symbol && symbol !== selectedSymbol) setSelectedSymbol(symbol);
    }, [symbol, selectedSymbol, setSelectedSymbol]);

    return (
        <div className={className} style={{ height: '100%', overflow: 'hidden' }}>
            <CandleChart
                symbol={symbol}
                candles={candles}
                currentPrice={selectedTicker?.price}
                chartType={config.chartType as 'candlestick' | 'line' | 'bar' | 'area' | undefined}
                indicators={config.indicators as string[] | undefined}
            />
        </div>
    );
}
