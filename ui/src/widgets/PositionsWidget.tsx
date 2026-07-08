import React from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useAccountStore } from '../stores/accountStore';
import { useTickerList } from '../services/marketData';
import type { WidgetComponentProps } from './registry';

const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PositionsWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { setSymbol } = useTerminalSync({ linkGroup: _c?.linkGroup as string | undefined });
    const positions = useAccountStore(s => s.positions);
    const live = useAccountStore(s => s.live);
    const tickers = useTickerList();

    const priceOf = (symbol: string) => tickers.find(t => t.symbol === symbol)?.price;

    // Open positions first; flat rows (realized-only) after
    const rows = [...positions].sort((a, b) =>
        Math.abs(b.quantity) - Math.abs(a.quantity) || a.symbol.localeCompare(b.symbol));

    const unrealizedOf = (qty: number, avg: number, cur?: number) =>
        cur === undefined || qty === 0 ? 0 : (cur - avg) * qty;

    const totalUnrealized = rows.reduce(
        (s, p) => s + unrealizedOf(p.quantity, p.avgPrice, priceOf(p.symbol)), 0);

    const colHdr = { fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', padding: '3px 8px', textTransform: 'uppercase' as const, borderBottom: '1px solid var(--color-border)', textAlign: 'right' as const, fontWeight: 400 };
    const cell = (color = 'var(--color-text)'): React.CSSProperties => ({ fontFamily: 'monospace', fontSize: 12, color, padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid var(--color-row)' });

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {rows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-1">
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-faint)' }}>
                            No positions
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-border-strong)' }}>
                            {live ? 'Fills from the paper matcher appear here' : 'Waiting for engine account state…'}
                        </span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Symbol', 'Side', 'Qty', 'Avg Price', 'Curr Price', 'Unreal P&L', 'Real P&L'].map(h => (
                                    <th key={h} style={colHdr}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(p => {
                                const cur = priceOf(p.symbol);
                                const flat = p.quantity === 0;
                                const side = flat ? '—' : p.quantity > 0 ? 'LONG' : 'SHORT';
                                const upnl = unrealizedOf(p.quantity, p.avgPrice, cur);
                                const upnlColor = upnl >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                                const rpnlColor = p.realizedPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                                return (
                                    <tr key={p.symbol} onClick={() => setSymbol(p.symbol)} style={{ cursor: 'pointer', opacity: flat ? 0.55 : 1 }}>
                                        <td style={{ ...cell('var(--color-cyan)'), textAlign: 'left' }}>{p.symbol}</td>
                                        <td style={cell(flat ? 'var(--color-text-muted)' : p.quantity > 0 ? 'var(--color-green)' : 'var(--color-red)')}>{side}</td>
                                        <td style={cell()}>{flat ? '—' : Math.abs(p.quantity).toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                                        <td style={cell()}>{flat ? '—' : fmt2(p.avgPrice)}</td>
                                        <td style={cell()}>{cur !== undefined ? fmt2(cur) : '—'}</td>
                                        <td style={cell(flat ? 'var(--color-text-muted)' : upnlColor)}>{flat ? '—' : `${upnl >= 0 ? '+' : ''}${fmt2(upnl)}`}</td>
                                        <td style={cell(rpnlColor)}>{p.realizedPnl >= 0 ? '+' : ''}{fmt2(p.realizedPnl)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {/* Footer total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>Total Unrealised P&L</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: totalUnrealized >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {totalUnrealized >= 0 ? '+' : ''}{fmt2(totalUnrealized)}
                </span>
            </div>
        </div>
    );
}
