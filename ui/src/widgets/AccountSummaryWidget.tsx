import React, { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

const BASE_STATS = {
    nlv:     125432.10,
    dayPnl:  1234.56,
    uPnl:    -432.10,
    bp:      89432.00,
    margin:  36000.00,
    cash:    52432.10,
};
const MARGIN_MAX = 100000;

const jitter = (n: number, pct = 0.001) => parseFloat((n * (1 + (Math.random() - 0.499) * pct)).toFixed(2));

export function AccountSummaryWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { account } = useTerminalSync();

    const [stats, setStats] = useState(BASE_STATS);

    useEffect(() => {
        const id = setInterval(() => {
            setStats(prev => ({
                nlv:    jitter(prev.nlv),
                dayPnl: jitter(prev.dayPnl, 0.005),
                uPnl:   jitter(prev.uPnl, 0.005),
                bp:     jitter(prev.bp),
                margin: prev.margin,
                cash:   jitter(prev.cash),
            }));
        }, 3000);
        return () => clearInterval(id);
    }, []);

    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    const cards: { label: string; value: string; color: string; extra?: React.ReactNode }[] = [
        { label: 'Net Liquidating Value', value: fmt(stats.nlv),   color: '#e0e0e8' },
        { label: 'Day P&L',              value: fmt(stats.dayPnl), color: stats.dayPnl >= 0 ? '#00ff6a' : '#ff3366' },
        { label: 'Unrealised P&L',       value: fmt(stats.uPnl),  color: stats.uPnl >= 0 ? '#00ff6a' : '#ff3366' },
        { label: 'Buying Power',         value: fmt(stats.bp),    color: '#e0e0e8' },
        {
            label: 'Margin Used',
            value: fmt(stats.margin),
            color: '#ffaa00',
            extra: (
                <div style={{ marginTop: 5, background: '#0a0a0f', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#ffaa00', borderRadius: 3, width: `${(stats.margin / MARGIN_MAX) * 100}%`, transition: 'width 0.4s' }} />
                </div>
            ),
        },
        { label: 'Cash Balance',         value: fmt(stats.cash),  color: '#e0e0e8' },
    ];

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: '#12121a', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a', textTransform: 'uppercase' }}>Account</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00f0ff' }}>{account}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
                {cards.map(card => (
                    <div key={card.label} style={{ background: '#12121a', border: '1px solid #2a2a3a', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: card.color, fontWeight: 700 }}>{card.value}</div>
                        {card.extra}
                    </div>
                ))}
            </div>
        </div>
    );
}
