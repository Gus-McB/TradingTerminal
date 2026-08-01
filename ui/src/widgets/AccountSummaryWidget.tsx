import React from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useAccountStore } from '../stores/accountStore';
import { useTickerList } from '../services/marketData';
import type { WidgetComponentProps } from './registry';

export function AccountSummaryWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { account } = useTerminalSync();
    const cash = useAccountStore(s => s.cash);
    const realizedPnl = useAccountStore(s => s.realizedPnl);
    const positions = useAccountStore(s => s.positions);
    const live = useAccountStore(s => s.live);
    const tickers = useTickerList();

    const priceOf = (symbol: string) => tickers.find(t => t.symbol === symbol)?.price;

    // Derived from live tickers; engine is authoritative for cash/realized
    let positionsValue = 0;
    let unrealizedPnl = 0;
    for (const p of positions) {
        const cur = priceOf(p.symbol);
        if (cur === undefined || p.quantity === 0) continue;
        positionsValue += p.quantity * cur;
        unrealizedPnl += (cur - p.avgPrice) * p.quantity;
    }
    const equity = cash + positionsValue;
    const grossExposure = positions.reduce((s, p) => {
        const cur = priceOf(p.symbol);
        return cur === undefined ? s : s + Math.abs(p.quantity * cur);
    }, 0);

    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const pnlColor = (n: number) => n >= 0 ? 'var(--color-green)' : 'var(--color-red)';

    const cards: { label: string; value: string; color: string; extra?: React.ReactNode }[] = [
        { label: 'Net Liquidating Value', value: fmt(equity),        color: 'var(--color-text)' },
        { label: 'Cash Balance',          value: fmt(cash),          color: 'var(--color-text)' },
        { label: 'Unrealised P&L',        value: fmt(unrealizedPnl), color: pnlColor(unrealizedPnl) },
        { label: 'Realised P&L',          value: fmt(realizedPnl),   color: pnlColor(realizedPnl) },
        { label: 'Positions Value',       value: fmt(positionsValue), color: 'var(--color-text)' },
        {
            label: 'Gross Exposure',
            value: fmt(grossExposure),
            color: 'var(--color-amber)',
            extra: equity > 0 ? (
                <div style={{ marginTop: 5, background: 'var(--color-bg)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--color-amber)', borderRadius: 3, width: `${Math.min((grossExposure / equity) * 100, 100)}%`, transition: 'width 0.4s' }} />
                </div>
            ) : undefined,
        },
    ];

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Paper Account
                </span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {!live && (
                        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-amber-alt)', border: '1px solid color-mix(in srgb, var(--color-amber-alt) 40%, transparent)', padding: '0 4px', borderRadius: 2 }}>
                            AWAITING ENGINE
                        </span>
                    )}
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-cyan)' }}>{account}</span>
                </span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignContent: 'start' }}>
                {cards.map(card => (
                    <div key={card.label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{card.label}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: card.color, fontWeight: 700 }}>{card.value}</div>
                        {card.extra}
                    </div>
                ))}
            </div>
        </div>
    );
}
