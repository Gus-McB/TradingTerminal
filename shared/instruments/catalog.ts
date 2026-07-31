/**
 * Instrument catalog — the symbol universe the terminal knows about.
 *
 * `live: true` means a real feed serves it today. Only the five crypto pairs
 * the C++ engine publishes are live; everything else is modelled so the
 * market layer (sessions, precision, venue grouping) can be exercised, and
 * is surfaced to the user with a SIM marker rather than pretending.
 */
import type { Instrument } from '../types/instruments';

export const INSTRUMENTS: Instrument[] = [
    // ── Crypto (live — published by the engine) ──────────────────────────────
    { symbol: 'BTC/USD',  name: 'Bitcoin',   assetClass: 'crypto', venue: 'BINANCE', quoteCurrency: 'USD', tickSize: 0.01,    pricePrecision: 2, live: true },
    { symbol: 'ETH/USD',  name: 'Ethereum',  assetClass: 'crypto', venue: 'BINANCE', quoteCurrency: 'USD', tickSize: 0.01,    pricePrecision: 2, live: true },
    { symbol: 'SOL/USD',  name: 'Solana',    assetClass: 'crypto', venue: 'BINANCE', quoteCurrency: 'USD', tickSize: 0.01,    pricePrecision: 2, live: true },
    { symbol: 'DOGE/USD', name: 'Dogecoin',  assetClass: 'crypto', venue: 'BINANCE', quoteCurrency: 'USD', tickSize: 0.00001, pricePrecision: 5, live: true },
    { symbol: 'XRP/USD',  name: 'Ripple',    assetClass: 'crypto', venue: 'BINANCE', quoteCurrency: 'USD', tickSize: 0.0001,  pricePrecision: 4, live: true },

    // ── US equities ─────────────────────────────────────────────────────────
    { symbol: 'AAPL', name: 'Apple Inc.',            assetClass: 'equity', venue: 'NASDAQ', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'MSFT', name: 'Microsoft Corp.',       assetClass: 'equity', venue: 'NASDAQ', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'NVDA', name: 'NVIDIA Corp.',          assetClass: 'equity', venue: 'NASDAQ', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'TSLA', name: 'Tesla Inc.',            assetClass: 'equity', venue: 'NASDAQ', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'SPY',  name: 'SPDR S&P 500 ETF',      assetClass: 'equity', venue: 'NYSE',   quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'QQQ',  name: 'Invesco QQQ Trust',     assetClass: 'equity', venue: 'NASDAQ', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },

    // ── ASX equities (AUD) ──────────────────────────────────────────────────
    { symbol: 'BHP.AX', name: 'BHP Group',            assetClass: 'equity', venue: 'ASX', quoteCurrency: 'AUD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'CBA.AX', name: 'Commonwealth Bank',    assetClass: 'equity', venue: 'ASX', quoteCurrency: 'AUD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'CSL.AX', name: 'CSL Limited',          assetClass: 'equity', venue: 'ASX', quoteCurrency: 'AUD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'NAB.AX', name: 'National Australia Bank', assetClass: 'equity', venue: 'ASX', quoteCurrency: 'AUD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'WES.AX', name: 'Wesfarmers',           assetClass: 'equity', venue: 'ASX', quoteCurrency: 'AUD', tickSize: 0.01, pricePrecision: 2, live: false },

    // ── Futures ─────────────────────────────────────────────────────────────
    { symbol: 'ES', name: 'E-mini S&P 500',   assetClass: 'futures', venue: 'CME', quoteCurrency: 'USD', tickSize: 0.25, pricePrecision: 2, live: false },
    { symbol: 'NQ', name: 'E-mini Nasdaq 100', assetClass: 'futures', venue: 'CME', quoteCurrency: 'USD', tickSize: 0.25, pricePrecision: 2, live: false },
    { symbol: 'CL', name: 'Crude Oil WTI',    assetClass: 'futures', venue: 'CME', quoteCurrency: 'USD', tickSize: 0.01, pricePrecision: 2, live: false },
    { symbol: 'GC', name: 'Gold',             assetClass: 'futures', venue: 'CME', quoteCurrency: 'USD', tickSize: 0.10, pricePrecision: 1, live: false },

    // ── FX ──────────────────────────────────────────────────────────────────
    { symbol: 'EUR/USD', name: 'Euro / US Dollar',        assetClass: 'fx', venue: 'FX', quoteCurrency: 'USD', tickSize: 0.00001, pricePrecision: 5, live: false },
    { symbol: 'GBP/USD', name: 'Pound / US Dollar',       assetClass: 'fx', venue: 'FX', quoteCurrency: 'USD', tickSize: 0.00001, pricePrecision: 5, live: false },
    { symbol: 'AUD/USD', name: 'Aussie / US Dollar',      assetClass: 'fx', venue: 'FX', quoteCurrency: 'USD', tickSize: 0.00001, pricePrecision: 5, live: false },
    { symbol: 'USD/JPY', name: 'US Dollar / Yen',         assetClass: 'fx', venue: 'FX', quoteCurrency: 'JPY', tickSize: 0.001,   pricePrecision: 3, live: false },
];

export const ASSET_CLASS_LABELS: Record<Instrument['assetClass'], string> = {
    crypto:  'Crypto',
    equity:  'Equities',
    futures: 'Futures',
    fx:      'FX',
};
