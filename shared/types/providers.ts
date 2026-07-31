/**
 * Broker / market-data provider definitions.
 *
 * A "connection" is one provider plus one set of user-supplied credentials.
 * Secrets NEVER appear in these types — the renderer only ever handles
 * `ConnectionSummary`, which carries masked hints and status. Raw credential
 * values exist only in the Electron main process (OS-encrypted at rest) and
 * in middleware memory while a connection is active.
 */

export type ProviderId = 'alpaca' | 'binance' | 'ibkr';

export type ProviderCapability = 'marketData' | 'trading';

/** Sandbox vs real money. Live is deliberately not reachable yet. */
export type ProviderEnvironment = 'paper' | 'live';

export interface CredentialField {
    key: string;
    label: string;
    /** Rendered as a password input and masked everywhere afterwards */
    secret: boolean;
    placeholder?: string;
    help?: string;
    /** Optional fields (e.g. a self-hosted gateway URL) can be left blank */
    optional?: boolean;
    defaultValue?: string;
}

export interface ProviderDefinition {
    id: ProviderId;
    label: string;
    description: string;
    capabilities: ProviderCapability[];
    /** Asset classes the provider can serve, for the settings UI */
    markets: string[];
    fields: CredentialField[];
    /** Base URLs per environment; `live` present for completeness but gated */
    endpoints: Record<ProviderEnvironment, string>;
    /** Where the user generates keys */
    docsUrl: string;
    /** Human note shown in the UI before they paste anything */
    setupHint: string;
    /** True when this provider needs local software running (IBKR gateway) */
    requiresLocalGateway?: boolean;
}

// ─── Stored / transported shapes ─────────────────────────────────────────────

/** What the renderer is allowed to see about a saved connection. */
export interface ConnectionSummary {
    id: string;
    providerId: ProviderId;
    label: string;
    environment: ProviderEnvironment;
    /** e.g. { apiKeyId: '••••••4F2A' } — never the real value */
    maskedFields: Record<string, string>;
    createdAt: string;
    lastTestedAt?: string;
    lastTestOk?: boolean;
    lastTestMessage?: string;
    /** Currently supplying data/orders to the middleware */
    active: boolean;
}

/** Result of probing a provider with the user's credentials. */
export interface ConnectionTestResult {
    ok: boolean;
    message: string;
    /** Provider-reported details (account id, status…) — never secrets */
    details?: Record<string, string>;
}
