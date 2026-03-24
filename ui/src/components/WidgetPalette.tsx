import React from 'react';
import { X } from 'lucide-react';
import {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays,
    FileText, TrendingUp, Grid3x3,
} from 'lucide-react';
import type { WidgetType } from '../stores/workspaceStore';
import { WIDGET_LIST } from '../widgets/registry';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays, FileText, TrendingUp, Grid3x3,
};

interface WidgetPaletteProps {
    isOpen: boolean;
    onAddWidget: (type: WidgetType) => void;
    onClose: () => void;
    className?: string;
}

const CATEGORIES: { label: string; types: WidgetType[] }[] = [
    { label: 'Charts', types: ['Chart'] },
    { label: 'Trading', types: ['OrderEntry', 'Positions', 'Orders', 'PriceAlert'] },
    { label: 'Data', types: ['Watchlist', 'MarketDepth', 'OptionChain', 'Scanner', 'HeatMap'] },
    { label: 'Analytics', types: ['AccountSummary', 'Alerts', 'NewsFeed', 'EconomicCalendar', 'Notes'] },
];

export function WidgetPalette({ isOpen, onAddWidget, onClose, className }: WidgetPaletteProps) {
    return (
        <div
            className={className}
            style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: 200,
                background: '#12121a', borderRight: '1px solid #2a2a3a',
                transform: isOpen ? 'translateX(0)' : 'translateX(-200px)',
                transition: 'transform 0.25s ease',
                display: 'flex', flexDirection: 'column', zIndex: 100,
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderBottom: '1px solid #2a2a3a',
                background: '#0a0a0f',
            }}>
                <span style={{
                    color: '#00f0ff', fontSize: 10, fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: 2,
                }}>
                    WIDGET PALETTE
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a7a', padding: 2 }}
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
                            color: '#6a6a7a', fontSize: 9, fontFamily: 'monospace',
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            borderTop: ci > 0 ? '1px solid #1e1e2a' : 'none',
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
                                    {IconComp && <IconComp size={14} color="#6a6a7a" />}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            color: '#e0e0e8', fontSize: 11,
                                            fontFamily: 'monospace', lineHeight: '1.2',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {entry.label}
                                        </div>
                                        <div style={{
                                            color: '#6a6a7a', fontSize: 9,
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
