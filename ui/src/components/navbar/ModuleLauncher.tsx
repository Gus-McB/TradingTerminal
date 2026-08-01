/**
 * ModuleLauncher — the horizontal module (page) launcher strip in the navbar.
 * Modules with a path navigate via the router; the active state derives from
 * the current location. Modules without a page yet are disabled (SOON).
 */
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Briefcase, Star, ShoppingCart, BarChart2, ScanLine,
    Link2, Newspaper, Bell, Wallet,
} from 'lucide-react';
import { MOCK_MODULE_BADGES } from './mockData';

interface Module {
    id: string;
    label: string;
    icon: ReactNode;
    /** Route the module opens; undefined = page not built yet */
    path?: string;
}

const MODULES: Module[] = [
    { id: 'charts',    label: 'Charts',    icon: <BarChart2    size={13} />, path: '/' },
    { id: 'watchlist', label: 'Watchlist', icon: <Star         size={13} />, path: '/watchlists' },
    { id: 'news',      label: 'News',      icon: <Newspaper    size={13} />, path: '/news' },
    { id: 'alerts',    label: 'Alerts',    icon: <Bell         size={13} />, path: '/alerts' },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase    size={13} />, path: '/portfolio' },
    { id: 'orders',    label: 'Orders',    icon: <ShoppingCart size={13} />, path: '/orders' },
    { id: 'account',   label: 'Account',   icon: <Wallet       size={13} />, path: '/config' },
    { id: 'scanner',   label: 'Scanner',   icon: <ScanLine     size={13} /> },
    { id: 'options',   label: 'Options',   icon: <Link2        size={13} /> },
];

export function ModuleLauncher() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <div
            className="flex items-stretch"
            style={{
                borderRight: '1px solid var(--color-divider)',
                // Navigation must never be squeezed — the market strip is the
                // flexible zone that absorbs width pressure instead
                flex: '0 0 auto',
            }}
        >
            {MODULES.map(mod => {
                const isActive = mod.path !== undefined && pathname === mod.path;
                const disabled = mod.path === undefined;
                const badge = MOCK_MODULE_BADGES[mod.id];
                return (
                    <button
                        key={mod.id}
                        onClick={() => mod.path && navigate(mod.path)}
                        disabled={disabled}
                        title={disabled ? `${mod.label} — coming soon` : mod.label}
                        // Coming-soon placeholders only render on very wide
                        // screens; functional modules always fit
                        className={`relative items-center gap-1.5 px-3 h-full ${disabled ? 'hidden 2xl:flex' : 'flex'}`}
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color:      isActive ? 'var(--color-accent)' : disabled ? 'var(--color-text-dim)' : 'var(--color-text-secondary)',
                            background: isActive ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                            borderBottom: isActive
                                ? '2px solid var(--color-accent)'
                                : '2px solid transparent',
                            borderRight: '1px solid var(--color-divider-faint)',
                            transition: 'all 0.1s',
                            whiteSpace: 'nowrap',
                            cursor: disabled ? 'default' : 'pointer',
                            opacity: disabled ? 0.55 : 1,
                        }}
                        onMouseEnter={e => {
                            if (!isActive && !disabled) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-soft)';
                        }}
                        onMouseLeave={e => {
                            if (!isActive && !disabled) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-gray)' }}>{mod.icon}</span>
                        {/* Icon-only below xl so all modules stay visible and clickable */}
                        <span className="hidden 2xl:inline">{mod.label}</span>

                        {disabled && (
                            <span className="hidden 2xl:inline" style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-text-dim)', border: '1px solid var(--color-divider)', padding: '0 3px', borderRadius: 2 }}>
                                SOON
                            </span>
                        )}

                        {!disabled && badge != null && badge > 0 && (
                            <span
                                className="absolute top-1.5 right-1 flex items-center justify-center"
                                style={{
                                    minWidth: 14, height: 14,
                                    fontSize: 9, fontWeight: 700,
                                    background: mod.id === 'orders' ? 'var(--color-red-alt)' : 'var(--color-amber-alt)',
                                    color: '#000',
                                    padding: '0 3px',
                                }}
                            >
                                {badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
