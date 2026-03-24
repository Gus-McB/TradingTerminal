import React from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

type Impact = 'H' | 'M' | 'L';
interface CalEvent { time: string; currency: string; event: string; impact: Impact; forecast: string; previous: string; }

const EVENTS: CalEvent[] = [
    { time:'08:30', currency:'USD', event:'Non-Farm Payrolls',           impact:'H', forecast:'185K',  previous:'175K'  },
    { time:'08:30', currency:'USD', event:'Core CPI m/m',                impact:'H', forecast:'0.3%',  previous:'0.4%'  },
    { time:'10:00', currency:'USD', event:'ISM Manufacturing PMI',       impact:'M', forecast:'50.2',  previous:'49.8'  },
    { time:'10:00', currency:'USD', event:'JOLTS Job Openings',          impact:'M', forecast:'8.75M', previous:'8.86M' },
    { time:'14:00', currency:'USD', event:'FOMC Meeting Minutes',        impact:'H', forecast:'—',     previous:'—'     },
    { time:'08:30', currency:'CAD', event:'GDP m/m',                     impact:'H', forecast:'0.2%',  previous:'0.1%'  },
    { time:'10:30', currency:'USD', event:'Crude Oil Inventories',       impact:'M', forecast:'-1.2M', previous:'+3.4M' },
    { time:'19:00', currency:'JPY', event:'BoJ Interest Rate Decision',  impact:'H', forecast:'0.10%', previous:'0.10%' },
];

const IMPACT_COLORS: Record<Impact, string> = { H: '#ff3366', M: '#ffaa00', L: '#00ff6a' };

export function EconomicCalendarWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();

    const colHdr: React.CSSProperties = { fontFamily:'monospace', fontSize:10, color:'#6a6a7a', padding:'3px 8px', textTransform:'uppercase', borderBottom:'1px solid #2a2a3a', fontWeight:400, textAlign:'left' };
    const cell: React.CSSProperties = { fontFamily:'monospace', fontSize:11, color:'#e0e0e8', padding:'5px 8px', borderBottom:'1px solid #1a1a26' };

    return (
        <div className={className} style={{ background:'#0a0a0f', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'5px 10px', background:'#12121a', borderBottom:'1px solid #2a2a3a' }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'#6a6a7a', textTransform:'uppercase' }}>Economic Calendar (ET)</span>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>
                        {['Time','CCY','Event','Impact','Forecast','Previous'].map(h => <th key={h} style={colHdr}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {EVENTS.map((ev, i) => (
                            <tr key={i}>
                                <td style={{ ...cell, color:'#6a6a7a' }}>{ev.time}</td>
                                <td style={{ ...cell, color:'#00f0ff' }}>{ev.currency}</td>
                                <td style={{ ...cell, maxWidth:180, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.event}</td>
                                <td style={cell}>
                                    <span style={{ padding:'1px 6px', borderRadius:2, fontSize:10, fontWeight:700, color: IMPACT_COLORS[ev.impact], border:`1px solid ${IMPACT_COLORS[ev.impact]}` }}>
                                        {ev.impact}
                                    </span>
                                </td>
                                <td style={{ ...cell, color:'#ffaa00' }}>{ev.forecast}</td>
                                <td style={{ ...cell, color:'#6a6a7a' }}>{ev.previous}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
