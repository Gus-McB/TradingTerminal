/**
 * Canonical instrument / market metadata shared by engine adapters,
 * middleware and UI.
 *
 * Before this existed a symbol was a bare string, so the app could not tell
 * crypto from equities: session hours were hardcoded to US equity times and
 * every price was rendered with two decimals. Everything market-specific
 * (session state, price formatting, venue grouping) now derives from here.
 */

export type AssetClass = 'crypto' | 'equity' | 'futures' | 'fx';

export type VenueId =
    | 'BINANCE'      // crypto, 24/7
    | 'NASDAQ'       // US equities
    | 'NYSE'         // US equities
    | 'ASX'          // Australian equities
    | 'CME'          // futures
    | 'FX';          // interbank FX, 24/5

/** A time window as "HH:MM" strings in the venue's local timezone. */
export interface TimeWindow {
    open: string;
    /** When close <= open the window spans midnight (e.g. futures 17:00→16:00). */
    close: string;
}

export interface VenueSession {
    /** IANA timezone the window strings are expressed in */
    timezone: string;
    /** Days the venue opens, 0 = Sunday … 6 = Saturday */
    tradingDays: number[];
    /** null → trades around the clock on trading days (crypto, futures, FX) */
    regular: TimeWindow | null;
    preMarket?: TimeWindow;
    afterHours?: TimeWindow;
    /** Daily halts (e.g. CME maintenance break) */
    breaks?: TimeWindow[];
}

export interface Venue {
    id: VenueId;
    label: string;
    session: VenueSession;
}

export interface Instrument {
    /** Canonical app symbol, e.g. 'BTC/USD', 'AAPL', 'BHP.AX', 'ES' */
    symbol: string;
    name: string;
    assetClass: AssetClass;
    venue: VenueId;
    /** Currency prices are quoted in — drives the display suffix/symbol */
    quoteCurrency: string;
    /** Minimum price increment */
    tickSize: number;
    /** Decimals to render (derived from tickSize but stored for speed) */
    pricePrecision: number;
    /**
     * True when a real feed serves this instrument today. False instruments
     * still render (with a SIM marker) so the market model can be exercised
     * before every feed is wired.
     */
    live: boolean;
}

/** Current state of a venue's trading session. */
export type SessionStatus = 'PRE' | 'OPEN' | 'AFTER' | 'CLOSED';
