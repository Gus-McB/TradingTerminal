/**
 * Technical indicator math utilities — all pure functions, no side-effects.
 * All functions return (number | null)[] aligned to the input array length.
 * Leading entries where not enough data exists are null.
 */
import type { Candle } from '../stores/marketStore';

export function calcEMA(prices: number[], period: number): (number | null)[] {
    const k = 2 / (period + 1);
    const out: (number | null)[] = Array(prices.length).fill(null);
    if (prices.length < period) return out;
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = ema;
    for (let i = period; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
        out[i] = ema;
    }
    return out;
}

export function calcSMA(prices: number[], period: number): (number | null)[] {
    const out: (number | null)[] = Array(prices.length).fill(null);
    for (let i = period - 1; i < prices.length; i++) {
        out[i] = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    }
    return out;
}

export function calcVWAP(candles: Candle[]): (number | null)[] {
    let cumVol = 0, cumTPV = 0;
    return candles.map(c => {
        const tp = (c.high + c.low + c.close) / 3;
        cumVol += c.volume;
        cumTPV += tp * c.volume;
        return cumVol > 0 ? cumTPV / cumVol : null;
    });
}

export interface BBResult {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
}

export function calcBB(prices: number[], period = 20, mult = 2): BBResult {
    const middle = calcSMA(prices, period);
    const upper: (number | null)[] = Array(prices.length).fill(null);
    const lower: (number | null)[] = Array(prices.length).fill(null);
    for (let i = period - 1; i < prices.length; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const avg = middle[i]!;
        const std = Math.sqrt(slice.reduce((s, v) => s + (v - avg) ** 2, 0) / period);
        upper[i] = avg + mult * std;
        lower[i] = avg - mult * std;
    }
    return { upper, middle, lower };
}

export function calcRSI(prices: number[], period = 14): (number | null)[] {
    const out: (number | null)[] = Array(prices.length).fill(null);
    if (prices.length <= period) return out;
    let avgG = 0, avgL = 0;
    for (let i = 1; i <= period; i++) {
        const d = prices[i] - prices[i - 1];
        if (d > 0) avgG += d; else avgL -= d;
    }
    avgG /= period; avgL /= period;
    out[period] = 100 - 100 / (1 + avgG / (avgL || 1e-9));
    for (let i = period + 1; i < prices.length; i++) {
        const d = prices[i] - prices[i - 1];
        avgG = (avgG * (period - 1) + Math.max(d, 0)) / period;
        avgL = (avgL * (period - 1) + Math.max(-d, 0)) / period;
        out[i] = 100 - 100 / (1 + avgG / (avgL || 1e-9));
    }
    return out;
}

export interface MACDResult {
    macd: (number | null)[];
    signal: (number | null)[];
    hist: (number | null)[];
}

export function calcMACD(prices: number[]): MACDResult {
    const ema12 = calcEMA(prices, 12);
    const ema26 = calcEMA(prices, 26);
    const macd: (number | null)[] = prices.map((_, i) =>
        ema12[i] != null && ema26[i] != null ? ema12[i]! - ema26[i]! : null
    );
    const signal = calcEMA(macd.map(v => v ?? 0), 9);
    const hist: (number | null)[] = macd.map((m, i) =>
        m != null && signal[i] != null ? m - signal[i]! : null
    );
    return { macd, signal, hist };
}

// ─── Additional Indicators ────────────────────────────────────────────────────

export function calcWMA(prices: number[], period: number): (number | null)[] {
    const out: (number | null)[] = Array(prices.length).fill(null);
    const denom = (period * (period + 1)) / 2;
    for (let i = period - 1; i < prices.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += prices[i - j] * (period - j);
        out[i] = sum / denom;
    }
    return out;
}

export function calcStochastic(
    candles: Candle[], kPeriod = 14, dPeriod = 3
): { k: (number | null)[]; d: (number | null)[] } {
    const n = candles.length;
    const k: (number | null)[] = Array(n).fill(null);
    for (let i = kPeriod - 1; i < n; i++) {
        const slice = candles.slice(i - kPeriod + 1, i + 1);
        const lo = Math.min(...slice.map(c => c.low));
        const hi = Math.max(...slice.map(c => c.high));
        k[i] = hi === lo ? 100 : ((candles[i].close - lo) / (hi - lo)) * 100;
    }
    const d = calcSMA(k.map(v => v ?? 0), dPeriod);
    const dNulled: (number | null)[] = d.map((v, i) => k[i] != null ? v : null);
    return { k, d: dNulled };
}

export function calcATR(candles: Candle[], period = 14): (number | null)[] {
    const n = candles.length;
    const out: (number | null)[] = Array(n).fill(null);
    if (n < 2) return out;
    const tr: number[] = [candles[0].high - candles[0].low];
    for (let i = 1; i < n; i++) {
        const prev = candles[i - 1].close;
        tr.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - prev), Math.abs(candles[i].low - prev)));
    }
    let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period - 1] = atr;
    for (let i = period; i < n; i++) {
        atr = (atr * (period - 1) + tr[i]) / period;
        out[i] = atr;
    }
    return out;
}

