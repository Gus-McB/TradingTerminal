import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

interface MockAlert { id: string; symbol: string; direction: 'Above' | 'Below'; price: number; label: string; }

const MOCK_ACTIVE: MockAlert[] = [
    { id: 'a1', symbol: 'BTC/USD', direction: 'Above', price: 65000,  label: 'Major resistance' },
    { id: 'a2', symbol: 'ETH/USD', direction: 'Below', price: 3000,   label: 'Stop loss level'  },
    { id: 'a3', symbol: 'NVDA',    direction: 'Above', price: 950.00, label: 'Breakout target'  },
];

export function PriceAlertWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol: terminalSymbol, addAlert } = useTerminalSync();

    const [editSymbol, setEditSymbol] = useState(terminalSymbol);
    const [direction, setDirection] = useState<'Above' | 'Below'>('Above');
    const [threshold, setThreshold] = useState('');
    const [label, setLabel] = useState('');
    const [activeAlerts, setActiveAlerts] = useState<MockAlert[]>(MOCK_ACTIVE);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!threshold) return;
        const newAlert: MockAlert = {
            id: Date.now().toString(),
            symbol: editSymbol,
            direction,
            price: Number(threshold),
            label: label || `${direction} ${threshold}`,
        };
        setActiveAlerts(prev => [newAlert, ...prev]);
        addAlert({ type: 'info', message: `Price alert set: ${editSymbol} ${direction.toLowerCase()} ${threshold}` });
        setThreshold('');
        setLabel('');
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 4,
        color: '#e0e0e8', fontFamily: 'monospace', fontSize: 12, padding: '5px 8px', outline: 'none', boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6a6a7a', fontFamily: 'monospace', textTransform: 'uppercase', display: 'block', marginBottom: 3 };

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: '#12121a', borderBottom: '1px solid #2a2a3a' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a', textTransform: 'uppercase' }}>Price Alerts</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: 10, borderBottom: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                    <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
                        {(['Above', 'Below'] as const).map(d => (
                            <button key={d} type="button" onClick={() => setDirection(d)} style={{
                                flex: 1, padding: '5px 0', fontFamily: 'monospace', fontSize: 11, border: 'none', cursor: 'pointer',
                                background: direction === d ? (d === 'Above' ? '#003322' : '#330011') : 'transparent',
                                color: direction === d ? (d === 'Above' ? '#00ff6a' : '#ff3366') : '#6a6a7a',
                                borderRight: d === 'Above' ? '1px solid #2a2a3a' : 'none',
                            }}>{d}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Label (optional)</label>
                    <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Breakout level" />
                </div>
                <button type="submit" style={{
                    padding: '7px 0', borderRadius: 4, border: '1px solid #00f0ff', cursor: 'pointer',
                    background: 'rgba(0,240,255,0.08)', color: '#00f0ff', fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                }}>Set Alert</button>
            </form>

            {/* Active alert list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {activeAlerts.map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid #1a1a26', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#00f0ff' }}>{a.symbol}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: a.direction === 'Above' ? '#00ff6a' : '#ff3366' }}>{a.direction}</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8' }}>{a.price.toFixed(2)}</span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a' }}>{a.label}</span>
                        </div>
                        <button onClick={() => setActiveAlerts(prev => prev.filter(x => x.id !== a.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a7a', padding: 2, display: 'flex' }}>
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
