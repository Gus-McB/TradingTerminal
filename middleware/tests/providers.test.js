import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConnection, PAPER_ENDPOINTS } from '../src/providers/index.js';

const originalFetch = globalThis.fetch;

function mockFetch(response) {
    globalThis.fetch = vi.fn().mockResolvedValue({
        status: response.status ?? 200,
        ok: (response.status ?? 200) < 400,
        text: async () => JSON.stringify(response.body ?? {}),
    });
}

beforeEach(() => { globalThis.fetch = originalFetch; });
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

describe('provider endpoints', () => {
    it('only exposes paper/sandbox hosts', () => {
        const hosts = Object.values(PAPER_ENDPOINTS).map(u => new URL(u).hostname);
        // Compare exact hostnames: 'paper-api.alpaca.markets' merely *contains*
        // the live host as a substring, so a naive check would pass wrongly.
        expect(hosts).toContain('paper-api.alpaca.markets');
        expect(hosts).toContain('testnet.binance.vision');
        expect(hosts).not.toContain('api.alpaca.markets');
        expect(hosts).not.toContain('api.binance.com');
    });

    it('rejects unknown providers', async () => {
        const result = await testConnection('not-a-broker', {});
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/unknown provider/i);
    });
});

describe('alpaca adapter', () => {
    it('requires both credential fields before calling out', async () => {
        globalThis.fetch = vi.fn();
        const result = await testConnection('alpaca', { apiKeyId: 'PK123' });
        expect(result.ok).toBe(false);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('reports a rejected key without leaking it', async () => {
        mockFetch({ status: 403, body: { message: 'forbidden' } });
        const result = await testConnection('alpaca', { apiKeyId: 'PKSECRET', secretKey: 'shhh' });
        expect(result.ok).toBe(false);
        expect(JSON.stringify(result)).not.toContain('PKSECRET');
        expect(JSON.stringify(result)).not.toContain('shhh');
    });

    it('sends credentials as headers and summarises the account', async () => {
        mockFetch({
            status: 200,
            body: { account_number: 'PA123', status: 'ACTIVE', buying_power: '200000', currency: 'USD' },
        });
        const result = await testConnection('alpaca', { apiKeyId: 'PK1', secretKey: 'sec1' });

        expect(result.ok).toBe(true);
        expect(result.details.accountNumber).toBe('PA123');

        const [url, options] = globalThis.fetch.mock.calls[0];
        expect(url).toContain('paper-api.alpaca.markets');
        expect(options.headers['APCA-API-KEY-ID']).toBe('PK1');
        // Credentials go in headers, never the URL (which lands in logs/history)
        expect(url).not.toContain('sec1');
    });
});

describe('binance adapter', () => {
    it('signs the query with HMAC and never puts the secret in the URL', async () => {
        mockFetch({ status: 200, body: { canTrade: true, accountType: 'SPOT', balances: [] } });
        const result = await testConnection('binance', { apiKey: 'KEY1', secretKey: 'TOPSECRET' });

        expect(result.ok).toBe(true);
        const [url, options] = globalThis.fetch.mock.calls[0];
        expect(url).toContain('testnet.binance.vision');
        expect(url).toContain('signature=');
        expect(url).not.toContain('TOPSECRET');
        expect(options.headers['X-MBX-APIKEY']).toBe('KEY1');
    });

    it('explains a bad signature rather than echoing the secret', async () => {
        mockFetch({ status: 400, body: { code: -1022, msg: 'Signature invalid' } });
        const result = await testConnection('binance', { apiKey: 'K', secretKey: 'WRONG' });
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/secret key/i);
        expect(JSON.stringify(result)).not.toContain('WRONG');
    });
});

describe('ibkr adapter', () => {
    it('refuses to relax TLS for a non-loopback gateway', async () => {
        // A remote host must go through normal verified fetch, not the
        // rejectUnauthorized:false path reserved for localhost
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 200, ok: true, text: async () => JSON.stringify({ authenticated: true, connected: true }),
        });
        const result = await testConnection('ibkr', { gatewayUrl: 'https://example.com/v1/api' });
        expect(globalThis.fetch).toHaveBeenCalled();
        expect(result.ok).toBe(true);
    });

    it('gives an actionable message when the gateway is down', async () => {
        const result = await testConnection('ibkr', { gatewayUrl: 'https://127.0.0.1:59999/v1/api' });
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/gateway/i);
    });
});