export function calcOBV(candles: Candle[]): number[] {
    const out: number[] = [0];
    for (let i = 1; i < candles.length; i++) {
        const prev = out[i - 1];
        if (candles[i].close > candles[i - 1].close) out.push(prev + candles[i].volume);
        else if (candles[i].close < candles[i - 1].close) out.push(prev - candles[i].volume);
        else out.push(prev);
    }
    return out;
}

export function calcCCI(candles: Candle[], period = 20): (number | null)[] {
    const n = candles.length;
    const out: (number | null)[] = Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
        const slice = candles.slice(i - period + 1, i + 1);
        const tp = slice.map(c => (c.high + c.low + c.close) / 3);
        const avg = tp.reduce((a, b) => a + b, 0) / period;
        const md = tp.reduce((a, b) => a + Math.abs(b - avg), 0) / period;
        out[i] = md === 0 ? 0 : (tp[period - 1] - avg) / (0.015 * md);
    }
    return out;
}

export function calcWilliamsR(candles: Candle[], period = 14): (number | null)[] {
    const n = candles.length;
    const out: (number | null)[] = Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
        const slice = candles.slice(i - period + 1, i + 1);
        const hi = Math.max(...slice.map(c => c.high));
        const lo = Math.min(...slice.map(c => c.low));
        out[i] = hi === lo ? -50 : ((hi - candles[i].close) / (hi - lo)) * -100;
    }
    return out;
}

export function calcADX(
    candles: Candle[], period = 14
): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } {
    const n = candles.length;
    const adx: (number | null)[] = Array(n).fill(null);
    const plusDI: (number | null)[] = Array(n).fill(null);
    const minusDI: (number | null)[] = Array(n).fill(null);
    if (n < period + 1) return { adx, plusDI, minusDI };

    const trArr: number[] = [], dmP: number[] = [], dmM: number[] = [];
    for (let i = 1; i < n; i++) {
        const upMove = candles[i].high - candles[i - 1].high;
        const downMove = candles[i - 1].low - candles[i].low;
        const prev = candles[i - 1].close;
        trArr.push(Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - prev), Math.abs(candles[i].low - prev)));
        dmP.push(upMove > downMove && upMove > 0 ? upMove : 0);
        dmM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    let atr = trArr.slice(0, period).reduce((a, b) => a + b, 0);
    let sdmP = dmP.slice(0, period).reduce((a, b) => a + b, 0);
    let sdmM = dmM.slice(0, period).reduce((a, b) => a + b, 0);

    const pdi0 = atr > 0 ? (sdmP / atr) * 100 : 0;
    const mdi0 = atr > 0 ? (sdmM / atr) * 100 : 0;
    plusDI[period] = pdi0; minusDI[period] = mdi0;
    const dx0 = pdi0 + mdi0 > 0 ? Math.abs(pdi0 - mdi0) / (pdi0 + mdi0) * 100 : 0;
    let adxVal = dx0;

    for (let i = period; i < n - 1; i++) {
        atr = atr - atr / period + trArr[i];
        sdmP = sdmP - sdmP / period + dmP[i];
        sdmM = sdmM - sdmM / period + dmM[i];
        const pdi = atr > 0 ? (sdmP / atr) * 100 : 0;
        const mdi = atr > 0 ? (sdmM / atr) * 100 : 0;
        plusDI[i + 1] = pdi; minusDI[i + 1] = mdi;
        const dx = pdi + mdi > 0 ? Math.abs(pdi - mdi) / (pdi + mdi) * 100 : 0;
        adxVal = (adxVal * (period - 1) + dx) / period;
        if (i >= period * 2 - 1) adx[i + 1] = adxVal;
    }
    return { adx, plusDI, minusDI };
}

export function calcMomentum(prices: number[], period = 10): (number | null)[] {
    const out: (number | null)[] = Array(prices.length).fill(null);
    for (let i = period; i < prices.length; i++) {
        out[i] = prices[i] - prices[i - period];
    }
    return out;
}

export interface IchimokuResult {
    tenkan: (number | null)[];
    kijun: (number | null)[];
    senkouA: (number | null)[];
    senkouB: (number | null)[];
    chikou: (number | null)[];
}

function midRange(candles: Candle[], i: number, period: number): number | null {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    return (Math.max(...slice.map(c => c.high)) + Math.min(...slice.map(c => c.low))) / 2;
}

