import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useAlertEngine } from '../hooks/useAlertEngine';
import type { WidgetComponentProps } from './registry';

export function PriceAlertWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol: terminalSymbol, addAlert: addTerminalAlert } = useTerminalSync({
        linkGroup: _c?.linkGroup as string | undefined,
    });
    const { alerts, addAlert, removeAlert } = useAlertEngine();

    const [editSymbol, setEditSymbol] = useState(terminalSymbol);
    const [direction, setDirection] = useState<'Above' | 'Below'>('Above');
    const [threshold, setThreshold] = useState('');
    const [label, setLabel] = useState('');

    // Live price alerts only (evaluated against real ticks by alertEngine)
    const priceAlerts = alerts.filter(a => a.type === 'price' && a.status !== 'expired');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const value = Number(threshold);
        if (!threshold || !Number.isFinite(value) || value <= 0) return;
        const symbol = editSymbol.trim().toUpperCase();
        if (!symbol) return;

        addAlert({
            type: 'price',
            symbol,
            condition: direction === 'Above' ? 'crosses_above' : 'crosses_below',
            value,
            label: label || `${symbol} ${direction.toLowerCase()} ${value}`,
            notify: ['in_app'],
            expiry: 'once',
        });
        addTerminalAlert({ type: 'info', message: `Price alert set: ${symbol} ${direction.toLowerCase()} ${value}` });
        setThreshold('');
        setLabel('');
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4,
        color: 'var(--color-text)', fontFamily: 'monospace', fontSize: 12, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', display: 'block', marginBottom: 3 };

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Price Alerts</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: 10, borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                        <label style={labelStyle}>Symbol</label>
                        <input style={inputStyle} value={editSymbol} onChange={e => setEditSymbol(e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Price</label>
                        <input style={inputStyle} type="number" step="any" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                {/* Direction toggle */}
                <div>
                    <label style={labelStyle}>Direction</label>
                    <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        {(['Above', 'Below'] as const).map(d => (
                            <button key={d} type="button" onClick={() => setDirection(d)} style={{
                                flex: 1, padding: '5px 0', fontFamily: 'monospace', fontSize: 11, border: 'none', cursor: 'pointer',
                                background: direction === d ? (d === 'Above' ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)') : 'transparent',
                                color: direction === d ? (d === 'Above' ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text-muted)',
                                borderRight: d === 'Above' ? '1px solid var(--color-border)' : 'none',
                            }}>{d}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Label (optional)</label>
                    <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Breakout level" />
                </div>
                <button type="submit" style={{
                    padding: '7px 0', borderRadius: 4, border: '1px solid var(--color-cyan)', cursor: 'pointer',
                    background: 'rgba(0,240,255,0.08)', color: 'var(--color-cyan)', fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                }}>Set Alert</button>
            </form>

            {/* Live alert list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {priceAlerts.length === 0 && (
                    <div style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-faint)' }}>
                            No price alerts — they trigger on live ticks
                        </span>
                    </div>
                )}
                {priceAlerts.map(a => {
                    const above = a.condition === 'above' || a.condition === 'crosses_above';
                    const isTriggered = a.status === 'triggered';
                    return (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid var(--color-row)', gap: 8, opacity: a.status === 'disabled' ? 0.45 : 1 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-cyan)' }}>{a.symbol}</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: above ? 'var(--color-green)' : 'var(--color-red)' }}>
                                        {above ? 'Above' : 'Below'}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)' }}>
                                        {Number(a.value).toFixed(2)}
                                    </span>
                                    {isTriggered && (
                                        <span style={{
                                            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                                            color: 'var(--color-amber)', border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                                            padding: '0 4px', borderRadius: 2,
                                        }}>
                                            TRIGGERED
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>{a.label}</span>
                            </div>
                            <button onClick={() => removeAlert(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2, display: 'flex' }}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
