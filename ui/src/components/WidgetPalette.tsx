import React from 'react';
import { X } from 'lucide-react';
import {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays,
    FileText, TrendingUp, Grid3x3, Zap,
} from 'lucide-react';
import type { WidgetType } from '../stores/workspaceStore';
import { WIDGET_LIST } from '../widgets/registry';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays, FileText, TrendingUp, Grid3x3, Zap,
};

interface WidgetPaletteProps {
    isOpen: boolean;
    onAddWidget: (type: WidgetType) => void;
    onClose: () => void;
    className?: string;
}

const CATEGORIES: { label: string; types: WidgetType[] }[] = [
    { label: 'Charts', types: ['Chart'] },
    { label: 'Trading', types: ['OrderEntry', 'Positions', 'Orders', 'PriceAlert', 'Algo'] },
    { label: 'Data', types: ['Watchlist', 'MarketDepth', 'OptionChain', 'Scanner', 'HeatMap'] },
    { label: 'Analytics', types: ['AccountSummary', 'Alerts', 'NewsFeed', 'EconomicCalendar', 'Notes'] },
];

export function WidgetPalette({ isOpen, onAddWidget, onClose, className }: WidgetPaletteProps) {
    if (!isOpen) return null;

    return (
        // In-flow sidebar beside the dock — never overlaps the navbar or panels
        <div
            className={className}
            style={{
                width: 200, height: '100%', flexShrink: 0,
                background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
            }}>
                <span style={{
                    color: 'var(--color-cyan)', fontSize: 10, fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: 2,
                }}>
                    WIDGET PALETTE
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Categories */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {CATEGORIES.map((cat, ci) => (
                    <div key={cat.label}>
                        {/* Category divider */}
                        <div style={{
                            padding: '6px 12px 4px',
                            color: 'var(--color-text-muted)', fontSize: 9, fontFamily: 'monospace',
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            borderTop: ci > 0 ? '1px solid var(--color-raised)' : 'none',
                            marginTop: ci > 0 ? 4 : 0,
                        }}>
                            {cat.label}
                        </div>

                        {cat.types.map(type => {
                            const entry = WIDGET_LIST.find(w => w.type === type);
                            if (!entry) return null;
                            const IconComp = ICONS[entry.icon];
                            const { w, h } = entry.defaultSize;
                            return (
                                <button
                                    key={type}
                                    onClick={() => onAddWidget(type)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 9,
                                        width: '100%', padding: '7px 12px',
                                        background: 'transparent', border: 'none',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1a28')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {IconComp && <IconComp size={14} color="var(--color-text-muted)" />}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            color: 'var(--color-text)', fontSize: 11,
                                            fontFamily: 'monospace', lineHeight: '1.2',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {entry.label}
                                        </div>
                                        <div style={{
                                            color: 'var(--color-text-muted)', fontSize: 9,
                                            fontFamily: 'monospace', marginTop: 1,
                                        }}>
                                            {w}&times;{h}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
