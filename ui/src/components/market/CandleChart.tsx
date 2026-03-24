/**
 * CandleChart — lightweight-charts v5 chart with:
 *   • 4 chart types: Candlestick, Line, Bar, Area
 *   • Overlay indicators: EMA20, EMA50, SMA200, VWAP, Bollinger Bands
 *   • Sub-pane oscillators: RSI(14), MACD(12/26/9)
 *   • Volume histogram (always shown)
 *   • Compact toolbar for type + indicator toggles
 */
import { useEffect, useRef, useState } from 'react';
import {
    createChart,
    CandlestickSeries,
    LineSeries,
    BarSeries,
    AreaSeries,
    HistogramSeries,
    type IChartApi,
    type ISeriesApi,
    type IPaneApi,
    type UTCTimestamp,
    type Time,
    ColorType,
    CrosshairMode,
    LineStyle,
} from 'lightweight-charts';
import { type Candle } from '../../stores/marketStore';
import { calcEMA, calcSMA, calcVWAP, calcBB, calcRSI, calcMACD } from '../../utils/indicators';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChartType   = 'candlestick' | 'line' | 'bar' | 'area';
type IndicatorKey = 'EMA20' | 'EMA50' | 'SMA200' | 'VWAP' | 'BB' | 'RSI' | 'MACD';

interface CandleChartProps {
    symbol:      string;
    candles:     Candle[];
    currentPrice?: number;
    chartType?:  ChartType;
    indicators?: string[];
}

interface PaneEntry { pane: IPaneApi<Time>; series: ISeriesApi<'Line' | 'Histogram'>[]; }

// ─── Constants ────────────────────────────────────────────────────────────────

const t = (n: number) => n as UTCTimestamp;

const BG      = '#12121a';
const BORDER  = '#2a2a3a';
const TEXT    = '#6a6a7a';
const CYAN    = '#00f0ff';
const UP      = '#00ff6a';
const DOWN    = '#ff3366';

const IND_COLORS: Record<IndicatorKey, string> = {
    EMA20: '#00f0ff', EMA50: '#ff8c00', SMA200: '#9b59b6',
    VWAP: '#f1c40f', BB: '#3498db', RSI: '#8e44ad', MACD: '#e67e22',
};

// Helper: build time-value data from nullable indicator array
function toLineData(candles: Candle[], vals: (number | null)[]) {
    return candles
        .map((c, i) => (vals[i] != null ? { time: t(c.time), value: vals[i]! } : null))
        .filter(Boolean) as { time: UTCTimestamp; value: number }[];
}

// ─── Toolbar button ───────────────────────────────────────────────────────────

