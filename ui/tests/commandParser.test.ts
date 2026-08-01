import { describe, it, expect } from 'vitest';
import { parseOrderCommand, fuzzyMatch } from '../src/services/commandParser';

describe('parseOrderCommand', () => {
    it('parses a full LIMIT order', () => {
        expect(parseOrderCommand('B 100 AAPL LMT 187.50')).toEqual({
            side: 'BUY', quantity: 100, symbol: 'AAPL', type: 'LIMIT', limitPrice: 187.5,
        });
    });

    it('parses a MARKET order with explicit type', () => {
        expect(parseOrderCommand('S 2 ETH/USD MKT')).toEqual({
            side: 'SELL', quantity: 2, symbol: 'ETH/USD', type: 'MARKET',
        });
    });

    it('defaults to MARKET when type omitted', () => {
        expect(parseOrderCommand('buy 0.5 btc/usd')).toEqual({
            side: 'BUY', quantity: 0.5, symbol: 'BTC/USD', type: 'MARKET',
        });
    });

    it('accepts long-form side and type words', () => {
        expect(parseOrderCommand('SELL 10 TSLA LIMIT 250')).toMatchObject({
            side: 'SELL', type: 'LIMIT', limitPrice: 250,
        });
    });

    it('rejects non-order input', () => {
        expect(parseOrderCommand('AAPL')).toBeNull();
        expect(parseOrderCommand('add chart')).toBeNull();
        expect(parseOrderCommand('')).toBeNull();
        expect(parseOrderCommand('theme')).toBeNull();
    });

    it('rejects invalid quantities and prices', () => {
        expect(parseOrderCommand('B 0 AAPL')).toBeNull();
        expect(parseOrderCommand('B -5 AAPL')).toBeNull();
        expect(parseOrderCommand('B x AAPL')).toBeNull();
        expect(parseOrderCommand('B 100 AAPL LMT 0')).toBeNull();
        expect(parseOrderCommand('B 100 AAPL LMT')).toBeNull();     // LIMIT needs a price
        expect(parseOrderCommand('B 100 AAPL MKT 5')).toBeNull();   // MARKET takes no price
    });
});

describe('fuzzyMatch', () => {
    it('matches substrings case-insensitively', () => {
        expect(fuzzyMatch('btc', 'BTC/USD')).toBe(true);
        expect(fuzzyMatch('usd', 'BTC/USD')).toBe(true);
    });

    it('matches subsequences', () => {
        expect(fuzzyMatch('mdp', 'Market Depth')).toBe(true);
    });

    it('rejects non-matches and accepts empty query', () => {
        expect(fuzzyMatch('xyz', 'Chart')).toBe(false);
        expect(fuzzyMatch('', 'anything')).toBe(true);
    });
});
