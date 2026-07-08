/**
 * NewsPage — Full-page news & research feed with AI summary, source sidebar,
 * article feed, and slide-in reader panel.
 */
import { useState, useMemo } from 'react';
import {
    RefreshCw, Settings, ChevronDown, ChevronRight, X, Bookmark,
    BookmarkCheck, Search, Plus, ChevronLeft, ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { useTerminal } from '../stores/terminalStore';
import { useNewsSourceStore } from '../stores/newsSourceStore';
import { newsFetcher, type NewsArticle } from '../services/newsFetcher';
import type { SourceCategory } from '../stores/newsSourceStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_SUMMARIES = [
    'Markets open higher as Fed signals potential policy pivot. Risk assets broadly bid, with tech leading. Key focus: NVDA earnings, CPI Thursday, and ECB rate decision.',
    'Mixed session as bond yields rise. Energy stocks outperform on inventory surprise. Crypto resilient above key support. Watch: TSLA pre-market weakness, BTC ETF flows.',
    'Earnings season in full swing with 73% of S&P 500 beats vs estimates. Dollar strengthening on hawkish Fed minutes. Gold under pressure, equity vol subdued.',
];

const MOCK_THEMES = ['Fed Policy', 'Earnings Season', 'Tech Rally', 'Dollar Strength', 'Rate Uncertainty'];
const MOCK_SYMBOLS = ['NVDA', 'AAPL', 'TSLA', 'BTC/USD', 'SPY'];

const CATEGORY_LABELS: Record<SourceCategory, string> = {
    financial: '📰 Financial News',
    macro:     '📊 Macro / Economics',
    research:  '🔬 Research',
    social:    '🐦 Social / Alt',
    earnings:  '📅 Earnings',
    custom:    '🌐 Custom',
};

const SENTIMENT_COLORS: Record<string, string> = {
    bullish: 'var(--color-green-alt)',
    bearish: 'var(--color-red-alt)',
    neutral: 'var(--color-text-secondary)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
    const dot = sentiment === 'bullish' ? '🟢' : sentiment === 'bearish' ? '🔴' : '⚪';
    return (
        <span style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 4,
            background: `color-mix(in srgb, ${SENTIMENT_COLORS[sentiment]} 9%, transparent)`,
            color: SENTIMENT_COLORS[sentiment],
            border: `1px solid color-mix(in srgb, ${SENTIMENT_COLORS[sentiment]} 25%, transparent)`,
            fontFamily: 'monospace',
        }}>
            {dot} {sentiment}
        </span>
    );
}

// ─── AI Summary Banner ────────────────────────────────────────────────────────

