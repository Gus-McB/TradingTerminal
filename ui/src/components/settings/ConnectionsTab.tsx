/**
 * ConnectionsTab — where users plug in their own broker / market-data APIs.
 *
 * Security posture surfaced to the user, and enforced in code:
 *   • Keys are encrypted by the OS keychain and stay on this machine.
 *   • The interface only ever displays masked values; it cannot read back a
 *     saved secret (nor can any other part of the renderer).
 *   • Only PAPER / sandbox endpoints are reachable in this build.
 */
import { useEffect, useState } from 'react';
import {
    Plug, ShieldCheck, ShieldAlert, Check, X, Loader2,
    Trash2, ExternalLink, Plus, Info,
} from 'lucide-react';
import { PROVIDER_LIST, PROVIDERS, type ProviderDefinition, type ProviderId } from '@shared/providers';
import { useConnectionsStore } from '../../stores/connectionsStore';
import { DataSourceSelector } from './DataSourceSelector';
import { ConfirmDialog } from '../dialogs/Dialog';
import type { ConnectionTestDto } from '../../types/electron';

const label: React.CSSProperties = {
    fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.1em',
    marginBottom: 5, display: 'block', textTransform: 'uppercase',
};
const input: React.CSSProperties = {
    background: 'var(--color-bg-deep)', border: '1px solid var(--color-border)',
    color: 'var(--color-text)', fontSize: 12, padding: '7px 10px', width: '100%',
    outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
};

// ─── Add / edit form ─────────────────────────────────────────────────────────

function CredentialForm({ provider, onDone, onCancel }: {
    provider: ProviderDefinition;
    onDone: () => void;
    onCancel: () => void;
}) {
    const save = useConnectionsStore(s => s.save);
    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(provider.fields.map(f => [f.key, f.defaultValue ?? '']))
    );
    const [name, setName] = useState(`${provider.label} (paper)`);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    const missing = provider.fields.filter(f => !f.optional && !values[f.key]?.trim());

    const submit = async () => {
        if (missing.length > 0) return;
        setBusy(true);
        setError(undefined);
        const result = await save({
            providerId: provider.id,
            label: name.trim() || provider.label,
            fields: values,
            secretKeys: provider.fields.filter(f => f.secret).map(f => f.key),
        });
        // Drop the typed secrets from component state immediately
        setValues(Object.fromEntries(provider.fields.map(f => [f.key, ''])));
        setBusy(false);
        if (result.ok) onDone();
        else setError(result.error ?? 'Could not save');
    };

    return (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 16, marginTop: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
                {provider.setupHint}
            </p>

            <div style={{ marginBottom: 12 }}>
                <label style={label}>Connection name</label>
                <input style={input} value={name} onChange={e => setName(e.target.value)} />
            </div>

            {provider.fields.map(field => (
                <div key={field.key} style={{ marginBottom: 12 }}>
                    <label style={label}>
                        {field.label}{field.optional ? ' (optional)' : ''}
                    </label>
                    <input
                        style={input}
                        type={field.secret ? 'password' : 'text'}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ''}
                        onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                    />
                    {field.help && (
                        <span style={{ fontSize: 10, color: 'var(--color-text-dim)', marginTop: 4, display: 'block' }}>
                            {field.help}
                        </span>
                    )}
                </div>
            ))}

            {error && (
                <p style={{ fontSize: 11, color: 'var(--color-red)', margin: '0 0 10px' }}>{error}</p>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={submit}
                    disabled={busy || missing.length > 0}
                    className="flex items-center gap-1.5 px-4 py-2"
                    style={{
                        background: missing.length ? 'var(--color-raised)' : 'var(--color-accent)',
                        color: missing.length ? 'var(--color-text-dim)' : '#000',
                        fontSize: 11, fontWeight: 700, border: 'none',
                        cursor: busy || missing.length ? 'not-allowed' : 'pointer',
                    }}
                >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save securely
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2"
                    style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'transparent', border: '1px solid var(--color-border)' }}
                >
                    Cancel
                </button>
                <span style={{ fontSize: 10, color: 'var(--color-text-dim)', marginLeft: 4 }}>
                    Encrypted by your OS keychain · never leaves this machine
                </span>
            </div>
        </div>
    );
}

