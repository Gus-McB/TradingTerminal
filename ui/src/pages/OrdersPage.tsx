/**
 * OrdersPage — full-page order blotter backed by the live paper matcher.
 *
 * Beyond the Orders widget it adds filtering by status/market/symbol, the
 * measured latency of every order, fill detail, and CSV export.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Download, Search } from 'lucide-react';
import { useOrdersStore, type OrderRecord, type OrderStatus } from '../stores/ordersStore';
import { useTerminalStore } from '../stores/terminalStore';
import { formatPrice, resolveInstrument, ASSET_CLASS_LABELS, type AssetClass } from '@shared/instruments';

type StatusFilter = 'All' | 'Open' | 'Filled' | 'Rejected';

const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'RESTING', 'PARTIALLY_FILLED'];

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: 'var(--color-amber)', ACCEPTED: 'var(--color-cyan)', FILLED: 'var(--color-green)',
    PARTIALLY_FILLED: 'var(--color-cyan)', RESTING: 'var(--color-accent)',
    REJECTED: 'var(--color-red)', CANCELED: 'var(--color-text-muted)',
};

function matchesStatus(order: OrderRecord, filter: StatusFilter): boolean {
    switch (filter) {
        case 'All':      return true;
        case 'Open':     return OPEN_STATUSES.includes(order.status);
        case 'Filled':   return order.status === 'FILLED';
        case 'Rejected': return order.status === 'REJECTED' || order.status === 'CANCELED';
    }
}

function toCsv(orders: OrderRecord[]): string {
    const header = ['Time', 'Symbol', 'Side', 'Type', 'Qty', 'Limit', 'Filled', 'AvgPrice', 'Status', 'RTT_ms', 'Reason'];
    const rows = orders.map(o => [
        new Date(o.submittedAt).toISOString(),
        o.symbol, o.side, o.type, o.quantity, o.limitPrice ?? '',
        o.filledQuantity, o.avgFillPrice || '', o.status,
        o.latency.rttMs ?? '', (o.reason ?? '').replace(/,/g, ';'),
    ]);
    return [header, ...rows].map(r => r.join(',')).join('\n');
}

export function OrdersPage() {
    const navigate = useNavigate();
    const orders = useOrdersStore(s => s.orders);
    const setSymbol = useTerminalStore(s => s.setSymbol);

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [marketFilter, setMarketFilter] = useState<AssetClass | 'all'>('all');
    const [query, setQuery] = useState('');

    const visible = useMemo(() => orders.filter(o => {
        if (!matchesStatus(o, statusFilter)) return false;
        if (marketFilter !== 'all' && resolveInstrument(o.symbol).assetClass !== marketFilter) return false;
        if (query && !o.symbol.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
    }), [orders, statusFilter, marketFilter, query]);

    const exportCsv = () => {
        const blob = new Blob([toCsv(visible)], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filled = visible.filter(o => o.status === 'FILLED');
    const rtts = visible.map(o => o.latency.rttMs).filter((v): v is number => v !== undefined);
    const medianRtt = rtts.length
        ? [...rtts].sort((a, b) => a - b)[Math.floor(rtts.length / 2)]
        : undefined;

    const th: React.CSSProperties = {
        fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)',
        padding: '6px 10px', textTransform: 'uppercase', textAlign: 'left',
        borderBottom: '1px solid var(--color-border)', fontWeight: 400, whiteSpace: 'nowrap',
    };
    const td = (color = 'var(--color-text)'): React.CSSProperties => ({
        fontFamily: 'monospace', fontSize: 12, color, padding: '7px 10px',
        borderBottom: '1px solid var(--color-row)', whiteSpace: 'nowrap',
    });
    const chip = (active: boolean): React.CSSProperties => ({
        padding: '3px 11px', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
        borderRadius: 3, border: '1px solid',
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            {/* Header */}
            <div
                className="flex items-center gap-2 px-4 shrink-0"
                style={{ height: 40, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
            >
                <ClipboardList size={14} color="var(--color-accent)" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-text-bright)' }}>
                    ORDERS
                </span>
                <div style={{ flex: 1 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {visible.length} shown · {filled.length} filled
                    {medianRtt !== undefined && ` · median ${medianRtt}ms`}
                </span>
                <button
                    onClick={exportCsv}
                    disabled={visible.length === 0}
                    className="flex items-center gap-1.5 px-2.5 py-1"
                    style={{
                        fontSize: 11, fontFamily: 'monospace', borderRadius: 3,
                        border: '1px solid var(--color-border)', background: 'transparent',
                        color: visible.length ? 'var(--color-text-secondary)' : 'var(--color-text-dim)',
                        cursor: visible.length ? 'pointer' : 'not-allowed',
                    }}
                    title="Export the filtered blotter as CSV"
                >
                    <Download size={11} /> CSV
                </button>
            </div>

            {/* Filters */}
            <div
                className="flex items-center gap-2 px-4 py-2 shrink-0 flex-wrap"
                style={{ borderBottom: '1px solid var(--color-border)' }}
            >
                {(['All', 'Open', 'Filled', 'Rejected'] as const).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)} style={chip(statusFilter === f)}>{f}</button>
                ))}
                <div style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }} />
                <button onClick={() => setMarketFilter('all')} style={chip(marketFilter === 'all')}>All markets</button>
                {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map(ac => (
                    <button key={ac} onClick={() => setMarketFilter(ac)} style={chip(marketFilter === ac)}>
                        {ASSET_CLASS_LABELS[ac]}
                    </button>
                ))}
                <div style={{ flex: 1 }} />
                <div className="flex items-center gap-1.5" style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '3px 8px',
                }}>
                    <Search size={11} color="var(--color-text-dim)" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Filter symbol…"
                        style={{
                            background: 'transparent', border: 'none', outline: 'none',
                            fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text)', width: 130,
                        }}
                    />
                </div>
            </div>

            {/* Blotter */}
            <div className="flex-1 overflow-auto">
                {visible.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-1">
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-faint)' }}>
                            {orders.length === 0 ? 'No orders yet' : 'No orders match these filters'}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-border-strong)' }}>
                            Place one from an Order Entry widget or Ctrl+K
                        </span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Time', 'Symbol', 'Market', 'Side', 'Type', 'Qty', 'Limit', 'Filled', 'Avg Px', 'RTT', 'Status'].map(h => (
                                    <th key={h} style={th}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(o => {
                                const instrument = resolveInstrument(o.symbol);
                                return (
                                    <tr
                                        key={o.clientOrderId}
                                        title={o.reason}
                                        onClick={() => { setSymbol(o.symbol); navigate('/'); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={td('var(--color-text-muted)')}>
                                            {new Date(o.submittedAt).toLocaleTimeString('en-US', { hour12: false })}
                                        </td>
                                        <td style={td('var(--color-cyan)')}>{o.symbol}</td>
                                        <td style={{ ...td('var(--color-text-muted)'), fontSize: 10 }}>
                                            {ASSET_CLASS_LABELS[instrument.assetClass]}
                                        </td>
                                        <td style={td(o.side === 'BUY' ? 'var(--color-green)' : 'var(--color-red)')}>{o.side}</td>
                                        <td style={td()}>{o.type}</td>
                                        <td style={td()}>{o.quantity}</td>
                                        <td style={td()}>{o.limitPrice ? formatPrice(instrument, o.limitPrice) : '—'}</td>
                                        <td style={td()}>{o.filledQuantity > 0 ? o.filledQuantity.toFixed(4) : '—'}</td>
                                        <td style={td()}>{o.avgFillPrice > 0 ? formatPrice(instrument, o.avgFillPrice) : '—'}</td>
                                        <td style={td('var(--color-text-muted)')}>
                                            {o.latency.rttMs !== undefined ? `${o.latency.rttMs}ms` : '—'}
                                        </td>
                                        <td style={td()}>
                                            <span style={{
                                                padding: '1px 7px', borderRadius: 3, fontSize: 10,
                                                color: STATUS_COLORS[o.status],
                                                border: `1px solid ${STATUS_COLORS[o.status]}`,
                                                background: `color-mix(in srgb, ${STATUS_COLORS[o.status]} 8%, transparent)`,
                                            }}>{o.status}</span>
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