function AISummaryBanner() {
    const { setSymbol } = useTerminal();
    const [summaryIdx, setSummaryIdx] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [configOpen, setConfigOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const sentiments: Array<'Bullish' | 'Neutral' | 'Bearish'> = ['Bullish', 'Neutral', 'Bullish'];
    const macroSentiment = sentiments[summaryIdx % sentiments.length];
    const sentimentColor = macroSentiment === 'Bullish' ? 'var(--color-green-alt)' : macroSentiment === 'Bearish' ? 'var(--color-red-alt)' : 'var(--color-amber-alt)';

    function handleRefresh() {
        setRefreshing(true);
        setTimeout(() => {
            setSummaryIdx(i => (i + 1) % AI_SUMMARIES.length);
            setLastUpdated(new Date());
            setRefreshing(false);
        }, 700);
    }

    return (
        <div style={{
            borderRadius: 8, padding: '14px 18px',
            background: 'linear-gradient(135deg, var(--color-bg-deep) 0%, var(--color-surface) 100%)',
            border: '1px solid rgba(0,168,255,0.2)',
            boxShadow: '0 0 24px rgba(0,168,255,0.06)',
            position: 'relative', flexShrink: 0,
        }}>
            {/* Left accent bar */}
            <div style={{
                position: 'absolute', left: 0, top: 12, bottom: 12,
                width: 3, borderRadius: '0 2px 2px 0',
                background: sentimentColor,
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Sentiment badge */}
                <div style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    background: `color-mix(in srgb, ${sentimentColor} 9%, transparent)`, color: sentimentColor,
                    border: `1px solid color-mix(in srgb, ${sentimentColor} 25%, transparent)`, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                    {macroSentiment === 'Bullish' ? '▲' : macroSentiment === 'Bearish' ? '▼' : '—'} {macroSentiment}
                </div>

                {/* Summary text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, letterSpacing: '0.08em' }}>
                            AI MARKET SUMMARY
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-bright)', lineHeight: 1.55, marginBottom: 10 }}>
                        {AI_SUMMARIES[summaryIdx]}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginRight: 2 }}>Themes:</span>
                        {MOCK_THEMES.map(t => (
                            <span key={t} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}>{t}</span>
                        ))}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8, marginRight: 2 }}>Mentions:</span>
                        {MOCK_SYMBOLS.map(s => (
                            <button key={s} onClick={() => setSymbol(s)} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                                background: 'rgba(0,168,255,0.1)', color: 'var(--color-accent)',
                                border: '1px solid rgba(0,168,255,0.3)',
                            }}>{s}</button>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-dim)', whiteSpace: 'nowrap' }}>
                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={handleRefresh} title="Refresh summary" style={{
                        background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--color-text-secondary)',
                        display: 'flex', alignItems: 'center',
                    }}>
                        <RefreshCw size={13} style={{
                            animation: refreshing ? 'spin 0.7s linear infinite' : 'none',
                        }} />
                    </button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setConfigOpen(o => !o)} title="Configure" style={{
                            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--color-text-secondary)',
                            display: 'flex', alignItems: 'center',
                        }}>
                            <Settings size={13} />
                        </button>
                        {configOpen && (
                            <div style={{
                                position: 'absolute', right: 0, top: '110%', zIndex: 40,
                                background: 'var(--color-surface-alt)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 8, padding: 12, minWidth: 180,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}>
                                {[['Tone', 'Neutral'], ['Focus', 'All Markets'], ['Update', 'Hourly']].map(([label, val]) => (
                                    <div key={label} style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
                                        <select style={{
                                            width: '100%', background: 'var(--color-bg-deep)', color: 'var(--color-text-bright)',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                                            padding: '4px 6px', fontSize: 12,
                                        }}>
                                            <option>{val}</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Sources Sidebar ──────────────────────────────────────────────────────────

function SourcesSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const { sources, toggleSubscription, addCustomSource } = useNewsSourceStore();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        financial: true, macro: true, research: false, social: false, earnings: true, custom: true,
    });
    const [addingCustom, setAddingCustom] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customUrl, setCustomUrl] = useState('');

    const filtered = useMemo(() =>
        sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
    [sources, search]);

    const grouped = useMemo(() => {
        const g: Record<SourceCategory, typeof sources> = {
            financial: [], macro: [], research: [], social: [], earnings: [], custom: [],
        };
        filtered.forEach(s => g[s.category].push(s));
        return g;
    }, [filtered]);

    if (collapsed) {
        return (
            <div style={{ width: 32, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
                <button onClick={onToggle} style={{
                    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, padding: '6px 4px', cursor: 'pointer', color: 'var(--color-text-secondary)',
                }}>
                    <ChevronRightIcon size={14} />
                </button>
            </div>
        );
    }

    function handleAddCustom() {
        if (customName.trim()) {
            addCustomSource(customName.trim(), customUrl.trim(), 'daily');
            setCustomName(''); setCustomUrl(''); setAddingCustom(false);
        }
    }

    return (
        <div style={{
            width: 240, flexShrink: 0, background: 'var(--color-bg-deep)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', flex: 1 }}>SOURCES</span>
                <button onClick={onToggle} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2,
                }}>
                    <ChevronLeft size={14} />
                </button>
            </div>

            {/* Search */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--color-surface)', borderRadius: 6, padding: '5px 8px',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <Search size={12} color="var(--color-text-muted)" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Filter sources..."
                        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--color-text-bright)', fontSize: 12, flex: 1 }}
                    />
                </div>
            </div>

            {/* Groups */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                {(Object.keys(CATEGORY_LABELS) as SourceCategory[]).map(cat => {
                    const catSources = grouped[cat];
                    if (catSources.length === 0 && cat !== 'custom') return null;
                    const isOpen = expanded[cat];
                    return (
                        <div key={cat}>
                            <button onClick={() => setExpanded(e => ({ ...e, [cat]: !e[cat] }))} style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '6px 12px', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600,
                                letterSpacing: '0.06em',
                            }}>
                                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                {CATEGORY_LABELS[cat]}
                                <span style={{ marginLeft: 'auto', color: 'var(--color-text-dim)' }}>
                                    {catSources.filter(s => s.subscribed).length}/{catSources.length}
                                </span>
                            </button>
                            {isOpen && catSources.map(src => (
                                <div key={src.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 12px 5px 24px',
                                    opacity: src.subscribed ? 1 : 0.5,
                                }}>
                                    <button onClick={() => toggleSubscription(src.id)} style={{
                                        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                                        background: src.subscribed ? 'var(--color-accent)' : 'transparent',
                                        border: `1px solid ${src.subscribed ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)'}`,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {src.subscribed && <span style={{ fontSize: 10, color: '#000' }}>✓</span>}
                                    </button>
                                    <span style={{ fontSize: 12, color: 'var(--color-text-bright)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {src.name}
                                    </span>
                                    {src.articleCount > 0 && (
                                        <span style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                                            {src.articleCount}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {/* Add Custom */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {addingCustom ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={customName} onChange={e => setCustomName(e.target.value)}
                            placeholder="Source name" style={{
                                background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4, padding: '5px 8px', color: 'var(--color-text-bright)', fontSize: 12, outline: 'none',
                            }} />
                        <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                            placeholder="URL (optional)" style={{
                                background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 4, padding: '5px 8px', color: 'var(--color-text-bright)', fontSize: 12, outline: 'none',
                            }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleAddCustom} style={{
                                flex: 1, padding: '5px', background: 'var(--color-accent)', color: '#000',
                                border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600,
                            }}>Add</button>
                            <button onClick={() => setAddingCustom(false)} style={{
                                flex: 1, padding: '5px', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                            }}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setAddingCustom(true)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'rgba(0,168,255,0.08)', border: '1px dashed rgba(0,168,255,0.3)',
                        borderRadius: 6, padding: '7px', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12,
                    }}>
                        <Plus size={13} /> Add Custom Source
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({
    article, selected, bookmarked, onSelect, onBookmark,
}: {
    article: NewsArticle; selected: boolean; bookmarked: boolean;
    onSelect: () => void; onBookmark: () => void;
}) {
    const { setSymbol } = useTerminal();
    return (
        <div onClick={onSelect} style={{
            padding: '12px 16px', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            borderLeft: `3px solid ${selected ? 'var(--color-accent)' : 'transparent'}`,
            background: selected ? 'rgba(0,168,255,0.05)' : 'transparent',
            transition: 'background 0.15s',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 }}>{article.source}</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{article.category}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-dim)' }}>{relativeTime(article.timestamp)}</span>
                <button onClick={e => { e.stopPropagation(); onBookmark(); }} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: bookmarked ? 'var(--color-amber-alt)' : 'var(--color-text-dim)',
                }}>
                    {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                </button>
            </div>
            <h3 style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-bright)', lineHeight: 1.4 }}>
                {article.headline}
            </h3>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                {article.snippet}
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {article.tickers.map(t => (
                    <button key={t} onClick={e => { e.stopPropagation(); setSymbol(t); }} style={{
                        fontSize: 11, padding: '1px 7px', borderRadius: 4, cursor: 'pointer',
                        background: 'rgba(0,168,255,0.1)', color: 'var(--color-accent)',
                        border: '1px solid rgba(0,168,255,0.25)',
                    }}>{t}</button>
                ))}
                <span style={{ marginLeft: 'auto' }}>
                    <SentimentBadge sentiment={article.sentiment} />
                </span>
            </div>
        </div>
    );
}

// ─── Reader Panel ─────────────────────────────────────────────────────────────

function ReaderPanel({ article, bookmarked, onClose, onBookmark }: {
    article: NewsArticle; bookmarked: boolean; onClose: () => void; onBookmark: () => void;
}) {
    const { setSymbol } = useTerminal();
    const [aiOpen, setAiOpen] = useState(true);

    const aiPoints = [
        `${article.source} reports a significant development in the ${article.category} space with implications for related securities.`,
        `Sentiment is ${article.sentiment} — key drivers include macro positioning and sector rotation dynamics.`,
        `Watch ${article.tickers.slice(0, 2).join(' and ')} for direct price impact; secondary effects may hit correlated assets.`,
    ];

    return (
        <div style={{
            width: 400, flexShrink: 0, background: 'var(--color-bg-deep)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--color-text-muted)' }}>ARTICLE READER</span>
                <button onClick={onBookmark} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: bookmarked ? 'var(--color-amber-alt)' : 'var(--color-text-muted)', padding: 4,
                }}>
                    {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                </button>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4,
                }}>
                    <X size={15} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                {/* Meta */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>{article.source}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{relativeTime(article.timestamp)}</span>
                    <SentimentBadge sentiment={article.sentiment} />
                </div>
                <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-bright)', lineHeight: 1.4 }}>
                    {article.headline}
                </h2>
                <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>
                    {article.body}
                </p>

                {/* Tickers */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {article.tickers.map(t => (
                        <button key={t} onClick={() => setSymbol(t)} style={{
                            fontSize: 12, padding: '3px 10px', borderRadius: 4, cursor: 'pointer',
                            background: 'rgba(0,168,255,0.1)', color: 'var(--color-accent)',
                            border: '1px solid rgba(0,168,255,0.3)',
                        }}>{t}</button>
                    ))}
                </div>

                {/* AI Analysis */}
                <div style={{
                    background: 'var(--color-surface)', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <button onClick={() => setAiOpen(o => !o)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 14px', color: 'var(--color-accent)',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>AI ANALYSIS</span>
                        <span style={{ marginLeft: 'auto' }}>
                            {aiOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    </button>
                    {aiOpen && (
                        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                                {aiPoints.map((pt, i) => (
                                    <li key={i} style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function NewsPage() {
    const { bookmarks, addBookmark, removeBookmark } = useNewsSourceStore();
    const [articles] = useState(() => newsFetcher.getArticles());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
    const [filterTab, setFilterTab] = useState<'all' | 'bookmarked'>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'relevant'>('newest');
    const [sourceFilter, setSourceFilter] = useState('all');

    const sourceOptions = ['all', ...Array.from(new Set(articles.map(a => a.source)))];

    const displayed = useMemo(() => {
        let list = [...articles];
        if (filterTab === 'bookmarked') list = list.filter(a => bookmarks.includes(a.id));
        if (sourceFilter !== 'all') list = list.filter(a => a.source === sourceFilter);
        if (sortOrder === 'newest') list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return list;
    }, [articles, filterTab, sourceFilter, sortOrder, bookmarks]);

    function toggleBookmark(id: string) {
        bookmarks.includes(id) ? removeBookmark(id) : addBookmark(id);
    }

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: 'var(--color-bg)', color: 'var(--color-text-bright)', overflow: 'hidden',
        }}>
            {/* AI Summary Banner */}
            <div style={{ padding: '12px 16px', flexShrink: 0 }}>
                <AISummaryBanner />
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Sources Sidebar */}
                <SourcesSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

                {/* News Feed */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Filter bar */}
                    <div style={{
                        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
                        background: 'var(--color-bg-deep)',
                    }}>
                        {(['all', 'bookmarked'] as const).map(tab => (
                            <button key={tab} onClick={() => setFilterTab(tab)} style={{
                                padding: '4px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600,
                                background: filterTab === tab ? 'var(--color-accent)' : 'transparent',
                                color: filterTab === tab ? '#000' : 'var(--color-text-muted)',
                            }}>
                                {tab === 'all' ? 'All' : 'Bookmarked'}
                            </button>
                        ))}
                        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{
                            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
                        }}>
                            {sourceOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'All Sources' : s}</option>)}
                        </select>
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'relevant')} style={{
                            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 5, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
                        }}>
                            <option value="newest">Newest</option>
                            <option value="relevant">Relevant</option>
                        </select>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-dim)' }}>
                            {displayed.length} articles
                        </span>
                    </div>

                    {/* Articles */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {displayed.map(article => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                selected={selectedArticle?.id === article.id}
                                bookmarked={bookmarks.includes(article.id)}
                                onSelect={() => setSelectedArticle(a => a?.id === article.id ? null : article)}
                                onBookmark={() => toggleBookmark(article.id)}
                            />
                        ))}
                        {displayed.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 13 }}>
                                No articles match your filters.
                            </div>
                        )}
                    </div>
                </div>

                {/* Reader panel */}
                {selectedArticle && (
                    <ReaderPanel
                        article={selectedArticle}
                        bookmarked={bookmarks.includes(selectedArticle.id)}
                        onClose={() => setSelectedArticle(null)}
                        onBookmark={() => toggleBookmark(selectedArticle.id)}
                    />
                )}
            </div>
        </div>
    );
}
