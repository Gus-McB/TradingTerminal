import { useTerminalSync } from '../hooks/useTerminalSync';
import { useTicker, useKlines } from '../services/marketData';
import { CandleChart } from '../components/market/CandleChart';
import type { WidgetComponentProps } from './registry';

export function ChartWidget({ widgetId: _w, workspaceId: _ws, config, className }: WidgetComponentProps) {
    // Single symbol owner (terminalStore) — no cross-store sync needed anymore
    const { symbol } = useTerminalSync({
        pinSymbol: config.pinSymbol as string | undefined,
        linkGroup: config.linkGroup as string | undefined,
    });
    const ticker = useTicker(symbol);
    const candles = useKlines(symbol);

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
