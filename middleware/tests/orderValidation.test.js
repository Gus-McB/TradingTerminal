import { describe, it, expect } from 'vitest';
import { validateOrder } from '../src/ipc/order-bridge.js';

const valid = {
    clientOrderId: 'ord-1',
    symbol: 'BTC/USD',
    side: 'BUY',
    type: 'LIMIT',
    quantity: 0.5,
    limitPrice: 65000,
};

describe('order validation (system boundary)', () => {
    it('accepts a valid LIMIT order', () => {
        expect(validateOrder(valid)).toBeNull();
    });

    it('accepts a valid MARKET order without a price', () => {
        expect(validateOrder({ ...valid, type: 'MARKET', limitPrice: undefined })).toBeNull();
    });

    it('rejects null / non-object payloads', () => {
        expect(validateOrder(null)).toBeTruthy();
        expect(validateOrder('BUY')).toBeTruthy();
    });

    it('rejects missing or oversized clientOrderId', () => {
        expect(validateOrder({ ...valid, clientOrderId: '' })).toBeTruthy();
        expect(validateOrder({ ...valid, clientOrderId: 'x'.repeat(65) })).toBeTruthy();
    });

    it('rejects invalid side and unsupported types', () => {
        expect(validateOrder({ ...valid, side: 'HOLD' })).toBeTruthy();
        expect(validateOrder({ ...valid, type: 'STOP' })).toMatch(/unsupported/);
    });

    it('rejects non-positive, non-finite, and non-numeric quantity', () => {
        expect(validateOrder({ ...valid, quantity: 0 })).toBeTruthy();
        expect(validateOrder({ ...valid, quantity: -1 })).toBeTruthy();
        expect(validateOrder({ ...valid, quantity: Infinity })).toBeTruthy();
        expect(validateOrder({ ...valid, quantity: '5' })).toBeTruthy();
    });

    it('rejects LIMIT orders without a positive limit price', () => {
        expect(validateOrder({ ...valid, limitPrice: undefined })).toBeTruthy();
        expect(validateOrder({ ...valid, limitPrice: 0 })).toBeTruthy();
    });
});
