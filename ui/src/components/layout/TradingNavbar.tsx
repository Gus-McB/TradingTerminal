/**
 * TradingNavbar — IBKR/Bloomberg-style horizontal taskbar.
 *
 * Layout (left → right):
 *   [Brand] | [Module Launchers] | [Market Strip] | [Command Bar] | [System Tray]
 *
 * Secondary row (collapsible):
 *   [Open Panel Tabs]
 */

import {
    useState, useEffect, useRef, useCallback, type KeyboardEvent,
} from 'react';
import {
    LayoutDashboard, Briefcase, Star, ShoppingCart, BarChart2,
    ScanLine, Link2, Newspaper, ShieldAlert, Wallet,
    Bell, User, ChevronDown, Search, TrendingUp, TrendingDown,
    ChevronUp, GripVertical, X, Zap, Wifi,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Module {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    path?: string;
}

interface IndexQuote {
    symbol: string;
    price: number;
    change: number;
    changePct: number;
}

interface Alert {
    id: number;
    type: 'warn' | 'info' | 'danger';
    msg: string;
    time: string;
}

interface OpenPanel {
    id: string;
    label: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES: Module[] = [
    { id: 'portfolio',  label: 'Portfolio',  icon: <Briefcase  size={13} /> },
    { id: 'watchlist',  label: 'Watchlist',  icon: <Star       size={13} />, badge: 2 },
    { id: 'orders',     label: 'Orders',     icon: <ShoppingCart size={13} />, badge: 1 },
    { id: 'charts',     label: 'Charts',     icon: <BarChart2  size={13} /> },
    { id: 'scanner',    label: 'Scanner',    icon: <ScanLine   size={13} /> },
    { id: 'options',    label: 'Options',    icon: <Link2      size={13} /> },
    { id: 'news',       label: 'News',       icon: <Newspaper  size={13} />, badge: 5 },
    { id: 'risk',       label: 'Risk',       icon: <ShieldAlert size={13} /> },
    { id: 'account',    label: 'Account',    icon: <Wallet     size={13} /> },
];

const ACCOUNTS = [
    { id: 'live',  label: 'LIVE',  num: 'U1234567' },
    { id: 'paper', label: 'PAPER', num: 'U9999999' },
];

const MOCK_ALERTS: Alert[] = [
    { id: 1, type: 'danger', msg: 'AAPL position exceeded risk limit',  time: '09:32' },
    { id: 2, type: 'warn',   msg: 'Margin utilisation at 78%',          time: '09:28' },
    { id: 3, type: 'info',   msg: 'BTC/USD 1m kline history loaded',    time: '09:15' },
];

const RECENT_SYMBOLS = ['BTC/USD', 'ETH/USD', 'AAPL', 'TSLA', 'SPY'];

const BASE_QUOTES: IndexQuote[] = [
    { symbol: 'SPX',  price: 5287.34, change:  14.22, changePct:  0.27 },
    { symbol: 'NDX',  price: 18432.10, change:  61.45, changePct:  0.33 },
    { symbol: 'DJI',  price: 39158.80, change: -42.11, changePct: -0.11 },
    { symbol: 'VIX',  price:   14.72, change:  -0.38, changePct: -2.52 },
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

/** Format time HH:MM:SS */
function fmtTime(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour12: false });
}

/** Jitter a quote slightly for the live ticker illusion */
function jitter(q: IndexQuote): IndexQuote {
    const delta = (Math.random() - 0.49) * q.price * 0.0003;
    const price = +(q.price + delta).toFixed(2);
    const change = +(q.change + delta).toFixed(2);
    const changePct = +((change / (price - change)) * 100).toFixed(2);
    return { ...q, price, change, changePct };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Closes a dropdown when user clicks outside its ref */
function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) cb();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, cb]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TradingNavbar() {
    // Active module
    const [activeModule, setActiveModule] = useState<string>('charts');

    // Quotes (updated every 1.5 s)
    const [quotes, setQuotes] = useState<IndexQuote[]>(BASE_QUOTES);

    // Clock
    const [clock, setClock] = useState(() => fmtTime(new Date()));

    // Command bar
    const [query, setQuery]           = useState('');
    const [showRecent, setShowRecent] = useState(false);
    const [cmdResult, setCmdResult]   = useState('');
    const cmdRef = useRef<HTMLDivElement>(null);
    useOutsideClick(cmdRef, () => setShowRecent(false));

    // Notifications
    const [showAlerts, setShowAlerts] = useState(false);
    const [alerts, setAlerts]         = useState<Alert[]>(MOCK_ALERTS);
    const alertRef = useRef<HTMLDivElement>(null);
    useOutsideClick(alertRef, () => setShowAlerts(false));

    // Account selector
    const [account, setAccount]        = useState(ACCOUNTS[0]);
    const [showAccounts, setShowAccounts] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    useOutsideClick(accountRef, () => setShowAccounts(false));

    // Profile menu
    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    useOutsideClick(profileRef, () => setShowProfile(false));

    // Secondary taskbar (open panels)
    const [panels, setPanels]         = useState<OpenPanel[]>([
        { id: 'charts',    label: 'Charts — BTC/USD' },
        { id: 'watchlist', label: 'Watchlist' },
        { id: 'orders',    label: 'Order Entry' },
    ]);
    const [secondaryOpen, setSecondaryOpen] = useState(true);
    const [activePanel, setActivePanel]     = useState('charts');
    const dragIdx = useRef<number | null>(null);

    // Latency mock (rotates green / amber occasionally)
    const [latency, setLatency] = useState(2);

    // ── Effects ────────────────────────────────────────────────────────────

    useEffect(() => {
        // Clock — 1 s
        const t = setInterval(() => setClock(fmtTime(new Date())), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        // Market data ticker — 1.5 s
        const t = setInterval(() => setQuotes(prev => prev.map(jitter)), 1500);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        // Fake latency noise — every 4 s
        const t = setInterval(() => {
            setLatency(Math.random() < 0.1 ? Math.floor(Math.random() * 15) + 8 : Math.floor(Math.random() * 3) + 1);
        }, 4000);
        return () => clearInterval(t);
    }, []);

    // ── Handlers ───────────────────────────────────────────────────────────

    const handleCommand = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter' || !query.trim()) return;
        const sym = query.trim().toUpperCase();
        setCmdResult(sym);
        setQuery('');
        setShowRecent(false);
        console.log('[CMD]', sym);
    }, [query]);

    const dismissAlert = useCallback((id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
    }, []);

    const closePanel = useCallback((id: string) => {
        setPanels(prev => prev.filter(p => p.id !== id));
    }, []);

    // Panel drag-reorder (minimal, mouse-based)
    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDragOver  = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === idx) return;
        setPanels(prev => {
            const next = [...prev];
            const [moved] = next.splice(dragIdx.current!, 1);
            next.splice(idx, 0, moved);
            dragIdx.current = idx;
            return next;
        });
    };

    // ── Derived ────────────────────────────────────────────────────────────

    const unreadCount = alerts.length;
    const latencyColor = latency <= 5 ? '#00e676' : latency <= 15 ? '#f0a500' : '#ff3b30';

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div
            className="w-full select-none z-50"
            style={{ fontFamily: "'DM Sans', 'IBM Plex Sans', system-ui, sans-serif" }}
        >
            {/* ═══════════════════════════════════════════════════════════════
                PRIMARY BAR
            ═══════════════════════════════════════════════════════════════ */}
            <div
                className="w-full flex items-stretch"
                style={{
                    height: 48,
                    background: '#0d0f12',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
            >

                {/* ── ZONE 1 — Brand ────────────────────────────────────── */}
                <div
                    className="flex items-center gap-2 px-3 shrink-0"
                    style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {/* Logo mark */}
                    <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                            width: 28, height: 28,
                            background: 'linear-gradient(135deg, #00a8ff22 0%, #00a8ff44 100%)',
                            border: '1px solid #00a8ff55',
                        }}
                    >
                        <Zap size={14} color="#00a8ff" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#e8eaed', letterSpacing: '0.08em' }}>
                            APEX
                        </span>
                        <span style={{ fontSize: 9, color: '#00a8ff', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                            TERMINAL
                        </span>
                    </div>

                    {/* Dashboard / Home button */}
                    <button
                        onClick={() => setActiveModule('home')}
                        className="ml-2 flex items-center justify-center"
                        style={{
                            width: 28, height: 28,
                            background: activeModule === 'home' ? '#00a8ff18' : 'transparent',
                            border: activeModule === 'home' ? '1px solid #00a8ff66' : '1px solid transparent',
                            color: activeModule === 'home' ? '#00a8ff' : '#8a8f98',
                            transition: 'all 0.12s',
                        }}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={14} />
                    </button>
                </div>

                {/* ── ZONE 2 — Module Launchers ─────────────────────────── */}
                <div
                    className="flex items-stretch overflow-x-auto"
                    style={{
                        borderRight: '1px solid rgba(255,255,255,0.07)',
                        scrollbarWidth: 'none',
                        flex: '0 1 auto',
                        minWidth: 0,
                    }}
                >
                    {MODULES.map(mod => {
                        const isActive = activeModule === mod.id;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => setActiveModule(mod.id)}
                                className="relative flex items-center gap-1.5 px-3 h-full"
                                style={{
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color:      isActive ? '#00a8ff' : '#9aa0ac',
                                    background: isActive ? '#00a8ff0f' : 'transparent',
                                    borderBottom: isActive
                                        ? '2px solid #00a8ff'
                                        : '2px solid transparent',
                                    borderRight: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'all 0.1s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#c8cdd6';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#9aa0ac';
                                }}
                            >
                                <span style={{ color: isActive ? '#00a8ff' : '#6b7280' }}>{mod.icon}</span>
                                {mod.label}

                                {/* Badge */}
                                {mod.badge != null && mod.badge > 0 && (
                                    <span
                                        className="absolute top-1.5 right-1 flex items-center justify-center"
                                        style={{
                                            minWidth: 14, height: 14,
                                            fontSize: 9, fontWeight: 700,
                                            background: mod.id === 'orders' ? '#ff3b30' : '#f0a500',
                                            color: '#000',
                                            borderRadius: 0,
                                            padding: '0 3px',
                                        }}
                                    >
                                        {mod.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── ZONE 3 — Market Data Strip ────────────────────────── */}
                <div
                    className="flex items-center gap-1 px-3 overflow-hidden"
                    style={{
                        borderRight: '1px solid rgba(255,255,255,0.07)',
                        minWidth: 0,
                        flex: '1 1 0',
                    }}
                >
                    {quotes.map(q => {
                        const up = q.changePct >= 0;
                        return (
                            <div
                                key={q.symbol}
                                className="flex items-baseline gap-1 px-2 shrink-0"
                                style={{
                                    borderRight: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#8a8f98', letterSpacing: '0.05em' }}>
                                    {q.symbol}
                                </span>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        fontFamily: 'monospace',
                                        color: '#e8eaed',
                                    }}
                                >
                                    {q.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontFamily: 'monospace',
                                        color: up ? '#00e676' : '#ff3b30',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                    }}
                                >
                                    {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                    {up ? '+' : ''}{q.changePct.toFixed(2)}%
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ── ZONE 4 — Command / Search Bar ─────────────────────── */}
                <div
                    className="flex items-center px-2"
                    style={{
                        borderRight: '1px solid rgba(255,255,255,0.07)',
                        flex: '0 1 240px',
                        minWidth: 100,
                    }}
                >
                    <div ref={cmdRef} className="relative w-full">
                        <div
                            className="flex items-center gap-1.5"
                            style={{
                                background: '#161a1f',
                                border: showRecent ? '1px solid #00a8ff55' : '1px solid rgba(255,255,255,0.1)',
                                padding: '4px 8px',
                            }}
                        >
                            <Search size={12} color="#4b5563" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => { setQuery(e.target.value); setShowRecent(true); setCmdResult(''); }}
                                onFocus={() => setShowRecent(true)}
                                onKeyDown={handleCommand}
                                placeholder="Symbol or function…"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    color: '#e8eaed',
                                }}
                            />
                            {cmdResult && (
                                <span style={{ fontSize: 10, color: '#00a8ff', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                    → {cmdResult}
                                </span>
                            )}
                        </div>

                        {/* Recent symbols dropdown */}
                        {showRecent && (
                            <div
                                className="absolute top-full left-0 w-full z-50 overflow-hidden"
                                style={{
                                    background: '#161a1f',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: 2,
                                }}
                            >
                                <div style={{ padding: '4px 8px', fontSize: 9, color: '#4b5563', letterSpacing: '0.1em' }}>
                                    RECENT
                                </div>
                                {RECENT_SYMBOLS.filter(s =>
                                    !query || s.toLowerCase().includes(query.toLowerCase())
                                ).map(s => (
                                    <button
                                        key={s}
                                        className="w-full text-left px-3 py-1.5 flex items-center gap-2"
                                        style={{ fontSize: 11, fontFamily: 'monospace', color: '#9aa0ac' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#00a8ff0f')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => {
                                            setQuery(s);
                                            setCmdResult(s);
                                            setShowRecent(false);
                                            console.log('[CMD]', s);
                                        }}
                                    >
                                        <Search size={10} color="#4b5563" />
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ZONE 5 — System Tray ──────────────────────────────── */}
                <div className="flex items-center gap-0 px-2 shrink-0 overflow-hidden">

                    {/* Account selector */}
                    <div ref={accountRef} className="relative flex items-center">
                        <button
                            onClick={() => setShowAccounts(v => !v)}
                            className="flex items-center gap-1.5 px-2.5 h-8"
                            style={{
                                fontSize: 10,
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                color: account.id === 'live' ? '#00e676' : '#f0a500',
                                background: '#161a1f',
                                border: '1px solid rgba(255,255,255,0.08)',
                                letterSpacing: '0.05em',
                                maxWidth: 160,
                                overflow: 'hidden',
                            }}
                        >
                            <span
                                style={{
                                    width: 6, height: 6, flexShrink: 0,
                                    background: account.id === 'live' ? '#00e676' : '#f0a500',
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {account.label} #{account.num}
                            </span>
                            <ChevronDown size={10} style={{ flexShrink: 0 }} />
                        </button>

                        {showAccounts && (
                            <div
                                className="absolute top-full right-0 z-50 w-48 overflow-hidden"
                                style={{
                                    background: '#161a1f',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: 2,
                                }}
                            >
                                {ACCOUNTS.map(a => (
                                    <button
                                        key={a.id}
                                        className="w-full flex items-center gap-2 px-3 py-2"
                                        style={{
                                            fontSize: 11,
                                            fontFamily: 'monospace',
                                            color: a.id === account.id ? '#e8eaed' : '#9aa0ac',
                                            background: a.id === account.id ? '#00a8ff0f' : 'transparent',
                                            borderLeft: a.id === account.id ? '2px solid #00a8ff' : '2px solid transparent',
                                        }}
                                        onMouseEnter={e => { if (a.id !== account.id) (e.currentTarget.style.background = '#ffffff06'); }}
                                        onMouseLeave={e => { if (a.id !== account.id) (e.currentTarget.style.background = 'transparent'); }}
                                        onClick={() => { setAccount(a); setShowAccounts(false); }}
                                    >
                                        <span style={{
                                            width: 6, height: 6,
                                            background: a.id === 'live' ? '#00e676' : '#f0a500',
                                            borderRadius: '50%',
                                        }} />
                                        <span style={{ color: a.id === 'live' ? '#00e676' : '#f0a500', fontWeight: 700, fontSize: 10 }}>{a.label}</span>
                                        <span style={{ color: '#6b7280' }}>#{a.num}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', margin: '0 6px' }} />

                    {/* Connection status */}
                    <div className="flex items-center gap-1.5 px-2">
                        <Wifi size={11} color="#00e676" />
                        <span style={{ fontSize: 10, color: '#00e676', fontWeight: 600, letterSpacing: '0.05em' }}>NYSE LIVE</span>
                    </div>

                    {/* Latency */}
                    <div
                        className="flex items-center justify-center px-2"
                        style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: latencyColor }}
                        title="Round-trip latency"
                    >
                        {latency}ms
                    </div>

                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', margin: '0 6px' }} />

                    {/* Notification bell */}
                    <div ref={alertRef} className="relative flex items-center">
                        <button
                            onClick={() => setShowAlerts(v => !v)}
                            className="relative flex items-center justify-center"
                            style={{
                                width: 30, height: 30,
                                color: showAlerts ? '#00a8ff' : '#8a8f98',
                                background: showAlerts ? '#00a8ff12' : 'transparent',
                                border: showAlerts ? '1px solid #00a8ff33' : '1px solid transparent',
                            }}
                        >
                            <Bell size={14} />
                            {unreadCount > 0 && (
                                <span
                                    className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                                    style={{
                                        minWidth: 14, height: 14,
                                        fontSize: 9, fontWeight: 700,
                                        background: '#ff3b30',
                                        color: '#fff',
                                        padding: '0 3px',
                                    }}
                                >
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showAlerts && (
                            <div
                                className="absolute top-full right-0 z-50 w-80"
                                style={{
                                    background: '#161a1f',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: 2,
                                }}
                            >
                                <div
                                    className="flex items-center justify-between px-3 py-2"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                                >
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9aa0ac', letterSpacing: '0.1em' }}>ALERTS</span>
                                    <button
                                        onClick={() => setAlerts([])}
                                        style={{ fontSize: 10, color: '#4b5563' }}
                                    >
                                        Clear all
                                    </button>
                                </div>

                                {alerts.length === 0 ? (
                                    <div className="px-3 py-4 text-center" style={{ fontSize: 11, color: '#4b5563' }}>
                                        No alerts
                                    </div>
                                ) : alerts.map(a => (
                                    <div
                                        key={a.id}
                                        className="flex items-start gap-2 px-3 py-2"
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            borderLeft: `2px solid ${a.type === 'danger' ? '#ff3b30' : a.type === 'warn' ? '#f0a500' : '#00a8ff'}`,
                                        }}
                                    >
                                        <div className="flex-1">
                                            <p style={{ fontSize: 11, color: '#c8cdd6' }}>{a.msg}</p>
                                            <p style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace', marginTop: 2 }}>{a.time}</p>
                                        </div>
                                        <button
                                            onClick={() => dismissAlert(a.id)}
                                            style={{ color: '#4b5563', marginTop: 1 }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', margin: '0 6px' }} />

                    {/* User profile */}
                    <div ref={profileRef} className="relative flex items-center">
                        <button
                            onClick={() => setShowProfile(v => !v)}
                            className="flex items-center gap-1.5 px-1.5"
                            style={{ color: '#8a8f98' }}
                        >
                            <div
                                className="flex items-center justify-center"
                                style={{
                                    width: 26, height: 26,
                                    background: '#1e2530',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: '#00a8ff',
                                }}
                            >
                                <User size={12} />
                            </div>
                            <ChevronDown size={10} />
                        </button>

                        {showProfile && (
                            <div
                                className="absolute top-full right-0 z-50 w-44"
                                style={{
                                    background: '#161a1f',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: 2,
                                }}
                            >
                                <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: '#e8eaed' }}>Trader</p>
                                    <p style={{ fontSize: 10, color: '#4b5563', fontFamily: 'monospace' }}>#{account.num}</p>
                                </div>
                                {['Preferences', 'API Keys', 'Layout Manager', 'Sign Out'].map(item => (
                                    <button
                                        key={item}
                                        className="w-full text-left px-3 py-2"
                                        style={{ fontSize: 11, color: item === 'Sign Out' ? '#ff3b30' : '#9aa0ac' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#ffffff06')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => setShowProfile(false)}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.07)', margin: '0 6px' }} />

                    {/* Clock */}
                    <div className="flex flex-col items-end px-2 leading-none">
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#e8eaed', letterSpacing: '0.05em' }}>
                            {clock}
                        </span>
                        <span style={{ fontSize: 9, color: '#4b5563', letterSpacing: '0.1em', marginTop: 1 }}>
                            EST
                        </span>
                    </div>

                    {/* Secondary bar toggle */}
                    <button
                        onClick={() => setSecondaryOpen(v => !v)}
                        className="flex items-center justify-center ml-1"
                        style={{
                            width: 20, height: 20,
                            color: '#4b5563',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        title={secondaryOpen ? 'Hide panel tabs' : 'Show panel tabs'}
                    >
                        {secondaryOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECONDARY TASKBAR — Open panel tabs
            ═══════════════════════════════════════════════════════════════ */}
            {secondaryOpen && (
                <div
                    className="w-full flex items-stretch overflow-x-auto"
                    style={{
                        height: 28,
                        background: '#0a0c0f',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        scrollbarWidth: 'none',
                    }}
                >
                    {panels.map((panel, idx) => {
                        const isActive = activePanel === panel.id;
                        return (
                            <div
                                key={panel.id}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={e => handleDragOver(e, idx)}
                                className="flex items-stretch shrink-0 group"
                                style={{
                                    borderRight: '1px solid rgba(255,255,255,0.06)',
                                    background: isActive ? '#161a1f' : 'transparent',
                                    borderBottom: isActive ? '2px solid #00a8ff' : '2px solid transparent',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setActivePanel(panel.id)}
                            >
                                {/* Drag handle */}
                                <div
                                    className="flex items-center px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ color: '#3a3f4a', cursor: 'grab' }}
                                >
                                    <GripVertical size={10} />
                                </div>

                                {/* Label */}
                                <span
                                    style={{
                                        fontSize: 10,
                                        fontWeight: isActive ? 600 : 400,
                                        color: isActive ? '#e8eaed' : '#6b7280',
                                        display: 'flex',
                                        alignItems: 'center',
                                        paddingRight: 6,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {panel.label}
                                </span>

                                {/* Close */}
                                <button
                                    className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-2"
                                    style={{ color: '#4b5563' }}
                                    onClick={e => { e.stopPropagation(); closePanel(panel.id); }}
                                >
                                    <X size={10} />
                                </button>
                            </div>
                        );
                    })}

                    {/* New panel placeholder */}
                    <button
                        className="flex items-center px-3"
                        style={{ fontSize: 16, color: '#3a3f4a', lineHeight: 1 }}
                        onClick={() => {
                            const id = `panel-${Date.now()}`;
                            setPanels(prev => [...prev, { id, label: 'New Panel' }]);
                            setActivePanel(id);
                        }}
                        title="Open new panel"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
}
