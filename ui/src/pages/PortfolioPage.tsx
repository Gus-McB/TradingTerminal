/**
 * PortfolioPage — full-page account view backed by the engine's paper account.
 *
 * Everything here is live matcher state (cash, positions, realized P&L) with
 * unrealized P&L derived from live tickers. Exposure is grouped by market so
 * a multi-market book reads honestly.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { useAccountStore } from '../stores/accountStore';
import { useTerminalStore } from '../stores/terminalStore';
import { useTickerList } from '../services/marketData';
import { formatPrice, resolveInstrument, ASSET_CLASS_LABELS, getSessionStatus } from '@shared/instruments';
import { SESSION_COLORS } from '../hooks/useSessionStatus';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PortfolioPage() {
    const navigate = useNavigate();
    const setSymbol = useTerminalStore(s => s.setSymbol);
    const cash = useAccountStore(s => s.cash);
    const realizedPnl = useAccountStore(s => s.realizedPnl);
    const positions = useAccountStore(s => s.positions);
    const live = useAccountStore(s => s.live);
    const tickers = useTickerList();

    const priceOf = (symbol: string) => tickers.find(t => t.symbol === symbol)?.price;

    const rows = useMemo(() => positions.map(p => {
        const instrument = resolveInstrument(p.symbol);
        const current = priceOf(p.symbol);
        const marketValue = current !== undefined ? p.quantity * current : 0;
        const unrealized = current !== undefined && p.quantity !== 0
            ? (current - p.avgPrice) * p.quantity : 0;
        const costBasis = Math.abs(p.quantity * p.avgPrice);
        return {
            ...p, instrument, current, marketValue, unrealized,
            unrealizedPct: costBasis > 0 ? (unrealized / costBasis) * 100 : 0,
        };
    }), [positions, tickers]); // eslint-disable-line react-hooks/exhaustive-deps

    const openRows = rows.filter(r => r.quantity !== 0);
    const positionsValue = rows.reduce((s, r) => s + r.marketValue, 0);
    const unrealizedTotal = rows.reduce((s, r) => s + r.unrealized, 0);
    const equity = cash + positionsValue;
    const grossExposure = rows.reduce((s, r) => s + Math.abs(r.marketValue), 0);

    /** Exposure grouped by asset class — the multi-market view */
    const byAssetClass = useMemo(() => {
        const groups = new Map<string, number>();
        for (const r of openRows) {
            const key = r.instrument.assetClass;
            groups.set(key, (groups.get(key) ?? 0) + Math.abs(r.marketValue));
        }
        return [...groups.entries()].sort((a, b) => b[1] - a[1]);
    }, [openRows]);

    const cardStyle: React.CSSProperties = {
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 6, padding: '10px 14px', flex: 1, minWidth: 150,
    };
    const th: React.CSSProperties = {
        fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)',
        padding: '6px 10px', textTransform: 'uppercase', textAlign: 'right',
        borderBottom: '1px solid var(--color-border)', fontWeight: 400, whiteSpace: 'nowrap',
    };
    const td = (color = 'var(--color-text)'): React.CSSProperties => ({
        fontFamily: 'monospace', fontSize: 12, color, padding: '7px 10px',
        textAlign: 'right', borderBottom: '1px solid var(--color-row)',
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 shrink-0"
                style={{ height: 40, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
            >
                <Briefcase size={14} color="var(--color-accent)" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-bright)' }}>
                    PORTFOLIO
                </span>
                {!live && (
                    <span style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-amber-alt)',
                        border: '1px solid color-mix(in srgb, var(--color-amber-alt) 40%, transparent)',
                        padding: '0 5px', borderRadius: 2,
                    }}>
                        AWAITING ENGINE
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
                {/* Summary cards */}
                <div className="flex flex-wrap gap-3" style={{ marginBottom: 18 }}>
                    {[
                        { label: 'Net Liquidating Value', value: money(equity), color: 'var(--color-text-bright)' },
                        { label: 'Cash', value: money(cash), color: 'var(--color-text)' },
                        { label: 'Positions Value', value: money(positionsValue), color: 'var(--color-text)' },
                        { label: 'Unrealised P&L', value: money(unrealizedTotal), color: unrealizedTotal >= 0 ? 'var(--color-green)' : 'var(--color-red)' },
                        { label: 'Realised P&L', value: money(realizedPnl), color: realizedPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)' },
                        { label: 'Gross Exposure', value: money(grossExposure), color: 'var(--color-amber)' },
                    ].map(card => (
                        <div key={card.label} style={cardStyle}>
                            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 5 }}>
                                {card.label}
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: card.color }}>
                                {card.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Exposure by market */}
                {byAssetClass.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                            EXPOSURE BY MARKET
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {byAssetClass.map(([assetClass, value]) => (
                                <div key={assetClass} className="flex items-center gap-3">
                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-secondary)', width: 90 }}>
                                        {ASSET_CLASS_LABELS[assetClass as keyof typeof ASSET_CLASS_LABELS]}
                                    </span>
                                    <div style={{ flex: 1, height: 6, background: 'var(--color-surface)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 3, background: 'var(--color-accent)',
                                            width: `${grossExposure > 0 ? (value / grossExposure) * 100 : 0}%`,
                                        }} />
                                    </div>
                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text)', width: 110, textAlign: 'right' }}>
                                        {money(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Positions table */}
                <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    POSITIONS
                </div>
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1" style={{ padding: '40px 0' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-faint)' }}>
                            No positions
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-border-strong)' }}>
                            Fills from the paper matcher appear here
                        </span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ ...th, textAlign: 'left' }}>Symbol</th>
                                <th style={{ ...th, textAlign: 'left' }}>Market</th>
                                <th style={th}>Side</th>
                                <th style={th}>Qty</th>
                                <th style={th}>Avg Price</th>
                                <th style={th}>Last</th>
                                <th style={th}>Market Value</th>
                                <th style={th}>Unreal P&L</th>
                                <th style={th}>Unreal %</th>
                                <th style={th}>Real P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const flat = r.quantity === 0;
                                const session = getSessionStatus(r.symbol);
                                const pnlColor = r.unrealized >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                                return (
                                    <tr
                                        key={r.symbol}
                                        onClick={() => { setSymbol(r.symbol); navigate('/'); }}
                                        style={{ cursor: 'pointer', opacity: flat ? 0.5 : 1 }}
                                    >
                                        <td style={{ ...td('var(--color-cyan)'), textAlign: 'left' }}>{r.symbol}</td>
                                        <td style={{ ...td('var(--color-text-muted)'), textAlign: 'left', fontSize: 10 }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                {ASSET_CLASS_LABELS[r.instrument.assetClass]}
                                                <span style={{
                                                    width: 5, height: 5, borderRadius: '50%',
                                                    background: SESSION_COLORS[session],
                                                }} title={`Session ${session}`} />
                                            </span>
                                        </td>
                                        <td style={td(flat ? 'var(--color-text-muted)' : r.quantity > 0 ? 'var(--color-green)' : 'var(--color-red)')}>
                                            {flat ? '—' : r.quantity > 0 ? 'LONG' : 'SHORT'}
                                        </td>
                                        <td style={td()}>{flat ? '—' : Math.abs(r.quantity).toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                                        <td style={td()}>{flat ? '—' : formatPrice(r.instrument, r.avgPrice)}</td>
                                        <td style={td()}>{r.current !== undefined ? formatPrice(r.instrument, r.current) : '—'}</td>
                                        <td style={td()}>{flat ? '—' : money(r.marketValue)}</td>
                                        <td style={td(flat ? 'var(--color-text-muted)' : pnlColor)}>
                                            {flat ? '—' : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                                                    {r.unrealized >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                    {signed(r.unrealized)}
                                                </span>
                                            )}
                                        </td>
                                        <td style={td(flat ? 'var(--color-text-muted)' : pnlColor)}>
                                            {flat ? '—' : `${signed(r.unrealizedPct)}%`}
                                        </td>
                                        <td style={td(r.realizedPnl >= 0 ? 'var(--color-green)' : 'var(--color-red)')}>
                                            {signed(r.realizedPnl)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
