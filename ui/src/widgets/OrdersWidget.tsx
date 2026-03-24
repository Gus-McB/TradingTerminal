import React, { useState } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

type Status = 'Open' | 'Filled' | 'Cancelled';
interface Order { id: string; time: string; symbol: string; side: 'BUY' | 'SELL'; type: string; qty: number; price: string; status: Status; }

const MOCK_ORDERS: Order[] = [
    { id: '1', time: '09:31:42', symbol: 'BTC/USD',  side: 'BUY',  type: 'LIMIT',  qty: 0.25, price: '62500.00', status: 'Open'      },
    { id: '2', time: '09:28:15', symbol: 'ETH/USD',  side: 'SELL', type: 'LIMIT',  qty: 2.0,  price: '3250.00',  status: 'Open'      },
    { id: '3', time: '09:15:03', symbol: 'NVDA',     side: 'BUY',  type: 'MARKET', qty: 10,   price: 'MKT',      status: 'Filled'    },
    { id: '4', time: '09:10:55', symbol: 'SOL/USD',  side: 'SELL', type: 'STOP',   qty: 5,    price: '140.00',   status: 'Filled'    },
    { id: '5', time: '09:05:22', symbol: 'DOGE/USD', side: 'BUY',  type: 'LIMIT',  qty: 1000, price: '0.1680',   status: 'Cancelled' },
    { id: '6', time: '08:58:01', symbol: 'AAPL',     side: 'BUY',  type: 'LIMIT',  qty: 15,   price: '182.50',   status: 'Filled'    },
];

const STATUS_COLORS: Record<Status, string> = { Open: '#00f0ff', Filled: '#00ff6a', Cancelled: '#6a6a7a' };

export function OrdersWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const [filter, setFilter] = useState<'All' | Status>('All');

    const visible = MOCK_ORDERS.filter(o => filter === 'All' || o.status === filter);

    const colHdr: React.CSSProperties = { fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', padding: '3px 8px', textTransform: 'uppercase', borderBottom: '1px solid #2a2a3a', fontWeight: 400, textAlign: 'left' };
    const cell: React.CSSProperties = { fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', padding: '5px 8px', borderBottom: '1px solid #1a1a26' };

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 2, padding: '6px 8px', background: '#12121a', borderBottom: '1px solid #2a2a3a' }}>
                {(['All', 'Open', 'Filled', 'Cancelled'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '3px 10px', fontFamily: 'monospace', fontSize: 11, border: '1px solid', cursor: 'pointer', borderRadius: 3,
                        borderColor: filter === f ? '#2a2a3a' : 'transparent',
                        background: filter === f ? '#1a1a26' : 'transparent',
                        color: filter === f ? '#e0e0e8' : '#6a6a7a',
                    }}>{f}</button>
                ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Time','Symbol','Side','Type','Qty','Price','Status'].map(h => (
                                <th key={h} style={colHdr}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map(o => (
                            <tr key={o.id}>
                                <td style={{ ...cell, color: '#6a6a7a' }}>{o.time}</td>
                                <td style={{ ...cell, color: '#00f0ff' }}>{o.symbol}</td>
                                <td style={{ ...cell, color: o.side === 'BUY' ? '#00ff6a' : '#ff3366' }}>{o.side}</td>
                                <td style={cell}>{o.type}</td>
                                <td style={cell}>{o.qty}</td>
                                <td style={cell}>{o.price}</td>
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
            </div>
        </div>
    );
}
