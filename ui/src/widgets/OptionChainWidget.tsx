import React, { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useTicker } from '../services/marketData';
import type { WidgetComponentProps } from './registry';

interface OptionRow { strike: number; bid: number; ask: number; last: number; iv: number; delta: number; oi: number; }

function buildChain(atmPrice: number): OptionRow[] {
    const step = atmPrice > 10000 ? 500 : atmPrice > 1000 ? 50 : atmPrice > 100 ? 5 : 1;
    const base = Math.round(atmPrice / step) * step;
    return Array.from({ length: 16 }, (_, i) => {
        const strike = base + (i - 7) * step;
        const diff = Math.abs(strike - atmPrice) / atmPrice;
        const iv = 0.35 + diff * 0.4 + Math.random() * 0.05;
        const mid = Math.max(0.01, (strike > atmPrice ? diff : (1 - diff / 2)) * atmPrice * 0.04);
        return {
            strike,
            bid: parseFloat((mid * 0.95).toFixed(2)),
            ask: parseFloat((mid * 1.05).toFixed(2)),
            last: parseFloat((mid * (0.97 + Math.random() * 0.06)).toFixed(2)),
            iv: parseFloat((iv * 100).toFixed(1)),
            delta: parseFloat((strike < atmPrice ? 0.5 + (1 - diff * 4) * 0.5 : 0.5 - diff * 3).toFixed(2)),
            oi: Math.round(100 + Math.random() * 9900),
        };
    });
}

const TH = ({ children }: { children: React.ReactNode }) => (
    <th style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', padding: '3px 6px', textAlign: 'right', fontWeight: 400, textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>
        {children}
    </th>
);

export function OptionChainWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({
        pinSymbol: _c?.pinSymbol as string | undefined,
        linkGroup: _c?.linkGroup as string | undefined,
    });
    const ticker = useTicker(symbol);
    const atmPrice = ticker?.price ?? 100;

    const [chain, setChain] = useState<OptionRow[]>(() => buildChain(atmPrice));
    const [tab, setTab] = useState<'calls' | 'puts'>('calls');

    useEffect(() => {
        setChain(buildChain(atmPrice));
        const id = setInterval(() => {
            setChain(prev => prev.map(r => ({
                ...r,
                bid: parseFloat((r.bid * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
                ask: parseFloat((r.ask * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
            })));
        }, 1500);
        return () => clearInterval(id);
    }, [atmPrice]);

    const rows = chain.slice(tab === 'calls' ? 0 : 8, tab === 'calls' ? 8 : 16);

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-cyan)', fontSize: 12 }}>{symbol}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)', fontSize: 11 }}>ATM {atmPrice.toFixed(2)}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {(['calls', 'puts'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '3px 10px', fontFamily: 'monospace', fontSize: 11, border: 'none', cursor: 'pointer', borderRadius: 3,
                            background: tab === t ? (t === 'calls' ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)') : 'var(--color-row)',
                            color: tab === t ? (t === 'calls' ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text-muted)',
                        }}>{t.toUpperCase()}</button>
                    ))}
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><TH>Strike</TH><TH>Bid</TH><TH>Ask</TH><TH>Last</TH><TH>IV%</TH><TH>Delta</TH><TH>OI</TH></tr></thead>
                    <tbody>
                        {rows.map(r => {
                            const itm = tab === 'calls' ? r.strike < atmPrice : r.strike > atmPrice;
                            return (
                                <tr key={r.strike} style={{ background: itm ? (tab === 'calls' ? 'rgba(0,255,106,0.05)' : 'rgba(255,51,102,0.05)') : 'transparent' }}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: itm ? (tab === 'calls' ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text)', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' }}>
                                        {r.strike.toFixed(0)}
                                    </td>
                                    {[r.bid, r.ask, r.last].map((v, i) => (
                                        <td key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' }}>{v.toFixed(2)}</td>
                                    ))}
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-amber)', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' }}>{r.iv}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' }}>{r.delta.toFixed(2)}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' }}>{r.oi.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
