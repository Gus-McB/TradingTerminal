/**
 * ModuleLauncher — the horizontal module (app) launcher strip in the navbar.
 */
import type { ReactNode } from 'react';
import {
    Briefcase, Star, ShoppingCart, BarChart2, ScanLine,
    Link2, Newspaper, ShieldAlert, Wallet,
} from 'lucide-react';
import { MOCK_MODULE_BADGES } from './mockData';

interface Module {
    id: string;
    label: string;
    icon: ReactNode;
}

const MODULES: Module[] = [
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase    size={13} /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Star         size={13} /> },
    { id: 'orders',    label: 'Orders',    icon: <ShoppingCart size={13} /> },
    { id: 'charts',    label: 'Charts',    icon: <BarChart2    size={13} /> },
    { id: 'scanner',   label: 'Scanner',   icon: <ScanLine     size={13} /> },
    { id: 'options',   label: 'Options',   icon: <Link2        size={13} /> },
    { id: 'news',      label: 'News',      icon: <Newspaper    size={13} /> },
    { id: 'risk',      label: 'Risk',      icon: <ShieldAlert  size={13} /> },
    { id: 'account',   label: 'Account',   icon: <Wallet       size={13} /> },
];

interface ModuleLauncherProps {
    activeModule: string;
    onSelect: (id: string) => void;
}

export function ModuleLauncher({ activeModule, onSelect }: ModuleLauncherProps) {
    return (
        <div
            className="flex items-stretch overflow-x-auto"
            style={{
                borderRight: '1px solid var(--color-divider)',
                scrollbarWidth: 'none',
                flex: '0 1 auto',
                minWidth: 0,
            }}
        >
            {MODULES.map(mod => {
                const isActive = activeModule === mod.id;
                const badge = MOCK_MODULE_BADGES[mod.id];
                return (
                    <button
                        key={mod.id}
                        onClick={() => onSelect(mod.id)}
                        className="relative flex items-center gap-1.5 px-3 h-full"
                        style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color:      isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                            background: isActive ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)' : 'transparent',
                            borderBottom: isActive
                                ? '2px solid var(--color-accent)'
                                : '2px solid transparent',
                            borderRight: '1px solid var(--color-divider-faint)',
                            transition: 'all 0.1s',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-soft)';
                        }}
                        onMouseLeave={e => {
                            if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-gray)' }}>{mod.icon}</span>
                        {mod.label}

                        {badge != null && badge > 0 && (
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
