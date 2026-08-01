/**
 * Instrument registry — lookup, session state and price formatting.
 *
 * This is the single source of market truth for the UI: nothing should
 * hardcode session hours or decimal places any more.
 */
import type {
    Instrument, SessionStatus, TimeWindow, VenueId, AssetClass,
} from '../types/instruments';
import { INSTRUMENTS, ASSET_CLASS_LABELS } from './catalog';
import { VENUES } from './venues';

export * from '../types/instruments';
export { INSTRUMENTS, ASSET_CLASS_LABELS, VENUES };

// ─── Lookup ───────────────────────────────────────────────────────────────────

const BY_SYMBOL = new Map(INSTRUMENTS.map(i => [i.symbol.toUpperCase(), i]));

export function getInstrument(symbol: string): Instrument | undefined {
    return BY_SYMBOL.get(symbol.trim().toUpperCase());
}

/**
 * Always returns an instrument. Unknown symbols (hand-typed in the command
 * palette, or arriving from a feed before the catalog knows them) get a
 * conservative default so formatting never crashes.
 */
export function resolveInstrument(symbol: string): Instrument {
    const known = getInstrument(symbol);
    if (known) return known;

    const upper = symbol.trim().toUpperCase();
    const looksCrypto = upper.includes('/');
    return {
        symbol: upper,
        name: upper,
        assetClass: looksCrypto ? 'crypto' : 'equity',
        venue: looksCrypto ? 'BINANCE' : 'NASDAQ',
        quoteCurrency: 'USD',
        tickSize: 0.01,
        pricePrecision: 2,
        live: false,
    };
}

export function instrumentsByAssetClass(assetClass: AssetClass): Instrument[] {
    return INSTRUMENTS.filter(i => i.assetClass === assetClass);
}

export function instrumentsByVenue(venue: VenueId): Instrument[] {
    return INSTRUMENTS.filter(i => i.venue === venue);
}

/** Symbols served by a real feed today (everything else renders as SIM). */
export function liveInstruments(): Instrument[] {
    return INSTRUMENTS.filter(i => i.live);
}

// ─── Session state ────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

const WEEKDAY_INDEX: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Weekday + minutes-since-midnight in the venue's own timezone. */
function venueLocalTime(timezone: string, now: Date): { day: number; minutes: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const day = WEEKDAY_INDEX[get('weekday')] ?? 0;
    // hour12:false yields "24" for midnight in some engines
    const hour = Number(get('hour')) % 24;
    const minutes = hour * 60 + Number(get('minute'));
    return { day, minutes };
}

/** Does a window that stays within one day contain this time? */
function inSameDayWindow(minutes: number, w: TimeWindow): boolean {
    const open = toMinutes(w.open);
    const close = toMinutes(w.close);
    return minutes >= open && minutes < close;
}

function spansMidnight(w: TimeWindow): boolean {
    return toMinutes(w.close) <= toMinutes(w.open);
}

/**
 * Is a (possibly midnight-spanning) window active?
 * For spanning windows the session belongs to the day it OPENED, so a
 * Sunday-evening open runs through Monday.
 */
function inWindow(day: number, minutes: number, w: TimeWindow, tradingDays: number[]): boolean {
    const open = toMinutes(w.open);
    const close = toMinutes(w.close);
    const todayTrades = tradingDays.includes(day);
    const yesterdayTrades = tradingDays.includes((day + 6) % 7);

    if (!spansMidnight(w)) {
        return todayTrades && minutes >= open && minutes < close;
    }
    // Opened today and we're past the open, or opened yesterday and we're
    // still before the close.
    return (todayTrades && minutes >= open) || (yesterdayTrades && minutes < close);
}

export function getSessionStatus(symbolOrInstrument: string | Instrument, now: Date = new Date()): SessionStatus {
    const instrument = typeof symbolOrInstrument === 'string'
        ? resolveInstrument(symbolOrInstrument)
        : symbolOrInstrument;

    const session = VENUES[instrument.venue].session;
    const { day, minutes } = venueLocalTime(session.timezone, now);

    // Halts win over everything
    if (session.breaks?.some(b => inSameDayWindow(minutes, b))) return 'CLOSED';

    // Around-the-clock venues (crypto): open on any trading day
    if (session.regular === null) {
        return session.tradingDays.includes(day) ? 'OPEN' : 'CLOSED';
    }

    if (inWindow(day, minutes, session.regular, session.tradingDays)) return 'OPEN';
    if (session.preMarket && inWindow(day, minutes, session.preMarket, session.tradingDays)) return 'PRE';
    if (session.afterHours && inWindow(day, minutes, session.afterHours, session.tradingDays)) return 'AFTER';
    return 'CLOSED';
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Price with the instrument's own precision (DOGE needs 5dp, not 2). */
export function formatPrice(symbolOrInstrument: string | Instrument, value: number): string {
    const instrument = typeof symbolOrInstrument === 'string'
        ? resolveInstrument(symbolOrInstrument)
        : symbolOrInstrument;
    return value.toLocaleString('en-US', {
        minimumFractionDigits: instrument.pricePrecision,
        maximumFractionDigits: instrument.pricePrecision,
    });
}

/** Price with its quote currency, e.g. "A$42.10" for ASX names. */
export function formatPriceWithCurrency(symbolOrInstrument: string | Instrument, value: number): string {
    const instrument = typeof symbolOrInstrument === 'string'
        ? resolveInstrument(symbolOrInstrument)
        : symbolOrInstrument;
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: instrument.quoteCurrency,
        minimumFractionDigits: instrument.pricePrecision,
        maximumFractionDigits: instrument.pricePrecision,
    });
}

/** Round a price to the instrument's tick grid (order tickets). */
export function roundToTick(symbolOrInstrument: string | Instrument, value: number): number {
    const instrument = typeof symbolOrInstrument === 'string'
        ? resolveInstrument(symbolOrInstrument)
        : symbolOrInstrument;
    const ticks = Math.round(value / instrument.tickSize);
    return Number((ticks * instrument.tickSize).toFixed(instrument.pricePrecision));
}
