import { useState } from 'react';

export interface IndicatorConfig {
    key: string;
    visible: boolean;
    color: string;
    params: Record<string, number | string>;
}

const DEFAULT_COLORS: Record<string, string> = {
    SMA: '#9b59b6', EMA: '#00f0ff', WMA: '#3498db',
    BB: '#3498db', VWAP: '#f1c40f',
    Ichimoku: '#00ff6a', ParSAR: '#ffaa00',
    PivotPoints: '#ff8c00', Donchian: '#1abc9c',
    Keltner: '#e74c3c', LinReg: '#e67e22', Envelopes: '#8e44ad',
    RSI: '#8e44ad', MACD: '#e67e22', Stochastic: '#2ecc71',
    CCI: '#e74c3c', WilliamsR: '#f39c12', ADX: '#1abc9c',
    Momentum: '#00f0ff', OBV: '#00ff6a', Volume: '#6a6a7a', ATR: '#ffaa00',
};

const DEFAULT_PARAMS: Record<string, Record<string, number | string>> = {
    SMA: { period: 20 }, EMA: { period: 20 }, WMA: { period: 20 },
    BB: { period: 20, mult: 2 }, VWAP: {},
    Ichimoku: { tenkan: 9, kijun: 26, senkou: 52 }, ParSAR: { step: 0.02, max: 0.2 },
    PivotPoints: {}, Donchian: { period: 20 },
    Keltner: { emaPeriod: 20, atrPeriod: 10, mult: 2 },
    LinReg: { period: 20 }, Envelopes: { period: 20, pct: 0.025 },
    RSI: { period: 14 }, MACD: { fast: 12, slow: 26, signal: 9 },
    Stochastic: { kPeriod: 14, dPeriod: 3 },
    CCI: { period: 20 }, WilliamsR: { period: 14 }, ADX: { period: 14 },
    Momentum: { period: 10 }, OBV: {}, Volume: {}, ATR: { period: 14 },
};

export function useIndicators(initialKeys: string[] = []) {
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(() =>
        initialKeys.map(key => ({
            key,
            visible: true,
            color: DEFAULT_COLORS[key] ?? '#00f0ff',
            params: { ...(DEFAULT_PARAMS[key] ?? {}) },
        }))
    );

    const indicatorKeys = new Set(indicators.map(i => i.key));

    const addIndicator = (key: string) => {
        if (indicatorKeys.has(key)) return;
        setIndicators(prev => [...prev, {
            key,
            visible: true,
            color: DEFAULT_COLORS[key] ?? '#00f0ff',
            params: { ...(DEFAULT_PARAMS[key] ?? {}) },
        }]);
    };

    const removeIndicator = (key: string) => {
        setIndicators(prev => prev.filter(i => i.key !== key));
    };

    const toggleVisibility = (key: string) => {
        setIndicators(prev => prev.map(i => i.key === key ? { ...i, visible: !i.visible } : i));
    };

    const updateParams = (key: string, params: Record<string, number | string>) => {
        setIndicators(prev => prev.map(i =>
            i.key === key ? { ...i, params: { ...i.params, ...params } } : i
        ));
    };

    return { activeIndicators: indicators, addIndicator, removeIndicator, toggleVisibility, updateParams, indicatorKeys };
}