function Btn({ label, active, color, onClick }: {
    label: string; active: boolean; color?: string; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '1px 6px',
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 600,
                border: `1px solid ${active ? (color ?? CYAN) : BORDER}`,
                background: active ? `${color ?? CYAN}22` : 'transparent',
                color: active ? (color ?? CYAN) : TEXT,
                cursor: 'pointer',
                borderRadius: 2,
                letterSpacing: '0.04em',
                userSelect: 'none',
            }}
        >
            {label}
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CandleChart({ symbol, candles, currentPrice, chartType, indicators }: CandleChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef     = useRef<IChartApi | null>(null);

    // Main price series (type changes when localType changes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mainRef   = useRef<ISeriesApi<any> | null>(null);
    const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    // Overlay indicator series: key → array (BB has 3, others have 1)
    const overlaysRef = useRef<Map<IndicatorKey, ISeriesApi<'Line'>[]>>(new Map());
    // Sub-pane oscillator: key → { pane, series[] }
    const panesRef    = useRef<Map<IndicatorKey, PaneEntry>>(new Map());

    // Local toolbar state (initialized from props, overrideable by toolbar)
    const [localType, setLocalType] = useState<ChartType>(chartType ?? 'candlestick');
    const [activeInds, setActiveInds] = useState<Set<IndicatorKey>>(
        new Set((indicators ?? []) as IndicatorKey[])
    );

    // Sync from external props (config panel updates)
    useEffect(() => { setLocalType(chartType ?? 'candlestick'); }, [chartType]);
    useEffect(() => { setActiveInds(new Set((indicators ?? []) as IndicatorKey[])); }, [indicators]);

    // ── Chart mount ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: BG },
                textColor: TEXT,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: BORDER, style: LineStyle.Dotted },
                horzLines: { color: BORDER, style: LineStyle.Dotted },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: CYAN, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a1a2e' },
                horzLine: { color: CYAN, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a1a2e' },
            },
            rightPriceScale: { borderColor: BORDER, scaleMargins: { top: 0.08, bottom: 0.25 } },
            timeScale: { borderColor: BORDER, timeVisible: true, secondsVisible: false },
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: UP, downColor: DOWN,
            borderUpColor: UP, borderDownColor: DOWN,
            wickUpColor: UP, wickDownColor: DOWN,
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceScaleId: 'volume',
            priceFormat:  { type: 'volume', precision: 2, minMove: 0.01 },
        });
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

        chartRef.current  = chart;
        mainRef.current   = candleSeries;
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
            mainRef.current   = null;
            volumeRef.current = null;
            overlaysRef.current.clear();
            panesRef.current.clear();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Chart type switch ──────────────────────────────────────────────────────
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !mainRef.current) return;

        // Remove old main series
        chart.removeSeries(mainRef.current);
        mainRef.current = null;

        let newSeries;
        if (localType === 'line') {
            newSeries = chart.addSeries(LineSeries, {
                color: CYAN, lineWidth: 2,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        } else if (localType === 'bar') {
            newSeries = chart.addSeries(BarSeries, {
                upColor: UP, downColor: DOWN,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        } else if (localType === 'area') {
            newSeries = chart.addSeries(AreaSeries, {
                lineColor: CYAN, topColor: `${CYAN}44`, bottomColor: `${CYAN}06`,
                lineWidth: 2,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        } else {
            newSeries = chart.addSeries(CandlestickSeries, {
                upColor: UP, downColor: DOWN,
                borderUpColor: UP, borderDownColor: DOWN,
                wickUpColor: UP, wickDownColor: DOWN,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        }
        mainRef.current = newSeries;

        // Re-populate data immediately
        if (candles.length > 0) applyMainData(newSeries, localType, candles);
    }, [localType]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Candle data → main series + overlays ──────────────────────────────────
    const prevLenRef = useRef(0);
    useEffect(() => {
        if (!mainRef.current || !volumeRef.current || candles.length === 0) return;
        const prevLen = prevLenRef.current;
        prevLenRef.current = candles.length;
        if (prevLen === candles.length) return; // single-bar tick handled by next effect

        applyMainData(mainRef.current, localType, candles);

        volumeRef.current.setData(candles.map(c => ({
            time:  t(c.time),
            value: c.volume,
            color: c.close >= c.open ? 'rgba(0,255,106,0.35)' : 'rgba(255,51,102,0.35)',
        })));

        chartRef.current?.timeScale().scrollToRealTime();
        refreshOverlays(candles);
        refreshPanes(candles);
    }, [candles]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Tick update (intra-bar) ────────────────────────────────────────────────
    useEffect(() => {
        if (!mainRef.current || candles.length === 0 || currentPrice == null) return;
        const last = candles[candles.length - 1];
        if (localType === 'candlestick' || localType === 'bar') {
            mainRef.current.update({
                time: t(last.time), open: last.open,
                high: Math.max(last.high, currentPrice),
                low:  Math.min(last.low,  currentPrice),
                close: currentPrice,
            });
        } else {
            mainRef.current.update({ time: t(last.time), value: currentPrice });
        }
    }, [currentPrice]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Indicator toggle ──────────────────────────────────────────────────────
    const toggleIndicator = (key: IndicatorKey) => {
        const chart = chartRef.current;
        if (!chart) return;

        if (activeInds.has(key)) {
            // Remove overlay
            if (overlaysRef.current.has(key)) {
                overlaysRef.current.get(key)!.forEach(s => chart.removeSeries(s));
                overlaysRef.current.delete(key);
            }
            // Remove pane (auto-removed when all series deleted + preserveEmptyPane=false)
            if (panesRef.current.has(key)) {
                const { series } = panesRef.current.get(key)!;
                series.forEach(s => chart.removeSeries(s));
                panesRef.current.delete(key);
            }
            setActiveInds(prev => { const n = new Set(prev); n.delete(key); return n; });
        } else {
            // Add overlay / pane and populate data
            addIndicator(chart, key, candles);
            setActiveInds(prev => new Set([...prev, key]));
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    function addIndicator(chart: IChartApi, key: IndicatorKey, data: Candle[]) {
        const prices = data.map(c => c.close);
        const color  = IND_COLORS[key];

        if (key === 'EMA20') {
            const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceScaleId: 'right' });
            s.setData(toLineData(data, calcEMA(prices, 20)));
            overlaysRef.current.set('EMA20', [s]);
        } else if (key === 'EMA50') {
            const s = chart.addSeries(LineSeries, { color, lineWidth: 1, priceScaleId: 'right' });
            s.setData(toLineData(data, calcEMA(prices, 50)));
            overlaysRef.current.set('EMA50', [s]);
        } else if (key === 'SMA200') {
            const s = chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: 'right' });
            s.setData(toLineData(data, calcSMA(prices, 200)));
            overlaysRef.current.set('SMA200', [s]);
        } else if (key === 'VWAP') {
            const s = chart.addSeries(LineSeries, { color, lineWidth: 2, priceScaleId: 'right' });
            s.setData(toLineData(data, calcVWAP(data)));
            overlaysRef.current.set('VWAP', [s]);
        } else if (key === 'BB') {
            const { upper, middle, lower } = calcBB(prices);
            const mk = (ls: LineStyle = LineStyle.Solid) =>
                chart.addSeries(LineSeries, { color, lineWidth: 1, lineStyle: ls, priceScaleId: 'right' });
            const u = mk(); u.setData(toLineData(data, upper));
            const m = mk(LineStyle.Dashed); m.setData(toLineData(data, middle));
            const l = mk(); l.setData(toLineData(data, lower));
            overlaysRef.current.set('BB', [u, m, l]);
        } else if (key === 'RSI') {
            const pane = chart.addPane(false);
            pane.setStretchFactor(0.35);
            const s = pane.addSeries(LineSeries, { color, lineWidth: 1 });
            s.setData(toLineData(data, calcRSI(prices)));
            s.createPriceLine({ price: 70, color: DOWN,  lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
            s.createPriceLine({ price: 30, color: UP,    lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '' });
            s.createPriceLine({ price: 50, color: BORDER, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
            panesRef.current.set('RSI', { pane, series: [s] });
        } else if (key === 'MACD') {
            const pane  = chart.addPane(false);
            pane.setStretchFactor(0.35);
            const { macd, signal, hist } = calcMACD(prices);
            const macdLine   = pane.addSeries(LineSeries, { color: CYAN, lineWidth: 1 });
            const signalLine = pane.addSeries(LineSeries, { color: IND_COLORS.MACD, lineWidth: 1 });
            const histSeries = pane.addSeries(HistogramSeries, { priceScaleId: 'right' });
            macdLine.setData(toLineData(data, macd));
            signalLine.setData(toLineData(data, signal));
            histSeries.setData(
                data.map((c, i) => hist[i] != null ? {
                    time: t(c.time), value: hist[i]!,
                    color: hist[i]! >= 0 ? 'rgba(0,255,106,0.6)' : 'rgba(255,51,102,0.6)',
                } : null).filter(Boolean) as { time: UTCTimestamp; value: number; color: string }[]
            );
            panesRef.current.set('MACD', { pane, series: [macdLine, signalLine, histSeries] });
        }
    }

    function refreshOverlays(data: Candle[]) {
        const chart = chartRef.current;
        if (!chart) return;
        overlaysRef.current.forEach((_, key) => {
            chart.removeSeries(overlaysRef.current.get(key)![0]);
            overlaysRef.current.delete(key);
            addIndicator(chart, key, data);
        });
    }

    function refreshPanes(data: Candle[]) {
        const chart = chartRef.current;
        if (!chart) return;
        panesRef.current.forEach((_, key) => {
            const entry = panesRef.current.get(key)!;
            entry.series.forEach(s => chart.removeSeries(s));
            panesRef.current.delete(key);
            addIndicator(chart, key, data);
        });
    }

    // ── Render ────────────────────────────────────────────────────────────────
    const last    = candles[candles.length - 1];
    const isUp    = last ? last.close >= last.open : true;
    const barColor = isUp ? UP : DOWN;
    const CHART_TYPES: { key: ChartType; label: string }[] = [
        { key: 'candlestick', label: 'C' },
        { key: 'line',        label: 'L' },
        { key: 'bar',         label: 'B' },
        { key: 'area',        label: 'A' },
    ];
    const IND_BUTTONS: { key: IndicatorKey; label: string }[] = [
        { key: 'EMA20',  label: '20' },
        { key: 'EMA50',  label: '50' },
        { key: 'SMA200', label: '200' },
        { key: 'VWAP',   label: 'VW' },
        { key: 'BB',     label: 'BB' },
        { key: 'RSI',    label: 'RSI' },
        { key: 'MACD',   label: 'MCD' },
    ];

    return (
        <div className="relative w-full h-full flex flex-col" style={{ background: BG }}>
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div
                className="flex items-center gap-1.5 px-2 shrink-0 flex-wrap"
                style={{ minHeight: 28, background: '#0e0e18', borderBottom: `1px solid ${BORDER}`, padding: '3px 8px' }}
            >
                {/* Chart type buttons */}
                <div className="flex items-center gap-0.5">
                    {CHART_TYPES.map(({ key, label }) => (
                        <Btn key={key} label={label} active={localType === key}
                            onClick={() => setLocalType(key)} />
                    ))}
                </div>

                <div style={{ width: 1, height: 12, background: BORDER }} />

                {/* Symbol + OHLC */}
                <span style={{ fontFamily: 'monospace', color: CYAN, fontWeight: 700, fontSize: 11 }}>{symbol}</span>
                {last && (
                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: barColor }}>
                        O&nbsp;{last.open.toFixed(2)}&nbsp;
                        H&nbsp;{last.high.toFixed(2)}&nbsp;
                        L&nbsp;{last.low.toFixed(2)}&nbsp;
                        C&nbsp;{last.close.toFixed(2)}
                    </span>
                )}
                {currentPrice != null && (
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: barColor }}>
                        {currentPrice.toFixed(2)}
                    </span>
                )}

                <div style={{ flex: 1 }} />

                {/* Indicator toggles */}
                <div className="flex items-center gap-0.5">
                    {IND_BUTTONS.map(({ key, label }) => (
                        <Btn key={key} label={label} active={activeInds.has(key)}
                            color={IND_COLORS[key]}
                            onClick={() => toggleIndicator(key)} />
                    ))}
                </div>
            </div>

            {/* ── Chart canvas ───────────────────────────────────────────── */}
            <div ref={containerRef} className="flex-1 w-full" />

            {/* Empty state */}
            {candles.length === 0 && (
                <div className="absolute inset-0 top-7 flex items-center justify-center pointer-events-none">
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: TEXT, letterSpacing: '0.1em' }}>
                        [ WAITING FOR MARKET DATA ]
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── Data helpers (module-level, no closure) ──────────────────────────────────

const t2 = (n: number) => n as UTCTimestamp;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMainData(series: ISeriesApi<any>, type: ChartType, candles: Candle[]) {
    if (type === 'line' || type === 'area') {
        series.setData(candles.map(c => ({ time: t2(c.time), value: c.close })));
    } else {
        series.setData(candles.map(c => ({
            time: t2(c.time), open: c.open, high: c.high, low: c.low, close: c.close,
        })));
    }
}
