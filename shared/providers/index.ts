/**
 * Provider catalog — what the settings page offers and what each one needs.
 *
 * Only PAPER/sandbox endpoints are reachable in this build. Live URLs are
 * recorded so the arming flow has somewhere to point later, but nothing in
 * the app routes to them yet.
 */
import type { ProviderDefinition, ProviderId } from '../types/providers';

export * from '../types/providers';

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
    alpaca: {
        id: 'alpaca',
        label: 'Alpaca',
        description: 'US equities and crypto — market data and paper trading in one account.',
        capabilities: ['marketData', 'trading'],
        markets: ['US equities', 'Crypto'],
        fields: [
            { key: 'apiKeyId',  label: 'API Key ID',  secret: true, placeholder: 'PK…' },
            { key: 'secretKey', label: 'Secret Key',  secret: true },
        ],
        endpoints: {
            paper: 'https://paper-api.alpaca.markets',
            live:  'https://api.alpaca.markets',
        },
        docsUrl: 'https://app.alpaca.markets/paper/dashboard/overview',
        setupHint:
            'Create a free Alpaca account, switch it to Paper Trading, then generate an API key pair. ' +
            'Paper keys cannot touch real money.',
    },

    binance: {
        id: 'binance',
        label: 'Binance',
        description: 'Crypto spot market data and testnet trading.',
        capabilities: ['marketData', 'trading'],
        markets: ['Crypto'],
        fields: [
            { key: 'apiKey',    label: 'API Key',    secret: true },
            { key: 'secretKey', label: 'Secret Key', secret: true },
        ],
        endpoints: {
            paper: 'https://testnet.binance.vision',
            live:  'https://api.binance.com',
        },
        docsUrl: 'https://testnet.binance.vision/',
        setupHint:
            'Log in to the Binance Spot Testnet with GitHub and generate a HMAC key pair. ' +
            'Testnet keys are separate from your real Binance account.',
    },

    ibkr: {
        id: 'ibkr',
        label: 'Interactive Brokers',
        description: 'Equities, futures, FX and ASX via the local Client Portal Gateway.',
        capabilities: ['marketData', 'trading'],
        markets: ['US equities', 'ASX', 'Futures', 'FX'],
        requiresLocalGateway: true,
        fields: [
            {
                key: 'gatewayUrl',
                label: 'Gateway URL',
                secret: false,
                optional: true,
                defaultValue: 'https://localhost:5000/v1/api',
                help: 'Where your Client Portal Gateway is listening.',
            },
        ],
        endpoints: {
            paper: 'https://localhost:5000/v1/api',
            live:  'https://localhost:5000/v1/api',
        },
        docsUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
        setupHint:
            'IBKR does not use API keys: run the Client Portal Gateway locally and log in through its ' +
            'browser prompt with a PAPER account. The terminal then talks to that gateway — no credentials ' +
            'are stored here.',
    },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

/** Mask a secret for display: keep the last 4 characters at most. */
export function maskSecret(value: string): string {
    if (!value) return '';
    const tail = value.slice(-4);
    return `${'•'.repeat(Math.min(Math.max(value.length - 4, 4), 12))}${tail}`;
}
