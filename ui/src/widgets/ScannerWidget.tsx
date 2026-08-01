import React, { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

interface ScanRow { symbol: string; price: number; change: number; volume: string; signal: string; }

const DATA: Record<string, ScanRow[]> = {
    'Top Gainers': [
        { symbol:'SMCI', price:878.50, change:14.32, volume:'12.4M', signal:'BREAKOUT' },
        { symbol:'MSTR', price:1642.00, change:9.87, volume:'8.1M', signal:'MOMENTUM' },
        { symbol:'COIN', price:232.40, change:7.44, volume:'22.3M', signal:'VOLUME' },
        { symbol:'NVDA', price:912.00, change:6.21, volume:'45.6M', signal:'TREND' },
        { symbol:'PLTR', price:24.80, change:5.93, volume:'67.2M', signal:'BREAKOUT' },
        { symbol:'TSLA', price:189.50, change:4.78, volume:'112M', signal:'MOMENTUM' },
        { symbol:'AMD', price:183.20, change:4.12, volume:'38.9M', signal:'TREND' },
        { symbol:'RIVN', price:12.40, change:3.99, volume:'31.4M', signal:'VOLUME' },
    ],
    'Top Losers': [
        { symbol:'BIDU', price:98.30, change:-8.44, volume:'6.2M', signal:'BREAKDOWN' },
        { symbol:'NFLX', price:598.10, change:-6.32, volume:'9.1M', signal:'SELL' },
        { symbol:'META', price:472.00, change:-5.18, volume:'14.8M', signal:'REVERSAL' },
        { symbol:'SNAP', price:11.20, change:-4.79, volume:'48.1M', signal:'BREAKDOWN' },
        { symbol:'PYPL', price:63.40, change:-4.21, volume:'19.3M', signal:'SELL' },
        { symbol:'UBER', price:68.90, change:-3.88, volume:'22.1M', signal:'REVERSAL' },
        { symbol:'LYFT', price:14.50, change:-3.44, volume:'17.9M', signal:'BREAKDOWN' },
        { symbol:'PINS', price:32.10, change:-3.02, volume:'8.8M', signal:'SELL' },
    ],
    'High Volume': [
        { symbol:'SPY',  price:524.80, change:0.43, volume:'214M', signal:'NEUTRAL' },
        { symbol:'TSLA', price:189.50, change:1.22, volume:'112M', signal:'WATCH' },
        { symbol:'QQQ',  price:448.20, change:0.67, volume:'88M',  signal:'NEUTRAL' },
        { symbol:'AAPL', price:183.10, change:0.31, volume:'78M',  signal:'NEUTRAL' },
        { symbol:'AMZN', price:184.90, change:1.09, volume:'52M',  signal:'WATCH' },
        { symbol:'MSFT', price:421.50, change:0.88, volume:'44M',  signal:'NEUTRAL' },
        { symbol:'AMD',  price:183.20, change:2.11, volume:'39M',  signal:'WATCH' },
        { symbol:'GOOG', price:172.60, change:0.54, volume:'36M',  signal:'NEUTRAL' },
    ],
    'Near High': [
        { symbol:'NVDA',  price:912.00, change:1.21, volume:'45M', signal:'ATH' },
        { symbol:'META',  price:502.00, change:0.89, volume:'13M', signal:'NEAR_HIGH' },
        { symbol:'BRK.B', price:410.50, change:0.22, volume:'4M',  signal:'NEAR_HIGH' },
        { symbol:'LLY',   price:782.30, change:1.44, volume:'3M',  signal:'ATH' },
        { symbol:'AVGO',  price:1362.00,change:2.01, volume:'5M',  signal:'ATH' },
        { symbol:'SMCI',  price:878.50, change:3.44, volume:'12M', signal:'ATH' },
        { symbol:'GE',    price:162.40, change:0.77, volume:'8M',  signal:'NEAR_HIGH' },
        { symbol:'AXON',  price:302.10, change:1.33, volume:'3M',  signal:'NEAR_HIGH' },
    ],
    'Near Low': [
        { symbol:'BIDU', price:98.30,  change:-2.44, volume:'6M',  signal:'NEAR_LOW' },
        { symbol:'PYPL', price:63.40,  change:-1.21, volume:'19M', signal:'NEAR_LOW' },
        { symbol:'ETSY', price:58.90,  change:-0.88, volume:'4M',  signal:'NEAR_LOW' },
        { symbol:'SNAP', price:11.20,  change:-2.79, volume:'48M', signal:'NEAR_LOW' },
        { symbol:'RBLX', price:28.50,  change:-1.44, volume:'11M', signal:'NEAR_LOW' },
        { symbol:'HOOD', price:18.20,  change:-0.92, volume:'9M',  signal:'NEAR_LOW' },
        { symbol:'WISH', price:4.10,   change:-1.11, volume:'7M',  signal:'NEAR_LOW' },
        { symbol:'BYND', price:7.80,   change:-3.02, volume:'3M',  signal:'NEAR_LOW' },
    ],
};

const SIG_COLORS: Record<string, string> = {
    BREAKOUT:'var(--color-cyan)', MOMENTUM:'var(--color-green)', VOLUME:'var(--color-amber)', TREND:'#a78bfa',
    BREAKDOWN:'var(--color-red)', SELL:'var(--color-red)', REVERSAL:'#fb923c',
    NEUTRAL:'var(--color-text-muted)', WATCH:'var(--color-amber)', ATH:'var(--color-green)', NEAR_HIGH:'var(--color-green)',
    NEAR_LOW:'var(--color-red)',
};

export function ScannerWidget({ widgetId: _w, workspaceId: _ws, config, className }: WidgetComponentProps) {
    useTerminalSync();
    const preset = (config.preset as string) || 'Top Gainers';
    const base = DATA[preset] ?? DATA['Top Gainers'];
    const [rows, setRows] = useState<ScanRow[]>(base);

    useEffect(() => {
        setRows(base.map(r => ({ ...r })));
        const id = setInterval(() => {
            setRows(prev => prev.map(r => ({
                ...r,
                price: parseFloat((r.price * (1 + (Math.random() - 0.499) * 0.002)).toFixed(2)),
                change: parseFloat((r.change + (Math.random() - 0.499) * 0.1).toFixed(2)),
            })));
        }, 5000);
        return () => clearInterval(id);
    }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

    const colHdr: React.CSSProperties = { fontFamily:'monospace', fontSize:10, color:'var(--color-text-muted)', padding:'3px 8px', textTransform:'uppercase', borderBottom:'1px solid var(--color-border)', fontWeight:400 };
    const cell: React.CSSProperties = { fontFamily:'monospace', fontSize:12, color:'var(--color-text)', padding:'5px 8px', borderBottom:'1px solid var(--color-row)' };

    return (
        <div className={className} style={{ background:'var(--color-bg)', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'5px 10px', background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--color-cyan)' }}>{preset}</span>
                <span style={{ fontFamily:'monospace', fontSize:10, color:'var(--color-text-muted)' }}>LIVE</span>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>
                        {['Symbol','Price','Chg%','Volume','Signal'].map(h => <th key={h} style={colHdr}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.symbol}>
                                <td style={{ ...cell, color:'var(--color-cyan)' }}>{r.symbol}</td>
                                <td style={cell}>{r.price.toFixed(2)}</td>
                                <td style={{ ...cell, color: r.change >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                                    {r.change >= 0 ? '+' : ''}{r.change.toFixed(2)}%
                                </td>
                                <td style={{ ...cell, color:'var(--color-text-muted)' }}>{r.volume}</td>
                                <td style={cell}>
                                    <span style={{ fontSize:10, padding:'1px 6px', borderRadius:2, color: SIG_COLORS[r.signal]??'var(--color-text-muted)', border:`1px solid ${SIG_COLORS[r.signal]??'var(--color-text-muted)'}` }}>
                                        {r.signal}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
