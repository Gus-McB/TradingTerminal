/**
 * commandParser — pure parsing for the command palette's order-ticket syntax.
 *
 *   B 100 AAPL LMT 187.50     → BUY 100 AAPL LIMIT @187.50
 *   S 2 ETH/USD MKT           → SELL 2 ETH/USD MARKET
 *   BUY 0.5 BTC/USD           → BUY 0.5 BTC/USD MARKET (type optional)
 */
import type { OrderSide, OrderType } from '@shared/types';

export interface ParsedOrderCommand {
    side: OrderSide;
    quantity: number;
    symbol: string;
    type: OrderType;
    limitPrice?: number;
}

const SIDES: Record<string, OrderSide> = {
    B: 'BUY', BUY: 'BUY',
    S: 'SELL', SELL: 'SELL',
};

const TYPES: Record<string, OrderType> = {
    MKT: 'MARKET', MARKET: 'MARKET',
    LMT: 'LIMIT', LIMIT: 'LIMIT',
};

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9/.:-]*$/;

/** Returns the parsed order, or null when the input isn't order syntax. */
export function parseOrderCommand(input: string): ParsedOrderCommand | null {
    const tokens = input.trim().toUpperCase().split(/\s+/);
    if (tokens.length < 3 || tokens.length > 5) return null;

    const side = SIDES[tokens[0]];
    if (!side) return null;

    const quantity = Number(tokens[1]);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;

    const symbol = tokens[2];
    if (!SYMBOL_RE.test(symbol) || TYPES[symbol]) return null;

    // Type omitted → MARKET
    if (tokens.length === 3) return { side, quantity, symbol, type: 'MARKET' };

    const type = TYPES[tokens[3]];
    if (!type) return null;

    if (type === 'MARKET') {
        return tokens.length === 4 ? { side, quantity, symbol, type } : null;
    }

    // LIMIT requires a price
    if (tokens.length !== 5) return null;
    const limitPrice = Number(tokens[4]);
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) return null;

    return { side, quantity, symbol, type, limitPrice };
}

/** Case-insensitive fuzzy match: substring first, subsequence fallback. */
export function fuzzyMatch(query: string, target: string): boolean {
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    if (!q) return true;
    if (t.includes(q)) return true;
    let i = 0;
    for (const ch of t) {
        if (ch === q[i]) i++;
        if (i === q.length) return true;
    }
    return false;
}