// ─── Saved connection row ────────────────────────────────────────────────────

function ConnectionRow({ id }: { id: string }) {
    const connection = useConnectionsStore(s => s.connections.find(c => c.id === id));
    const testingId = useConnectionsStore(s => s.testingId);
    const test = useConnectionsStore(s => s.test);
    const remove = useConnectionsStore(s => s.remove);

    const [result, setResult] = useState<ConnectionTestDto>();
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!connection) return null;
    const provider = PROVIDERS[connection.providerId as ProviderId];
    const testing = testingId === connection.id;
    const ok = result?.ok ?? connection.lastTestOk;
    const message = result?.message ?? connection.lastTestMessage;

    return (
        <div style={{ background: 'var(--color-bg-deep)', border: '1px solid var(--color-border)', padding: '10px 14px', marginBottom: 8 }}>
            <div className="flex items-center gap-3 flex-wrap">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-bright)' }}>
                    {connection.label}
                </span>
                <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', padding: '1px 5px', borderRadius: 2,
                    color: 'var(--color-amber)', border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                }}>
                    PAPER
                </span>
                {ok !== undefined && (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
                        color: ok ? 'var(--color-green)' : 'var(--color-red)',
                    }}>
                        {ok ? <Check size={11} /> : <X size={11} />}
                        {ok ? 'Verified' : 'Failed'}
                    </span>
                )}

                <div style={{ flex: 1 }} />

                <button
                    onClick={async () => setResult(await test(connection.id))}
                    disabled={testing}
                    className="flex items-center gap-1.5 px-3 py-1"
                    style={{
                        fontSize: 10, fontFamily: 'monospace', background: 'transparent',
                        border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)',
                        cursor: testing ? 'wait' : 'pointer',
                    }}
                >
                    {testing ? <Loader2 size={11} className="animate-spin" /> : <Plug size={11} />}
                    {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center justify-center"
                    style={{ width: 26, height: 24, color: 'var(--color-red)', background: 'transparent', border: '1px solid var(--color-border)' }}
                    title="Remove connection"
                >
                    <Trash2 size={11} />
                </button>
            </div>

            {/* Masked credential values — the real ones cannot be read back */}
            <div className="flex flex-wrap gap-4" style={{ marginTop: 8 }}>
                {Object.entries(connection.maskedFields).map(([key, value]) => {
                    const fieldDef = provider?.fields.find(f => f.key === key);
                    return (
                        <span key={key} style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                            {fieldDef?.label ?? key}: <span style={{ color: 'var(--color-text-muted)' }}>{value || '—'}</span>
                        </span>
                    );
                })}
            </div>

            {message && (
                <p style={{
                    fontSize: 10, marginTop: 8, marginBottom: 0, lineHeight: 1.5,
                    color: ok ? 'var(--color-text-muted)' : 'var(--color-red)',
                }}>
                    {message}
                </p>
            )}
            {result?.details && (
                <div className="flex flex-wrap gap-3" style={{ marginTop: 6 }}>
                    {Object.entries(result.details).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                            {k}: <span style={{ color: 'var(--color-cyan)' }}>{v}</span>
                        </span>
                    ))}
                </div>
            )}

            {confirmDelete && (
                <ConfirmDialog
                    title="REMOVE CONNECTION"
                    message={`Delete "${connection.label}"? The stored credentials are erased from this machine. Revoke the key with the provider too if it is no longer needed.`}
                    confirmLabel="Remove"
                    danger
                    onConfirm={() => { void remove(connection.id); setConfirmDelete(false); }}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export function ConnectionsTab() {
    const { init, connections, supported, vaultAvailable, loading } = useConnectionsStore();
    const [adding, setAdding] = useState<ProviderId | null>(null);

    useEffect(() => { void init(); }, [init]);

    if (!supported) {
        return (
            <div style={{ maxWidth: 780 }}>
                {/* Data source switching works without the vault — Binance
                    public streams and the engine need no credentials */}
                <DataSourceSelector />
                <div className="flex items-start gap-2" style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    padding: 14, borderLeft: '3px solid var(--color-amber)',
                }}>
                    <Info size={14} color="var(--color-amber)" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--color-text)', margin: '0 0 4px' }}>
                            API connections need the desktop app
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                            Credentials are encrypted with your operating system's keychain, which is only
                            reachable from the Electron build. Run the terminal as the desktop app to add
                            broker or market-data keys.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 780 }}>
            <DataSourceSelector />

            {/* Security posture */}
            <div className="flex items-start gap-2" style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                padding: 14, marginBottom: 18,
                borderLeft: `3px solid ${vaultAvailable ? 'var(--color-green)' : 'var(--color-red)'}`,
            }}>
                {vaultAvailable
                    ? <ShieldCheck size={14} color="var(--color-green)" style={{ marginTop: 1, flexShrink: 0 }} />
                    : <ShieldAlert size={14} color="var(--color-red)" style={{ marginTop: 1, flexShrink: 0 }} />}
                <div>
                    <p style={{ fontSize: 12, color: 'var(--color-text)', margin: '0 0 4px' }}>
                        {vaultAvailable ? 'Credential vault ready' : 'OS credential store unavailable'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                        {vaultAvailable ? (
                            <>
                                Keys are encrypted with your OS keychain and stay on this machine — never synced,
                                never sent to our servers, never readable by the interface once saved.
                                {' '}<strong style={{ color: 'var(--color-amber)' }}>Paper/sandbox endpoints only</strong> in
                                this build: nothing here can place a real-money order.
                            </>
                        ) : (
                            <>Saving is disabled because this machine exposes no secure keychain. Keys will not be
                            written unencrypted.</>
                        )}
                    </p>
                </div>
            </div>

            {/* Saved connections */}
            {connections.length > 0 && (
                <>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        YOUR CONNECTIONS
                    </div>
                    {connections.map(c => <ConnectionRow key={c.id} id={c.id} />)}
                </>
            )}

            {loading && connections.length === 0 && (
                <p style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Loading…</p>
            )}

            {/* Providers */}
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', margin: '22px 0 8px' }}>
                AVAILABLE PROVIDERS
            </div>

            {PROVIDER_LIST.map(provider => (
                <div key={provider.id} style={{ marginBottom: 10 }}>
                    <div
                        style={{
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            padding: '12px 14px',
                        }}
                    >
                        <div className="flex items-center gap-3 flex-wrap">
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)' }}>
                                {provider.label}
                            </span>
                            {provider.capabilities.map(cap => (
                                <span key={cap} style={{
                                    fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', padding: '1px 5px',
                                    borderRadius: 2, color: 'var(--color-cyan)',
                                    border: '1px solid color-mix(in srgb, var(--color-cyan) 35%, transparent)',
                                }}>
                                    {cap === 'marketData' ? 'MARKET DATA' : 'TRADING'}
                                </span>
                            ))}
                            {provider.requiresLocalGateway && (
                                <span style={{ fontSize: 9, color: 'var(--color-amber-alt)' }}>
                                    needs local gateway
                                </span>
                            )}

                            <div style={{ flex: 1 }} />

                            <a
                                href={provider.docsUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="flex items-center gap-1"
                                style={{ fontSize: 10, color: 'var(--color-text-dim)' }}
                            >
                                Get keys <ExternalLink size={10} />
                            </a>
                            <button
                                onClick={() => setAdding(adding === provider.id ? null : provider.id)}
                                disabled={!vaultAvailable}
                                className="flex items-center gap-1.5 px-3 py-1"
                                style={{
                                    fontSize: 10, fontWeight: 600,
                                    background: 'transparent',
                                    border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)',
                                    color: vaultAvailable ? 'var(--color-accent)' : 'var(--color-text-dim)',
                                    cursor: vaultAvailable ? 'pointer' : 'not-allowed',
                                }}
                            >
                                <Plus size={11} /> Add
                            </button>
                        </div>

                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                            {provider.description}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
                            Markets: {provider.markets.join(' · ')}
                        </p>
                    </div>

                    {adding === provider.id && (
                        <CredentialForm
                            provider={provider}
                            onDone={() => setAdding(null)}
                            onCancel={() => setAdding(null)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
