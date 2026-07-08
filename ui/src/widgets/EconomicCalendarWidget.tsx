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

const IMPACT_COLORS: Record<Impact, string> = { H: 'var(--color-red)', M: 'var(--color-amber)', L: 'var(--color-green)' };

export function EconomicCalendarWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();

    const colHdr: React.CSSProperties = { fontFamily:'monospace', fontSize:10, color:'var(--color-text-muted)', padding:'3px 8px', textTransform:'uppercase', borderBottom:'1px solid var(--color-border)', fontWeight:400, textAlign:'left' };
    const cell: React.CSSProperties = { fontFamily:'monospace', fontSize:11, color:'var(--color-text)', padding:'5px 8px', borderBottom:'1px solid var(--color-row)' };

    return (
        <div className={className} style={{ background:'var(--color-bg)', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'5px 10px', background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)' }}>
                <span style={{ fontFamily:'monospace', fontSize:11, color:'var(--color-text-muted)', textTransform:'uppercase' }}>Economic Calendar (ET)</span>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr>
                        {['Time','CCY','Event','Impact','Forecast','Previous'].map(h => <th key={h} style={colHdr}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                        {EVENTS.map((ev, i) => (
                            <tr key={i}>
                                <td style={{ ...cell, color:'var(--color-text-muted)' }}>{ev.time}</td>
                                <td style={{ ...cell, color:'var(--color-cyan)' }}>{ev.currency}</td>
                                <td style={{ ...cell, maxWidth:180, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.event}</td>
                                <td style={cell}>
                                    <span style={{ padding:'1px 6px', borderRadius:2, fontSize:10, fontWeight:700, color: IMPACT_COLORS[ev.impact], border:`1px solid ${IMPACT_COLORS[ev.impact]}` }}>
                                        {ev.impact}
                                    </span>
                                </td>
                                <td style={{ ...cell, color:'var(--color-amber)' }}>{ev.forecast}</td>
                                <td style={{ ...cell, color:'var(--color-text-muted)' }}>{ev.previous}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
