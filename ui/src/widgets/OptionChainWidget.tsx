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
    <th style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', padding: '3px 6px', textAlign: 'right', fontWeight: 400, textTransform: 'uppercase', borderBottom: '1px solid #2a2a3a' }}>
        {children}
    </th>
);

export function OptionChainWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({ pinSymbol: _c?.pinSymbol as string | undefined });
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
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#12121a', borderBottom: '1px solid #2a2a3a' }}>
                <span style={{ fontFamily: 'monospace', color: '#00f0ff', fontSize: 12 }}>{symbol}</span>
                <span style={{ fontFamily: 'monospace', color: '#6a6a7a', fontSize: 11 }}>ATM {atmPrice.toFixed(2)}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {(['calls', 'puts'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            padding: '3px 10px', fontFamily: 'monospace', fontSize: 11, border: 'none', cursor: 'pointer', borderRadius: 3,
                            background: tab === t ? (t === 'calls' ? '#003322' : '#330011') : '#1a1a26',
                            color: tab === t ? (t === 'calls' ? '#00ff6a' : '#ff3366') : '#6a6a7a',
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
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: itm ? (tab === 'calls' ? '#00ff6a' : '#ff3366') : '#e0e0e8', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #1a1a26' }}>
                                        {r.strike.toFixed(0)}
                                    </td>
                                    {[r.bid, r.ask, r.last].map((v, i) => (
                                        <td key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #1a1a26' }}>{v.toFixed(2)}</td>
                                    ))}
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#ffaa00', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #1a1a26' }}>{r.iv}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#6a6a7a', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #1a1a26' }}>{r.delta.toFixed(2)}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a', padding: '4px 6px', textAlign: 'right', borderBottom: '1px solid #1a1a26' }}>{r.oi.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
