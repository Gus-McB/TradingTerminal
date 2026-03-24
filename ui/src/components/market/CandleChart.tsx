import { useEffect, useRef } from 'react';
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    type IChartApi,
    type ISeriesApi,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
    LineStyle,
} from 'lightweight-charts';
import { type Candle } from '../../stores/marketStore';

interface CandleChartProps {
    symbol: string;
    candles: Candle[];
    currentPrice?: number;
}

const t = (n: number) => n as UTCTimestamp;

const UP_COLOR   = '#00ff6a';
const DOWN_COLOR = '#ff3366';
const BG_COLOR   = '#12121a';
const BORDER     = '#2a2a3a';
const TEXT_COLOR = '#6a6a7a';
const CYAN       = '#00f0ff';

export function CandleChart({ symbol, candles, currentPrice }: CandleChartProps) {
    const containerRef   = useRef<HTMLDivElement>(null);
    const chartRef       = useRef<IChartApi | null>(null);
    const candleRef      = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const volumeRef      = useRef<ISeriesApi<'Histogram'> | null>(null);

    // Create chart once on mount
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: BG_COLOR },
                textColor: TEXT_COLOR,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: BORDER, style: LineStyle.Dotted },
                horzLines: { color: BORDER, style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    color: CYAN,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1a1a2e',
                },
                horzLine: {
                    color: CYAN,
                    width: 1,
                    style: LineStyle.Dashed,
                    labelBackgroundColor: '#1a1a2e',
                },
            },
            rightPriceScale: {
                borderColor: BORDER,
                scaleMargins: { top: 0.08, bottom: 0.28 },
            },
            timeScale: {
                borderColor: BORDER,
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor:        UP_COLOR,
            downColor:      DOWN_COLOR,
            borderUpColor:  UP_COLOR,
            borderDownColor: DOWN_COLOR,
            wickUpColor:    UP_COLOR,
            wickDownColor:  DOWN_COLOR,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceScaleId: 'volume',
            priceFormat:  { type: 'volume', precision: 2, minMove: 0.01 },
        });

        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.82, bottom: 0 },
        });

        chartRef.current  = chart;
        candleRef.current = candleSeries;
        volumeRef.current = volumeSeries;

        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            chart.applyOptions({ width, height });
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current  = null;
            candleRef.current = null;
            volumeRef.current = null;
        };
    }, []);

    // Full redraw when history arrives or bar count changes
    const prevLengthRef = useRef(0);
    useEffect(() => {
        if (!candleRef.current || !volumeRef.current || candles.length === 0) return;

        const prevLen = prevLengthRef.current;
        prevLengthRef.current = candles.length;

        // Only do a full setData on initial load or when bar count changes
        // (single-bar updates are handled by the currentPrice effect below)
        if (prevLen === candles.length) return;

        const candleData = candles.map(c => ({
            time:  t(c.time),
            open:  c.open,
            high:  c.high,
            low:   c.low,
            close: c.close,
        }));

        const volumeData = candles.map(c => ({
            time:  t(c.time),
            value: c.volume,
            color: c.close >= c.open ? 'rgba(0,255,106,0.35)' : 'rgba(255,51,102,0.35)',
        }));

        candleRef.current.setData(candleData);
        volumeRef.current.setData(volumeData);
        chartRef.current?.timeScale().scrollToRealTime();
    }, [candles]); // eslint-disable-line react-hooks/exhaustive-deps

    // Stream intra-bar tick updates to the last candle
    useEffect(() => {
        if (!candleRef.current || candles.length === 0 || currentPrice == null) return;
        const last = candles[candles.length - 1];
        candleRef.current.update({
            time:  t(last.time),
            open:  last.open,
            high:  Math.max(last.high, currentPrice),
            low:   Math.min(last.low,  currentPrice),
            close: currentPrice,
        });
    }, [currentPrice]); // eslint-disable-line react-hooks/exhaustive-deps

    const last    = candles[candles.length - 1];
    const isEmpty = candles.length === 0;
    const isUp    = last ? last.close >= last.open : true;
    const barColor = isUp ? 'text-[#00ff6a]' : 'text-[#ff3366]';

    return (
        <div className="relative w-full h-full flex flex-col bg-[#12121a]">
            {/* IBKR-style header bar */}
            <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#2a2a3a] bg-[#0e0e18] shrink-0">
                <span className="font-mono text-xs text-[#00f0ff] font-semibold tracking-widest">{symbol}</span>
                <span className="font-mono text-[10px] text-[#6a6a7a] border border-[#2a2a3a] px-1 rounded">1m</span>
                {last && (
                    <div className={`flex items-center gap-3 font-mono text-[11px] ${barColor}`}>
                        <span>O&nbsp;{last.open.toFixed(2)}</span>
                        <span>H&nbsp;{last.high.toFixed(2)}</span>
                        <span>L&nbsp;{last.low.toFixed(2)}</span>
                        <span>C&nbsp;{last.close.toFixed(2)}</span>
                    </div>
                )}
                {currentPrice != null && (
                    <span className={`ml-auto font-mono text-xs font-bold ${isUp ? 'text-[#00ff6a]' : 'text-[#ff3366]'}`}>
                        {currentPrice.toFixed(2)}
                    </span>
                )}
            </div>

            {/* Chart */}
            <div ref={containerRef} className="flex-1 w-full" />

            {/* Empty state */}
            {isEmpty && (
                <div className="absolute inset-0 top-8 flex items-center justify-center pointer-events-none">
                    <span className="font-mono text-xs text-[#6a6a7a] tracking-widest">
                        [ WAITING FOR MARKET DATA ]
                    </span>
                </div>
            )}
        </div>
    );
}
