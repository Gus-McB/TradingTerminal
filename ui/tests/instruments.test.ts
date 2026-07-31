import { describe, it, expect } from 'vitest';
import {
    getInstrument, resolveInstrument, getSessionStatus,
    formatPrice, roundToTick, instrumentsByAssetClass, liveInstruments,
} from '../../shared/instruments';

/** Build a UTC instant from a wall-clock time in a given IANA zone. */
function at(iso: string): Date {
    return new Date(iso);
}

describe('instrument lookup', () => {
    it('finds catalog instruments case-insensitively', () => {
        expect(getInstrument('btc/usd')?.name).toBe('Bitcoin');
        expect(getInstrument('AAPL')?.venue).toBe('NASDAQ');
        expect(getInstrument('BHP.AX')?.quoteCurrency).toBe('AUD');
    });

    it('resolves unknown symbols to a safe default', () => {
        const unknown = resolveInstrument('WXYZ');
        expect(unknown.pricePrecision).toBe(2);
        expect(unknown.live).toBe(false);
        // A slash implies a crypto-style pair
        expect(resolveInstrument('FOO/BAR').assetClass).toBe('crypto');
    });

    it('marks only engine-fed crypto as live', () => {
        const live = liveInstruments().map(i => i.symbol).sort();
        expect(live).toEqual(['BTC/USD', 'DOGE/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD']);
    });

    it('groups by asset class', () => {
        expect(instrumentsByAssetClass('fx').every(i => i.venue === 'FX')).toBe(true);
        expect(instrumentsByAssetClass('equity').length).toBeGreaterThan(5);
    });
});

describe('price formatting', () => {
    it('uses each instrument’s own precision', () => {
        expect(formatPrice('BTC/USD', 67543.216)).toBe('67,543.22');
        expect(formatPrice('DOGE/USD', 0.0871234)).toBe('0.08712');   // 5dp, not 2
        expect(formatPrice('EUR/USD', 1.084512)).toBe('1.08451');
        expect(formatPrice('GC', 2413.27)).toBe('2,413.3');           // gold ticks at 0.1
    });

    it('rounds to the instrument tick grid', () => {
        expect(roundToTick('ES', 5287.31)).toBe(5287.25);   // 0.25 ticks
        expect(roundToTick('AAPL', 187.507)).toBe(187.51);
    });
});

describe('session status per venue', () => {
    it('crypto is open around the clock, including weekends', () => {
        expect(getSessionStatus('BTC/USD', at('2026-07-11T03:00:00Z'))).toBe('OPEN'); // Saturday
        expect(getSessionStatus('BTC/USD', at('2026-07-13T21:00:00Z'))).toBe('OPEN'); // Monday night
    });

    it('US equities follow NY hours with pre/after sessions', () => {
        // 2026-07-13 is a Monday. 14:30Z = 10:30 ET (regular session, EDT)
        expect(getSessionStatus('AAPL', at('2026-07-13T14:30:00Z'))).toBe('OPEN');
        // 12:00Z = 08:00 ET → pre-market
        expect(getSessionStatus('AAPL', at('2026-07-13T12:00:00Z'))).toBe('PRE');
        // 21:00Z = 17:00 ET → after hours
        expect(getSessionStatus('AAPL', at('2026-07-13T21:00:00Z'))).toBe('AFTER');
        // 02:00Z Monday = 22:00 ET Sunday → closed
        expect(getSessionStatus('AAPL', at('2026-07-13T02:00:00Z'))).toBe('CLOSED');
    });

    it('US equities are closed at the weekend', () => {
        // Saturday 14:30Z would be mid-session on a weekday
        expect(getSessionStatus('AAPL', at('2026-07-11T14:30:00Z'))).toBe('CLOSED');
    });

    it('ASX runs on Sydney hours — open while New York sleeps', () => {
        // 2026-07-14 01:00Z = 11:00 AEST Tuesday → ASX open, US closed
        expect(getSessionStatus('BHP.AX', at('2026-07-14T01:00:00Z'))).toBe('OPEN');
        expect(getSessionStatus('AAPL',  at('2026-07-14T01:00:00Z'))).toBe('CLOSED');
    });

    it('futures span midnight and honour the maintenance break', () => {
        // CME is America/Chicago. 2026-07-13 is Monday.
        // 18:00Z = 13:00 CDT Monday → open
        expect(getSessionStatus('ES', at('2026-07-13T18:00:00Z'))).toBe('OPEN');
        // 21:30Z = 16:30 CDT → daily halt
        expect(getSessionStatus('ES', at('2026-07-13T21:30:00Z'))).toBe('CLOSED');
        // 23:00Z = 18:00 CDT → reopened for the next session
        expect(getSessionStatus('ES', at('2026-07-13T23:00:00Z'))).toBe('OPEN');
        // Saturday → closed
        expect(getSessionStatus('ES', at('2026-07-11T18:00:00Z'))).toBe('CLOSED');
    });

    it('FX trades 24/5 from Sunday evening to Friday evening (NY)', () => {
        // Sunday 2026-07-12 22:00Z = 18:00 ET → just opened
        expect(getSessionStatus('EUR/USD', at('2026-07-12T22:00:00Z'))).toBe('OPEN');
        // Sunday 14:00Z = 10:00 ET → still closed
        expect(getSessionStatus('EUR/USD', at('2026-07-12T14:00:00Z'))).toBe('CLOSED');
        // Friday 2026-07-17 14:00Z = 10:00 ET → open
        expect(getSessionStatus('EUR/USD', at('2026-07-17T14:00:00Z'))).toBe('OPEN');
        // Friday 22:00Z = 18:00 ET → weekend
        expect(getSessionStatus('EUR/USD', at('2026-07-17T22:00:00Z'))).toBe('CLOSED');
    });
});
