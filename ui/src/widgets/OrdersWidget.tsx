import React, { useState } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useOrdersStore, type OrderRecord, type OrderStatus } from '../stores/ordersStore';
import type { WidgetComponentProps } from './registry';

type Filter = 'All' | 'Open' | 'Filled' | 'Rejected';

const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'RESTING', 'PARTIALLY_FILLED'];

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: '#ffaa00', ACCEPTED: '#00f0ff', FILLED: '#00ff6a',
    PARTIALLY_FILLED: '#00f0ff', RESTING: '#00a8ff', REJECTED: '#ff3366', CANCELED: '#6a6a7a',
};

function matchesFilter(order: OrderRecord, filter: Filter): boolean {
    switch (filter) {
        case 'All':      return true;
        case 'Open':     return OPEN_STATUSES.includes(order.status);
        case 'Filled':   return order.status === 'FILLED';
        case 'Rejected': return order.status === 'REJECTED' || order.status === 'CANCELED';
    }
}

export function OrdersWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const orders = useOrdersStore(s => s.orders);
    const [filter, setFilter] = useState<Filter>('All');

    const visible = orders.filter(o => matchesFilter(o, filter));

    const colHdr: React.CSSProperties = { fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', padding: '3px 8px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a3a', fontWeight: 400, textAlign: 'left' };
    const cell: React.CSSProperties = { fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', padding: '5px 8px', borderBottom: '1px solid #1a1a26' };

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 2, padding: '6px 8px', background: '#12121a', borderBottom: '1px solid #2a2a3a' }}>
                {(['All', 'Open', 'Filled', 'Rejected'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '3px 10px', fontFamily: 'monospace', fontSize: 11, border: '1px solid', cursor: 'pointer', borderRadius: 3,
                        borderColor: filter === f ? '#2a2a3a' : 'transparent',
                        background: filter === f ? '#1a1a26' : 'transparent',
                        color: filter === f ? '#e0e0e8' : '#6a6a7a',
                    }}>{f}</button>
                ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {visible.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4a4a5a' }}>
                            No orders yet — place one from the Order Entry widget
                        </span>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Time', 'Symbol', 'Side', 'Type', 'Qty', 'Filled', 'Avg Px', 'RTT', 'Status'].map(h => (
                                    <th key={h} style={colHdr}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(o => (
                                <tr key={o.clientOrderId} title={o.reason}>
                                    <td style={{ ...cell, color: '#6a6a7a' }}>
                                        {new Date(o.submittedAt).toLocaleTimeString('en-US', { hour12: false })}
                                    </td>
                                    <td style={{ ...cell, color: '#00f0ff' }}>{o.symbol}</td>
                                    <td style={{ ...cell, color: o.side === 'BUY' ? '#00ff6a' : '#ff3366' }}>{o.side}</td>
                                    <td style={cell}>{o.type}{o.limitPrice ? ` @${o.limitPrice}` : ''}</td>
                                    <td style={cell}>{o.quantity}</td>
                                    <td style={cell}>{o.filledQuantity > 0 ? o.filledQuantity.toFixed(4) : '—'}</td>
                                    <td style={cell}>{o.avgFillPrice > 0 ? o.avgFillPrice.toFixed(2) : '—'}</td>
                                    <td style={{ ...cell, color: '#6a6a7a' }}>
                                        {o.latency.rttMs !== undefined ? `${o.latency.rttMs}ms` : '—'}
                                    </td>
                                    <td style={cell}>
                                        <span style={{
                                            padding: '1px 7px', borderRadius: 3, fontSize: 10,
                                            color: STATUS_COLORS[o.status],
                                            border: `1px solid ${STATUS_COLORS[o.status]}`,
                                            background: STATUS_COLORS[o.status] + '15',
                                        }}>{o.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
