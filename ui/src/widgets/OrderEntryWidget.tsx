import React, { useState } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useOrdersStore, type OrderStatus } from '../stores/ordersStore';
import type { WidgetComponentProps } from './registry';

type Side = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';  // STOP arrives with the risk engine (Phase 4)
type TimeInForce = 'DAY' | 'GTC' | 'IOC';

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: '#ffaa00', ACCEPTED: '#00f0ff', FILLED: '#00ff6a',
    PARTIALLY_FILLED: '#00f0ff', RESTING: '#00a8ff', REJECTED: '#ff3366', CANCELED: '#6a6a7a',
};

export function OrderEntryWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol, addAlert } = useTerminalSync();
    const submitOrder = useOrdersStore(s => s.submitOrder);
    const orders = useOrdersStore(s => s.orders);
    const lastOrders = orders.slice(0, 3);

    const [side, setSide] = useState<Side>('BUY');
    const [editSymbol, setEditSymbol] = useState(symbol);
    const [qty, setQty] = useState('1');
    const [orderType, setOrderType] = useState<OrderType>('LIMIT');
    const [price, setPrice] = useState('');
    const [tif, setTif] = useState<TimeInForce>('DAY');

    const needsPrice = orderType === 'LIMIT';
    const estCost = qty && price && !isNaN(Number(qty)) && !isNaN(Number(price))
        ? (Number(qty) * Number(price)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : '—';

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const id = submitOrder({
            symbol: editSymbol,
            side,
            type: orderType,
            quantity: Number(qty),
            limitPrice: needsPrice ? Number(price) : undefined,
        });
        addAlert({
            type: id ? 'info' : 'warn',
            message: id
                ? `${side} ${qty} ${editSymbol} @ ${orderType}${needsPrice ? ' ' + price : ''} submitted`
                : 'Order rejected: not connected to middleware',
        });
    }

    const sideColor = side === 'BUY' ? '#00ff6a' : '#ff3366';
    const inputStyle: React.CSSProperties = {
        width: '100%', background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 4,
        color: '#e0e0e8', fontFamily: 'monospace', fontSize: 12, padding: '5px 8px', outline: 'none',
    };
    const labelStyle: React.CSSProperties = { fontSize: 10, color: '#6a6a7a', fontFamily: 'monospace', textTransform: 'uppercase', display: 'block', marginBottom: 3 };

    return (
        <div className={className} style={{ background: '#12121a', height: '100%', overflow: 'auto', padding: 12 }}>
            {/* Side tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid #2a2a3a' }}>
                {(['BUY', 'SELL'] as Side[]).map(s => (
                    <button key={s} onClick={() => setSide(s)} style={{
                        flex: 1, padding: '7px 0', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                        background: side === s ? (s === 'BUY' ? '#003322' : '#330011') : 'transparent',
                        color: side === s ? (s === 'BUY' ? '#00ff6a' : '#ff3366') : '#6a6a7a',
                        borderRight: s === 'BUY' ? '1px solid #2a2a3a' : 'none',
                    }}>
                        {s}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                    <label style={labelStyle}>Symbol</label>
                    <input style={inputStyle} value={editSymbol} onChange={e => setEditSymbol(e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>Quantity</label>
                    <input style={inputStyle} type="number" min="0" step="any" value={qty} onChange={e => setQty(e.target.value)} />
                </div>
                <div>
                    <label style={labelStyle}>Order Type</label>
                    <select style={inputStyle} value={orderType} onChange={e => setOrderType(e.target.value as OrderType)}>
                        {(['MARKET', 'LIMIT'] as OrderType[]).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                {needsPrice && (
                    <div>
                        <label style={labelStyle}>Price</label>
                        <input style={inputStyle} type="number" step="any" min="0" value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                )}
                <div>
                    <label style={labelStyle}>Time in Force</label>
                    <select style={inputStyle} value={tif} onChange={e => setTif(e.target.value as TimeInForce)}>
                        {(['DAY', 'GTC', 'IOC'] as TimeInForce[]).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {needsPrice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#0a0a0f', borderRadius: 4, border: '1px solid #2a2a3a' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a' }}>Est. Cost</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e0e0e8' }}>{estCost}</span>
                    </div>
                )}

                <button type="submit" style={{
                    padding: '9px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: side === 'BUY' ? '#003322' : '#330011',
                    color: sideColor, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                    borderTop: `1px solid ${sideColor}`,
                }}>
                    Place {side} Order
                </button>
            </form>

            {/* Recent orders — live status + measured round-trip latency */}
            {lastOrders.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #2a2a3a', paddingTop: 8 }}>
                    {lastOrders.map(o => (
                        <div key={o.clientOrderId} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '3px 0', fontFamily: 'monospace', fontSize: 10,
                        }}>
                            <span style={{ color: o.side === 'BUY' ? '#00ff6a' : '#ff3366' }}>
                                {o.side} {o.quantity} {o.symbol}
                            </span>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {o.status === 'FILLED' && o.avgFillPrice > 0 && (
                                    <span style={{ color: '#6a6a7a' }}>@{o.avgFillPrice.toFixed(2)}</span>
                                )}
                                {o.latency.rttMs !== undefined && (
                                    <span style={{ color: '#6a6a7a' }} title="Measured UI round-trip">
                                        {o.latency.rttMs}ms
                                    </span>
                                )}
                                <span style={{ color: STATUS_COLORS[o.status] }}>{o.status}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
