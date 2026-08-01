import { useState } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

interface NewsItem { id: number; headline: string; body: string; source: string; time: string; category: string; important: boolean; }

const NEWS: NewsItem[] = [
    { id:1, headline:'Fed signals potential rate pause as inflation cools toward 2% target', body:'Federal Reserve officials indicated a pause in rate hikes may be appropriate as core PCE data showed further moderation. Markets priced a 78% chance of no action at the next meeting.', source:'Reuters', time:'09:45', category:'MACRO', important:true },
    { id:2, headline:'Bitcoin surges past $63,000 as ETF inflows hit weekly record', body:'Spot Bitcoin ETFs recorded $1.2B in net inflows this week, the highest since launch. Analysts cite institutional re-allocation from gold.', source:'Bloomberg', time:'09:32', category:'CRYPTO', important:true },
    { id:3, headline:'NVIDIA Q1 earnings beat estimates; data-center revenue up 427% YoY', body:'NVIDIA reported Q1 revenue of $26B, smashing the $24.6B consensus. Data-center segment alone contributed $22.6B driven by H100 GPU demand.', source:'MarketWatch', time:'09:15', category:'EARNINGS', important:false },
    { id:4, headline:'ECB holds rates steady, Lagarde cautious on June cut timeline', body:'The European Central Bank left its key rate at 4.0% and President Lagarde stopped short of committing to a June reduction, citing wage growth concerns.', source:'CNBC', time:'08:58', category:'MACRO', important:false },
    { id:5, headline:'Apple plans AI-powered Siri overhaul ahead of WWDC reveal', body:'Internal documents and supply-chain sources indicate Apple will unveil a generative AI layer for Siri at its annual developer conference, powered by on-device LLMs.', source:'Bloomberg', time:'08:40', category:'TECH', important:false },
    { id:6, headline:'Oil retreats on rising US inventory data; WTI below $78', body:'EIA data showed a surprise build of 4.2M barrels, pushing WTI crude down 1.3% to $77.85. OPEC+ production compliance remains above 90%.', source:'Reuters', time:'08:22', category:'COMMODITIES', important:false },
    { id:7, headline:'Tesla Autopilot probe widened by NHTSA to 2.5M vehicles', body:'The National Highway Traffic Safety Administration expanded its probe into Tesla Autopilot after 20 additional incidents were reported. Shares fell 2.1% in pre-market.', source:'MarketWatch', time:'07:55', category:'AUTOS', important:true },
    { id:8, headline:'Treasury yields steady ahead of key CPI print Thursday', body:'The 10-year yield held at 4.42% as investors positioned for Thursday\'s CPI release. A reading above 3.5% could revive rate-hike expectations.', source:'CNBC', time:'07:30', category:'RATES', important:false },
];

const CAT_COLORS: Record<string, string> = {
    MACRO:'var(--color-amber)', CRYPTO:'var(--color-cyan)', EARNINGS:'var(--color-green)', TECH:'#a78bfa',
    COMMODITIES:'#fb923c', AUTOS:'#f87171', RATES:'var(--color-text-muted)',
};

export function NewsFeedWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Market News</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {NEWS.map(item => (
                    <div key={item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-row)', cursor: 'pointer', background: expanded === item.id ? 'var(--color-surface)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>{item.time}</span>
                            <span style={{
                                fontSize: 9, fontFamily: 'monospace', padding: '1px 5px', borderRadius: 2,
                                color: CAT_COLORS[item.category] ?? 'var(--color-text-muted)',
                                border: `1px solid ${CAT_COLORS[item.category] ?? 'var(--color-text-muted)'}`,
                            }}>{item.category}</span>
                            <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{item.source}</span>
                        </div>
                        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 12, color: item.important ? 'var(--color-text)' : '#9a9aaa', lineHeight: 1.4 }}>
                            {item.headline}
                        </p>
                        {expanded === item.id && (
                            <p style={{ margin: '6px 0 0', fontFamily: 'sans-serif', fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                {item.body}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
