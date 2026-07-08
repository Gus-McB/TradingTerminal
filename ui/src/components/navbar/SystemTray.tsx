/**
 * SystemTray — right side of the navbar: account selector, connection +
 * measured feed latency, alert bell (single alert list: alertStore), profile
 * menu, clock, and the panel-tab-bar toggle.
 */
import { useState, useRef, useEffect } from 'react';
import { Bell, User, ChevronDown, ChevronUp, X, Wifi, WifiOff } from 'lucide-react';
import { useTerminalStore } from '../../stores/terminalStore';
import { useAlertStore } from '../../stores/alertStore';
import { useConnection } from '../../services/marketData';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { MOCK_ACCOUNTS } from './mockData';

function fmtTime(d: Date): string {
    return d.toLocaleTimeString('en-US', { hour12: false });
}

const ALERT_COLORS: Record<string, string> = {
    danger: 'var(--color-red-alt)',
    warn:   'var(--color-amber-alt)',
    info:   'var(--color-accent)',
};

function Divider() {
    return <div style={{ width: 1, height: 24, background: 'var(--color-divider)', margin: '0 6px' }} />;
}

interface SystemTrayProps {
    secondaryOpen: boolean;
    onToggleSecondary: () => void;
}

export function SystemTray({ secondaryOpen, onToggleSecondary }: SystemTrayProps) {
    const activeAccount = useTerminalStore(s => s.activeAccount);
    const setAccount    = useTerminalStore(s => s.setAccount);

    const alerts     = useAlertStore(s => s.alerts);
    const clearAlert = useAlertStore(s => s.clearAlert);
    const clearAll   = useAlertStore(s => s.clearAll);

    // Real connection state + measured engine→middleware feed latency
    const { connected, feedLatencyMs } = useConnection();

    const [clock, setClock] = useState(() => fmtTime(new Date()));
    useEffect(() => {
        const t = setInterval(() => setClock(fmtTime(new Date())), 1000);
        return () => clearInterval(t);
    }, []);

    const [showAccounts, setShowAccounts] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    useOutsideClick(accountRef, () => setShowAccounts(false));

    const [showAlerts, setShowAlerts] = useState(false);
    const alertRef = useRef<HTMLDivElement>(null);
    useOutsideClick(alertRef, () => setShowAlerts(false));

    const [showProfile, setShowProfile] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    useOutsideClick(profileRef, () => setShowProfile(false));

    const account = MOCK_ACCOUNTS.find(a => a.num === activeAccount) ?? MOCK_ACCOUNTS[0];
    const accountColor = account.id === 'live' ? 'var(--color-green-alt)' : 'var(--color-amber-alt)';

    const latencyColor = !connected ? 'var(--color-red-alt)'
        : feedLatencyMs <= 5 ? 'var(--color-green-alt)'
        : feedLatencyMs <= 15 ? 'var(--color-amber-alt)'
        : 'var(--color-red-alt)';

    return (
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
                        color: accountColor,
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-divider)',
                        letterSpacing: '0.05em',
                        maxWidth: 160,
                        overflow: 'hidden',
                    }}
                >
                    <span style={{
                        width: 6, height: 6, flexShrink: 0,
                        background: accountColor,
                        borderRadius: '50%',
                        display: 'inline-block',
                    }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {account.label} #{account.num}
                    </span>
                    <ChevronDown size={10} style={{ flexShrink: 0 }} />
                </button>

                {showAccounts && (
                    <div
                        className="absolute top-full right-0 z-50 w-48 overflow-hidden"
                        style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-divider-strong)',
                            marginTop: 2,
                        }}
                    >
                        {MOCK_ACCOUNTS.map(a => {
                            const isSel = a.num === account.num;
                            const color = a.id === 'live' ? 'var(--color-green-alt)' : 'var(--color-amber-alt)';
                            return (
                                <button
                                    key={a.id}
                                    className="w-full flex items-center gap-2 px-3 py-2"
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'monospace',
                                        color: isSel ? 'var(--color-text-bright)' : 'var(--color-text-secondary)',
                                        background: isSel ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                                        borderLeft: isSel ? '2px solid var(--color-accent)' : '2px solid transparent',
                                    }}
                                    onClick={() => { setAccount(a.num); setShowAccounts(false); }}
                                >
                                    <span style={{ width: 6, height: 6, background: color, borderRadius: '50%' }} />
                                    <span style={{ color, fontWeight: 700, fontSize: 10 }}>{a.label}</span>
                                    <span style={{ color: 'var(--color-text-gray)' }}>#{a.num}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <Divider />

            {/* Connection + measured latency */}
            <div className="flex items-center gap-1.5 px-2" title="Market data connection">
                {connected
                    ? <Wifi size={11} color="var(--color-green-alt)" />
                    : <WifiOff size={11} color="var(--color-red-alt)" />}
                <span style={{
                    fontSize: 10,
                    color: connected ? 'var(--color-green-alt)' : 'var(--color-red-alt)',
                    fontWeight: 600, letterSpacing: '0.05em',
                }}>
                    {connected ? 'FEED LIVE' : 'OFFLINE'}
                </span>
            </div>
            {connected && (
                <div
                    className="flex items-center justify-center px-2"
                    style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: latencyColor }}
                    title="Measured engine → middleware feed latency"
                >
                    {feedLatencyMs.toFixed(1)}ms
                </div>
            )}

            <Divider />

            {/* Alert bell — reads the single alertStore list */}
            <div ref={alertRef} className="relative flex items-center">
                <button
                    onClick={() => setShowAlerts(v => !v)}
                    className="relative flex items-center justify-center"
                    style={{
                        width: 30, height: 30,
                        color: showAlerts ? 'var(--color-accent)' : 'var(--color-text-steel)',
                        background: showAlerts ? 'color-mix(in srgb, var(--color-accent) 7%, transparent)' : 'transparent',
                        border: showAlerts ? '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)' : '1px solid transparent',
                    }}
                >
                    <Bell size={14} />
                    {alerts.length > 0 && (
                        <span
                            className="absolute -top-0.5 -right-0.5 flex items-center justify-center"
                            style={{
                                minWidth: 14, height: 14,
                                fontSize: 9, fontWeight: 700,
                                background: 'var(--color-red-alt)',
                                color: '#fff',
                                padding: '0 3px',
                            }}
                        >
                            {alerts.length}
                        </span>
                    )}
                </button>

                {showAlerts && (
                    <div
                        className="absolute top-full right-0 z-50 w-80"
                        style={{
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-divider-strong)',
                            marginTop: 2,
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-3 py-2"
                            style={{ borderBottom: '1px solid var(--color-divider)' }}
                        >
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.1em' }}>ALERTS</span>
                            <button onClick={clearAll} style={{ fontSize: 10, color: 'var(--color-text-dim)' }}>
                                Clear all
                            </button>
                        </div>

                        {alerts.length === 0 ? (
                            <div className="px-3 py-4 text-center" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                                No alerts
                            </div>
                        ) : [...alerts].reverse().map(a => (
                            <div
                                key={a.id}
                                className="flex items-start gap-2 px-3 py-2"
                                style={{
                                    borderBottom: '1px solid var(--color-divider-faint)',
                                    borderLeft: `2px solid ${ALERT_COLORS[a.type] ?? 'var(--color-accent)'}`,
                                }}
                            >
                                <div className="flex-1">
                                    <p style={{ fontSize: 11, color: 'var(--color-text-soft)' }}>{a.message}</p>
                                    <p style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace', marginTop: 2 }}>
                                        {new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                                    </p>
                                </div>
                                <button onClick={() => clearAlert(a.id)} style={{ color: 'var(--color-text-dim)', marginTop: 1 }}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Divider />

            {/* User profile */}
            <div ref={profileRef} className="relative flex items-center">
                <button
                    onClick={() => setShowProfile(v => !v)}
                    className="flex items-center gap-1.5 px-1.5"
                    style={{ color: 'var(--color-text-steel)' }}
                >
                    <div
                        className="flex items-center justify-center"
                        style={{
                            width: 26, height: 26,
                            background: 'var(--color-raised-alt)',
                            border: '1px solid var(--color-divider-strong)',
                            color: 'var(--color-accent)',
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
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-divider-strong)',
                            marginTop: 2,
                        }}
                    >
                        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--color-divider)' }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-bright)' }}>Trader</p>
                            <p style={{ fontSize: 10, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>#{account.num}</p>
                        </div>
                        {['Preferences', 'API Keys', 'Layout Manager', 'Sign Out'].map(item => (
                            <button
                                key={item}
                                className="w-full text-left px-3 py-2"
                                style={{ fontSize: 11, color: item === 'Sign Out' ? 'var(--color-red-alt)' : 'var(--color-text-secondary)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-divider-faint)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                onClick={() => setShowProfile(false)}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <Divider />

            {/* Clock */}
            <div className="flex flex-col items-end px-2 leading-none">
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--color-text-bright)', letterSpacing: '0.05em' }}>
                    {clock}
                </span>
                <span style={{ fontSize: 9, color: 'var(--color-text-dim)', letterSpacing: '0.1em', marginTop: 1 }}>
                    LOCAL
                </span>
            </div>

            {/* Secondary bar toggle */}
            <button
                onClick={onToggleSecondary}
                className="flex items-center justify-center ml-1"
                style={{
                    width: 20, height: 20,
                    color: 'var(--color-text-dim)',
                    border: '1px solid var(--color-divider-faint)',
                }}
                title={secondaryOpen ? 'Hide panel tabs' : 'Show panel tabs'}
            >
                {secondaryOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
        </div>
    );
}