export function calcIchimoku(candles: Candle[], tenkan = 9, kijun = 26, senkou = 52): IchimokuResult {
    const n = candles.length;
    const tenkanArr: (number | null)[] = Array(n).fill(null);
    const kijunArr: (number | null)[] = Array(n).fill(null);
    const senkouAArr: (number | null)[] = Array(n).fill(null);
    const senkouBArr: (number | null)[] = Array(n).fill(null);
    const chikouArr: (number | null)[] = Array(n).fill(null);

    for (let i = 0; i < n; i++) {
        tenkanArr[i] = midRange(candles, i, tenkan);
        kijunArr[i] = midRange(candles, i, kijun);
        if (i >= kijun - 1 && tenkanArr[i] != null && kijunArr[i] != null)
            senkouAArr[i] = (tenkanArr[i]! + kijunArr[i]!) / 2;
        senkouBArr[i] = midRange(candles, i, senkou);
        if (i + kijun < n) chikouArr[i + kijun] = candles[i].close;
    }
    return { tenkan: tenkanArr, kijun: kijunArr, senkouA: senkouAArr, senkouB: senkouBArr, chikou: chikouArr };
}

export function calcParabolicSAR(candles: Candle[], step = 0.02, max = 0.2): (number | null)[] {
    const n = candles.length;
    const out: (number | null)[] = Array(n).fill(null);
    if (n < 2) return out;
    let bull = true;
    let sar = candles[0].low;
    let ep = candles[0].high;
    let af = step;

    for (let i = 1; i < n; i++) {
        const prevSar = sar;
        sar = prevSar + af * (ep - prevSar);
        if (bull) {
            sar = Math.min(sar, candles[i - 1].low, i >= 2 ? candles[i - 2].low : candles[i - 1].low);
            if (candles[i].low < sar) {
                bull = false; sar = ep; ep = candles[i].low; af = step;
            } else {
                if (candles[i].high > ep) { ep = candles[i].high; af = Math.min(af + step, max); }
            }
        } else {
            sar = Math.max(sar, candles[i - 1].high, i >= 2 ? candles[i - 2].high : candles[i - 1].high);
            if (candles[i].high > sar) {
                bull = true; sar = ep; ep = candles[i].high; af = step;
            } else {
                if (candles[i].low < ep) { ep = candles[i].low; af = Math.min(af + step, max); }
            }
        }
        out[i] = sar;
    }
    return out;
}

export function calcDonchian(candles: Candle[], period = 20): { upper: (number | null)[]; lower: (number | null)[] } {
    const n = candles.length;
    const upper: (number | null)[] = Array(n).fill(null);
    const lower: (number | null)[] = Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
        const slice = candles.slice(i - period + 1, i + 1);
        upper[i] = Math.max(...slice.map(c => c.high));
        lower[i] = Math.min(...slice.map(c => c.low));
    }
    return { upper, lower };
}

export function calcKeltner(
    candles: Candle[], emaPeriod = 20, atrPeriod = 10, mult = 2
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const prices = candles.map(c => c.close);
    const middle = calcEMA(prices, emaPeriod);
    const atr = calcATR(candles, atrPeriod);
    const upper: (number | null)[] = Array(candles.length).fill(null);
    const lower: (number | null)[] = Array(candles.length).fill(null);
    for (let i = 0; i < candles.length; i++) {
        if (middle[i] != null && atr[i] != null) {
            upper[i] = middle[i]! + mult * atr[i]!;
            lower[i] = middle[i]! - mult * atr[i]!;
        }
    }
    return { upper, middle, lower };
}

export function calcLinearReg(
    prices: number[], period = 20
): { regression: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
    const n = prices.length;
    const regression: (number | null)[] = Array(n).fill(null);
    const upper: (number | null)[] = Array(n).fill(null);
    const lower: (number | null)[] = Array(n).fill(null);
    for (let i = period - 1; i < n; i++) {
        const slice = prices.slice(i - period + 1, i + 1);
        const xMean = (period - 1) / 2;
        const yMean = slice.reduce((a, b) => a + b, 0) / period;
        let num = 0, den = 0;
        for (let j = 0; j < period; j++) { num += (j - xMean) * (slice[j] - yMean); den += (j - xMean) ** 2; }
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;
        const fit = slope * (period - 1) + intercept;
        const stdErr = Math.sqrt(slice.reduce((s, v, j) => s + (v - (slope * j + intercept)) ** 2, 0) / period);
        regression[i] = fit;
        upper[i] = fit + 2 * stdErr;
        lower[i] = fit - 2 * stdErr;
    }
    return { regression, upper, lower };
}

export function calcPriceEnvelopes(
    prices: number[], period = 20, pct = 0.025
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
    const middle = calcSMA(prices, period);
    const upper: (number | null)[] = middle.map(v => v != null ? v * (1 + pct) : null);
    const lower: (number | null)[] = middle.map(v => v != null ? v * (1 - pct) : null);
    return { upper, middle, lower };
}

export function calcPivotPoints(
    candles: Candle[]
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
    if (candles.length < 2) return null;
    const prev = candles[candles.length - 2];
    const { high: h, low: l, close: c } = prev;
    const pp = (h + l + c) / 3;
    return {
        pp,
        r1: 2 * pp - l, r2: pp + (h - l), r3: h + 2 * (pp - l),
        s1: 2 * pp - h, s2: pp - (h - l), s3: l - 2 * (h - pp),
    };
}
