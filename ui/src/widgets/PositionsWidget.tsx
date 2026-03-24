import React, { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

interface Position { symbol: string; side: 'LONG' | 'SHORT'; qty: number; avgPrice: number; currentPrice: number; }

const SEED: Position[] = [
    { symbol: 'BTC/USD',  side: 'LONG',  qty: 0.5,  avgPrice: 61200.00, currentPrice: 63450.00 },
    { symbol: 'ETH/USD',  side: 'LONG',  qty: 4.2,  avgPrice: 3280.00,  currentPrice: 3195.00  },
    { symbol: 'NVDA',     side: 'LONG',  qty: 20,   avgPrice: 875.00,   currentPrice: 912.50   },
    { symbol: 'SOL/USD',  side: 'SHORT', qty: 12,   avgPrice: 148.00,   currentPrice: 143.50   },
];

const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PositionsWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const [positions, setPositions] = useState<Position[]>(SEED);

    useEffect(() => {
        const id = setInterval(() => {
            setPositions(prev => prev.map(p => ({
                ...p,
                currentPrice: parseFloat((p.currentPrice * (1 + (Math.random() - 0.499) * 0.003)).toFixed(2)),
            })));
        }, 2000);
        return () => clearInterval(id);
    }, []);

    const pnlOf = (p: Position) => {
        const mult = p.side === 'LONG' ? 1 : -1;
        return mult * (p.currentPrice - p.avgPrice) * p.qty;
    };
    const totalPnl = positions.reduce((s, p) => s + pnlOf(p), 0);

    const colHdr = { fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a', padding: '3px 8px', textTransform: 'uppercase' as const, borderBottom: '1px solid #2a2a3a', textAlign: 'right' as const, fontWeight: 400 };
    const cell = (color = '#e0e0e8'): React.CSSProperties => ({ fontFamily: 'monospace', fontSize: 12, color, padding: '5px 8px', textAlign: 'right', borderBottom: '1px solid #1a1a26' });

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['Symbol','Side','Qty','Avg Price','Curr Price','P&L','P&L%'].map(h => (
                                <th key={h} style={colHdr}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map(p => {
                            const pnl = pnlOf(p);
                            const pnlPct = ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100 * (p.side === 'SHORT' ? -1 : 1);
                            const pnlColor = pnl >= 0 ? '#00ff6a' : '#ff3366';
                            return (
                                <tr key={p.symbol}>
                                    <td style={{ ...cell('#00f0ff'), textAlign: 'left' }}>{p.symbol}</td>
                                    <td style={cell(p.side === 'LONG' ? '#00ff6a' : '#ff3366')}>{p.side}</td>
                                    <td style={cell()}>{p.qty}</td>
                                    <td style={cell()}>{fmt2(p.avgPrice)}</td>
                                    <td style={cell()}>{fmt2(p.currentPrice)}</td>
                                    <td style={cell(pnlColor)}>{pnl >= 0 ? '+' : ''}{fmt2(pnl)}</td>
                                    <td style={cell(pnlColor)}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* Footer total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#12121a', borderTop: '1px solid #2a2a3a' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a' }}>Total Unrealised P&L</span>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: totalPnl >= 0 ? '#00ff6a' : '#ff3366' }}>
                    {totalPnl >= 0 ? '+' : ''}{fmt2(totalPnl)}
                </span>
            </div>
        </div>
    );
}
