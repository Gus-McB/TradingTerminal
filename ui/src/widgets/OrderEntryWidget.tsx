import React, { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { useOrdersStore, type OrderStatus } from '../stores/ordersStore';
import type { WidgetComponentProps } from './registry';

type Side = 'BUY' | 'SELL';
type OrderType = 'MARKET' | 'LIMIT';  // STOP arrives with the risk engine (Phase 4)
type TimeInForce = 'DAY' | 'GTC' | 'IOC';

const STATUS_COLORS: Record<OrderStatus, string> = {
    PENDING: 'var(--color-amber)', ACCEPTED: 'var(--color-cyan)', FILLED: 'var(--color-green)',
    PARTIALLY_FILLED: 'var(--color-cyan)', RESTING: 'var(--color-accent)', REJECTED: 'var(--color-red)', CANCELED: 'var(--color-text-muted)',
};

export function OrderEntryWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol, addAlert } = useTerminalSync({
        pinSymbol: _c?.pinSymbol as string | undefined,
        linkGroup: _c?.linkGroup as string | undefined,
    });
    const submitOrder = useOrdersStore(s => s.submitOrder);
    const orders = useOrdersStore(s => s.orders);
    const lastOrders = orders.slice(0, 3);

    const [side, setSide] = useState<Side>('BUY');
    const [editSymbol, setEditSymbol] = useState(symbol);

    // Follow the widget's channel (link group / global) when it retargets
    useEffect(() => { setEditSymbol(symbol); }, [symbol]);
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

    const sideColor = side === 'BUY' ? 'var(--color-green)' : 'var(--color-red)';
    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4,
        color: 'var(--color-text)', fontFamily: 'monospace', fontSize: 12, padding: '5px 8px', outline: 'none',
    };
    const labelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', display: 'block', marginBottom: 3 };

    return (
        <div className={className} style={{ background: 'var(--color-surface)', height: '100%', overflow: 'auto', padding: 12 }}>
            {/* Side tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {(['BUY', 'SELL'] as Side[]).map(s => (
                    <button key={s} onClick={() => setSide(s)} style={{
                        flex: 1, padding: '7px 0', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                        background: side === s ? (s === 'BUY' ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)') : 'transparent',
                        color: side === s ? (s === 'BUY' ? 'var(--color-green)' : 'var(--color-red)') : 'var(--color-text-muted)',
                        borderRight: s === 'BUY' ? '1px solid var(--color-border)' : 'none',
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--color-bg)', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)' }}>Est. Cost</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text)' }}>{estCost}</span>
                    </div>
                )}

                <button type="submit" style={{
                    padding: '9px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: side === 'BUY' ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)',
                    color: sideColor, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                    borderTop: `1px solid ${sideColor}`,
                }}>
                    Place {side} Order
                </button>
            </form>

            {/* Recent orders — live status + measured round-trip latency */}
            {lastOrders.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                    {lastOrders.map(o => (
                        <div key={o.clientOrderId} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '3px 0', fontFamily: 'monospace', fontSize: 10,
                        }}>
                            <span style={{ color: o.side === 'BUY' ? 'var(--color-green)' : 'var(--color-red)' }}>
                                {o.side} {o.quantity} {o.symbol}
                            </span>
                            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {o.status === 'FILLED' && o.avgFillPrice > 0 && (
                                    <span style={{ color: 'var(--color-text-muted)' }}>@{o.avgFillPrice.toFixed(2)}</span>
                                )}
                                {o.latency.rttMs !== undefined && (
                                    <span style={{ color: 'var(--color-text-muted)' }} title="Measured UI round-trip">
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
