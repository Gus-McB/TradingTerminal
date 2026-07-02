import { useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useMarketStore } from '../stores/marketStore';
import { useTicker, useKlines } from '../services/marketData';
import { CandleChart } from '../components/market/CandleChart';
import type { WidgetComponentProps } from './registry';

export function ChartWidget({ widgetId: _w, workspaceId: _ws, config, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({ pinSymbol: config.pinSymbol as string | undefined });
    const selectedSymbol = useMarketStore(s => s.selectedSymbol);
    const setSelectedSymbol = useMarketStore(s => s.setSelectedSymbol);
    const ticker = useTicker(symbol);
    const candles = useKlines(symbol);

    useEffect(() => {
        if (symbol && symbol !== selectedSymbol) setSelectedSymbol(symbol);
    }, [symbol, selectedSymbol, setSelectedSymbol]);

    return (
        <div className={className} style={{ height: '100%', overflow: 'hidden' }}>
            <CandleChart
                symbol={symbol}
                candles={candles}
                currentPrice={ticker?.price}
                chartType={config.chartType as 'candlestick' | 'line' | 'bar' | 'area' | undefined}
                indicators={config.indicators as string[] | undefined}
            />
        </div>
    );
}
