/**
 * Venue definitions — trading calendars per exchange.
 *
 * Scope note: sessions are modelled by weekday + local time windows. Public
 * holidays and half-days are NOT modelled; a venue will report OPEN on e.g.
 * Christmas Day. Wiring a holiday calendar is a follow-up once a real feed
 * lands (the feed itself becomes the source of truth for halts).
 */
import type { Venue, VenueId } from '../types/instruments';

export const VENUES: Record<VenueId, Venue> = {
    BINANCE: {
        id: 'BINANCE',
        label: 'Binance',
        session: {
            timezone: 'UTC',
            tradingDays: [0, 1, 2, 3, 4, 5, 6],
            regular: null,               // 24/7
        },
    },

    NASDAQ: {
        id: 'NASDAQ',
        label: 'NASDAQ',
        session: {
            timezone: 'America/New_York',
            tradingDays: [1, 2, 3, 4, 5],
            regular:    { open: '09:30', close: '16:00' },
            preMarket:  { open: '04:00', close: '09:30' },
            afterHours: { open: '16:00', close: '20:00' },
        },
    },

    NYSE: {
        id: 'NYSE',
        label: 'NYSE',
        session: {
            timezone: 'America/New_York',
            tradingDays: [1, 2, 3, 4, 5],
            regular:    { open: '09:30', close: '16:00' },
            preMarket:  { open: '04:00', close: '09:30' },
            afterHours: { open: '16:00', close: '20:00' },
        },
    },

    ASX: {
        id: 'ASX',
        label: 'ASX',
        session: {
            timezone: 'Australia/Sydney',
            tradingDays: [1, 2, 3, 4, 5],
            regular:   { open: '10:00', close: '16:00' },
            preMarket: { open: '07:00', close: '10:00' },   // pre-open auction
            afterHours: { open: '16:00', close: '17:00' },  // closing single price auction
        },
    },

    CME: {
        id: 'CME',
        label: 'CME',
        session: {
            timezone: 'America/Chicago',
            // Sunday evening open through Friday afternoon close
            tradingDays: [0, 1, 2, 3, 4],
            regular: { open: '17:00', close: '16:00' },     // spans midnight
            breaks:  [{ open: '16:00', close: '17:00' }],   // daily maintenance halt
        },
    },

    FX: {
        id: 'FX',
        label: 'Interbank FX',
        session: {
            timezone: 'America/New_York',
            // Opens Sunday 17:00 ET, closes Friday 17:00 ET
            tradingDays: [0, 1, 2, 3, 4],
            regular: { open: '17:00', close: '17:00' },     // spans midnight (~24h)
        },
    },
};
