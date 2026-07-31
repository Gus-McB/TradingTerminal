/**
 * DataSourceSelector — chooses which provider feeds the terminal's market data.
 *
 * Switching is live: the middleware swaps the feed and re-subscribes every
 * symbol on screen, so no reconnect or restart is needed. The paper account
 * keeps running off the C++ engine regardless of what is selected here.
 */
import { useEffect, useState } from 'react';
import { Radio, Loader2, Check, AlertTriangle } from 'lucide-react';
import {
    activateDataSource, refreshDataSource, subscribeDataSource,
    getDataSource, startDataSourceWatch, type DataSourceStatus,
} from '../../services/dataSource';
import { useConnectionsStore } from '../../stores/connectionsStore';

interface SourceOption {
    id: string;
    label: string;
    detail: string;
    /** Needs a saved, verified connection before it can serve data */
    requiresConnection?: boolean;
}

const BUILT_IN: SourceOption[] = [
    {
        id: 'engine',
        label: 'Simulated engine',
        detail: 'The built-in C++ feed. Deterministic and always available — no account needed.',
    },
    {
        id: 'binance',
        label: 'Binance (live crypto)',
        detail: 'Real crypto prices, depth and 1m bars from Binance public streams. No API key required.',
    },
    {
        id: 'alpaca',
        label: 'Alpaca (live US equities)',
        detail: 'Real equity trades, quotes and bars. Needs a verified Alpaca connection below.',
        requiresConnection: true,
    },
];

export function DataSourceSelector() {
    const connections = useConnectionsStore(s => s.connections);
    const [status, setStatus] = useState<DataSourceStatus>(getDataSource());
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string>();

    useEffect(() => {
        startDataSourceWatch();
        void refreshDataSource().then(setStatus);
        return subscribeDataSource(setStatus);
    }, []);

    const activate = async (option: SourceOption) => {
        setBusy(option.id);
        setError(undefined);

        // Providers that need keys draw them from the vault by connection id
        const connectionId = option.requiresConnection
            ? connections.find(c => c.providerId === option.id)?.id
            : undefined;

        const result = await activateDataSource(option.id, connectionId);
        if (!result.ok) setError(result.message ?? 'Could not switch data source');
        if (result.status) setStatus(result.status);
        setBusy(null);
    };

    return (
        <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                MARKET DATA SOURCE
            </div>

            {/* Current source */}
            <div
                className="flex items-center gap-2"
                style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${status.live ? 'var(--color-green)' : 'var(--color-amber)'}`,
                    padding: '9px 13px', marginBottom: 10,
                }}
            >
                <Radio size={13} color={status.live ? 'var(--color-green)' : 'var(--color-amber)'} />
                <span style={{ fontSize: 12, color: 'var(--color-text-bright)', fontWeight: 600 }}>
                    {status.label}
                </span>
                <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '1px 5px', borderRadius: 2,
                    color: status.live ? 'var(--color-green)' : 'var(--color-amber)',
                    border: `1px solid ${status.live ? 'var(--color-green)' : 'var(--color-amber)'}`,
                }}>
                    {status.live ? 'LIVE' : 'SIMULATED'}
                </span>
                {status.symbols.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                        {status.symbols.length} symbol{status.symbols.length === 1 ? '' : 's'} streaming
                    </span>
                )}
            </div>

            {/* Options */}
            {BUILT_IN.map(option => {
                const selected = status.sourceId === option.id;
                const connection = option.requiresConnection
                    ? connections.find(c => c.providerId === option.id)
                    : undefined;
                const blocked = option.requiresConnection && !connection;
                const unverified = Boolean(connection && connection.lastTestOk !== true);

                return (
                    <div
                        key={option.id}
                        className="flex items-center gap-3"
                        style={{
                            background: 'var(--color-bg-deep)',
                            border: `1px solid ${selected ? 'color-mix(in srgb, var(--color-accent) 45%, transparent)' : 'var(--color-border)'}`,
                            padding: '10px 13px', marginBottom: 6,
                        }}
                    >
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                                    {option.label}
                                </span>
                                {selected && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--color-green)' }}>
                                        <Check size={11} /> active
                                    </span>
                                )}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '3px 0 0', lineHeight: 1.5 }}>
                                {option.detail}
                            </p>
                            {blocked && (
                                <p style={{ fontSize: 10, color: 'var(--color-amber-alt)', margin: '3px 0 0' }}>
                                    Add an {option.label.split(' ')[0]} connection below first.
                                </p>
                            )}
                            {unverified && !blocked && (
                                <p style={{ fontSize: 10, color: 'var(--color-amber-alt)', margin: '3px 0 0' }}>
                                    Test this connection before using it for market data.
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => void activate(option)}
                            disabled={selected || blocked || busy !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5"
                            style={{
                                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                background: 'transparent',
                                border: `1px solid ${selected || blocked ? 'var(--color-border)' : 'color-mix(in srgb, var(--color-accent) 45%, transparent)'}`,
                                color: selected ? 'var(--color-text-dim)'
                                     : blocked ? 'var(--color-text-dim)'
                                     : 'var(--color-accent)',
                                cursor: selected || blocked || busy ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {busy === option.id && <Loader2 size={11} className="animate-spin" />}
                            {selected ? 'In use' : busy === option.id ? 'Switching…' : 'Use this'}
                        </button>
                    </div>
                );
            })}

            {(error || status.error) && (
                <div className="flex items-start gap-2" style={{ marginTop: 8 }}>
                    <AlertTriangle size={12} color="var(--color-red)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--color-red)', lineHeight: 1.5 }}>
                        {error ?? status.error}
                    </span>
                </div>
            )}

            <p style={{ fontSize: 10, color: 'var(--color-text-dim)', margin: '10px 0 0', lineHeight: 1.6 }}>
                Switching is live — the feed swaps and every symbol on screen re-subscribes without a restart.
                Orders always route to the paper matcher regardless of the data source.
            </p>
        </div>
    );
}
