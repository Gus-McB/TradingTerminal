import { useState, useEffect } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

interface Sector { name: string; change: number; cap: number; } // cap in $B

const BASE_SECTORS: Sector[] = [
    { name:'Technology',     change: 1.82, cap: 11200 },
    { name:'Healthcare',     change:-0.43, cap:  4800 },
    { name:'Financials',     change: 0.97, cap:  5200 },
    { name:'Energy',         change:-1.34, cap:  3100 },
    { name:'Consumer Disc.', change: 2.41, cap:  4200 },
    { name:'Industrials',    change: 0.61, cap:  3600 },
    { name:'Comm. Services', change: 1.15, cap:  3900 },
    { name:'Materials',      change:-0.72, cap:  1800 },
    { name:'Real Estate',    change:-2.18, cap:  1200 },
    { name:'Utilities',      change:-0.38, cap:  1400 },
    { name:'Cons. Staples',  change: 0.22, cap:  2900 },
    { name:'Crypto',         change: 4.12, cap:  2400 },
    { name:'Semiconductors', change: 3.67, cap:  3800 },
    { name:'Biotech',        change:-1.89, cap:  1600 },
];

function tileColor(chg: number): string {
    if (chg >  2) return '#003322';
    if (chg >= 0) return '#001a11';
    if (chg > -2) return '#1a0008';
    return '#330011';
}
function textColor(chg: number): string {
    if (chg >  2) return '#00ff6a';
    if (chg >= 0) return '#00cc55';
    if (chg > -2) return '#cc2244';
    return '#ff3366';
}

const MIN_CAP = Math.min(...BASE_SECTORS.map(s => s.cap));
const MAX_CAP = Math.max(...BASE_SECTORS.map(s => s.cap));

function tileSize(cap: number): number {
    const norm = (cap - MIN_CAP) / (MAX_CAP - MIN_CAP);
    return 64 + norm * 80; // 64–144px
}

export function HeatMapWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const [sectors, setSectors] = useState<Sector[]>(BASE_SECTORS);

    useEffect(() => {
        const id = setInterval(() => {
            setSectors(prev => prev.map(s => ({
                ...s,
                change: parseFloat((s.change + (Math.random() - 0.499) * 0.12).toFixed(2)),
            })));
        }, 3000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: '#12121a', borderBottom: '1px solid #2a2a3a' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a', textTransform: 'uppercase' }}>Sector Heatmap  1D %</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: 4 }}>
                {sectors.map(s => {
                    const size = tileSize(s.cap);
                    return (
                        <div key={s.name} style={{
                            width: size, height: size * 0.72,
                            background: tileColor(s.change),
                            border: `1px solid ${textColor(s.change)}33`,
                            borderRadius: 4,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            padding: 4, boxSizing: 'border-box',
                            transition: 'background 0.4s',
                        }}>
                            <span style={{ fontFamily: 'monospace', fontSize: Math.max(8, size * 0.07), color: '#e0e0e8', textAlign: 'center', lineHeight: 1.2 }}>
                                {s.name}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: Math.max(9, size * 0.085), fontWeight: 700, color: textColor(s.change), marginTop: 2 }}>
                                {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
