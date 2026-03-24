import React, { useState, useEffect, useRef } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import type { LayoutWidget } from '../stores/workspaceStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import type { ConfigField } from '../widgets/registry';
import {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays,
    FileText, TrendingUp, Grid3x3,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    BarChart2, Star, ShoppingCart, Link2, Briefcase, ClipboardList,
    Layers, Newspaper, ScanLine, Wallet, Bell, CalendarDays, FileText, TrendingUp, Grid3x3,
};

const SYMBOL_LIST = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AAPL', 'TSLA', 'MSFT', 'NVDA', 'SPY', 'QQQ'];

const inputStyle: React.CSSProperties = {
    background: '#12121a', border: '1px solid #2a2a3a', color: '#e0e0e8',
    padding: '5px 8px', fontFamily: 'monospace', fontSize: 12, width: '100%',
    outline: 'none', boxSizing: 'border-box',
};

interface WidgetConfigPanelProps {
    widget: LayoutWidget | null;
    workspaceId: string;
    onClose: () => void;
    onApply: (widgetId: string, config: Record<string, unknown>) => void;
    className?: string;
}

function FieldRenderer({
    field, value, onChange,
}: {
    field: ConfigField;
    value: unknown;
    onChange: (v: unknown) => void;
}) {
    const [symbolQuery, setSymbolQuery] = useState(String(value ?? ''));
    const [symbolOpen, setSymbolOpen] = useState(false);
    const symbolRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (symbolRef.current && !symbolRef.current.contains(e.target as Node)) {
                setSymbolOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (field.type === 'text') {
        return (
            <input
                type="text"
                style={inputStyle}
                value={String(value ?? '')}
                onChange={e => onChange(e.target.value)}
            />
        );
    }

    if (field.type === 'number') {
        return (
            <input
                type="number"
                style={inputStyle}
                value={value as number ?? field.min ?? 0}
                min={field.min}
                max={field.max}
                step={field.step ?? 1}
                onChange={e => onChange(Number(e.target.value))}
            />
        );
    }

    if (field.type === 'select') {
        return (
            <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={String(value ?? '')}
                onChange={e => onChange(e.target.value)}
            >
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (field.type === 'multiSelect') {
        const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {field.options?.map(o => {
                    const active = selected.includes(o);
                    return (
                        <button
                            key={o}
                            onClick={() => {
                                const next = active ? selected.filter(s => s !== o) : [...selected, o];
                                onChange(next);
                            }}
                            style={{
                                background: active ? '#00f0ff22' : '#12121a',
                                border: `1px solid ${active ? '#00f0ff' : '#2a2a3a'}`,
                                color: active ? '#00f0ff' : '#6a6a7a',
                                padding: '2px 7px', fontSize: 11, cursor: 'pointer',
                                fontFamily: 'monospace',
                            }}
                        >
                            {o}
                        </button>
                    );
                })}
            </div>
        );
    }

    if (field.type === 'toggle') {
        const on = Boolean(value);
        return (
            <button
                onClick={() => onChange(!on)}
                style={{
                    width: 44, height: 22, background: on ? '#00f0ff' : '#2a2a3a',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    display: 'flex', alignItems: 'center', padding: '0 3px',
                }}
            >
                <span
                    style={{
                        width: 16, height: 16, background: '#0a0a0f',
                        position: 'absolute', transition: 'left 0.2s',
                        left: on ? 24 : 4,
                    }}
                />
            </button>
        );
    }

    if (field.type === 'symbolSearch') {
        const filtered = SYMBOL_LIST.filter(s =>
            s.toLowerCase().includes(symbolQuery.toLowerCase())
        );
        return (
            <div ref={symbolRef} style={{ position: 'relative' }}>
                <input
                    type="text"
                    style={inputStyle}
                    value={symbolQuery}
                    placeholder="Search symbol..."
                    onFocus={() => setSymbolOpen(true)}
                    onChange={e => {
                        setSymbolQuery(e.target.value);
                        setSymbolOpen(true);
                    }}
                />
                {symbolOpen && filtered.length > 0 && (
                    <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: '#12121a', border: '1px solid #2a2a3a', maxHeight: 140, overflowY: 'auto',
                    }}>
                        {filtered.map(s => (
                            <div
                                key={s}
                                onMouseDown={() => { onChange(s); setSymbolQuery(s); setSymbolOpen(false); }}
                                style={{
                                    padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
                                    color: '#e0e0e8', cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2a')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (field.type === 'color') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 24, height: 24, background: String(value ?? '#00f0ff'),
                    border: '1px solid #2a2a3a',
                }} />
                <input
                    type="color"
                    value={String(value ?? '#00f0ff')}
                    onChange={e => onChange(e.target.value)}
                    style={{ width: 40, height: 24, border: 'none', background: 'none', cursor: 'pointer' }}
                />
            </div>
        );
    }

    if (field.type === 'sliderRange') {
        const pair = Array.isArray(value) ? (value as number[]) : [field.min ?? 0, field.max ?? 100];
        return (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                    type="range"
                    min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1}
                    value={pair[0]}
                    onChange={e => onChange([Number(e.target.value), pair[1]])}
                    style={{ flex: 1, accentColor: '#00f0ff' }}
                />
                <span style={{ color: '#6a6a7a', fontSize: 11, fontFamily: 'monospace', minWidth: 24 }}>{pair[0]}</span>
                <input
                    type="range"
                    min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1}
                    value={pair[1]}
                    onChange={e => onChange([pair[0], Number(e.target.value)])}
                    style={{ flex: 1, accentColor: '#00f0ff' }}
                />
                <span style={{ color: '#6a6a7a', fontSize: 11, fontFamily: 'monospace', minWidth: 24 }}>{pair[1]}</span>
            </div>
        );
    }

    return null;
}

export function WidgetConfigPanel({
    widget, onClose, onApply, className,
}: WidgetConfigPanelProps) {
    const [stagedConfig, setStagedConfig] = useState<Record<string, unknown>>({});

    useEffect(() => {
        if (widget) setStagedConfig({ ...widget.config });
    }, [widget]);

    const visible = widget !== null;
    const entry = widget ? WIDGET_REGISTRY[widget.type] : null;
    const IconComp = entry ? ICONS[entry.icon] : null;

    return (
        <div
            className={className}
            style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 320,
                background: '#12121a', borderLeft: '1px solid #2a2a3a',
                transform: visible ? 'translateX(0)' : 'translateX(320px)',
                transition: 'transform 0.25s ease',
                display: 'flex', flexDirection: 'column', zIndex: 100,
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderBottom: '1px solid #2a2a3a',
                background: '#0a0a0f',
            }}>
                {IconComp && <IconComp size={16} color="#00f0ff" />}
                <span style={{ color: '#e0e0e8', fontSize: 12, fontFamily: 'monospace', fontWeight: 600, flex: 1 }}>
                    {entry?.label ?? 'CONFIG'}
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6a6a7a', padding: 2 }}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {entry?.configSchema.length === 0 && (
                    <p style={{ color: '#6a6a7a', fontSize: 12, fontFamily: 'monospace' }}>
                        No configurable options.
                    </p>
                )}
                {entry?.configSchema.map(field => (
                    <div key={field.key}>
                        <label style={{
                            display: 'block', color: '#6a6a7a', fontSize: 11,
                            fontFamily: 'monospace', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1,
                        }}>
                            {field.label}{field.required && <span style={{ color: '#ff3366' }}> *</span>}
                        </label>
                        <FieldRenderer
                            field={field}
                            value={stagedConfig[field.key] ?? field.defaultValue}
                            onChange={v => setStagedConfig(p => ({ ...p, [field.key]: v }))}
                        />
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                padding: '10px 14px', borderTop: '1px solid #2a2a3a',
                display: 'flex', gap: 8,
            }}>
                <button
                    onClick={() => widget && onApply(widget.id, stagedConfig)}
                    style={{
                        flex: 1, background: '#00a8ff', color: '#fff',
                        border: 'none', padding: '7px 0', cursor: 'pointer',
                        fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                >
                    <Check size={13} /> Apply
                </button>
                <button
                    onClick={() => widget && setStagedConfig({ ...widget.config })}
                    style={{
                        background: '#1e1e2a', color: '#6a6a7a',
                        border: '1px solid #2a2a3a', padding: '7px 12px', cursor: 'pointer',
                        fontSize: 12, fontFamily: 'monospace',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}
                >
                    <RotateCcw size={13} /> Reset
                </button>
            </div>
        </div>
    );
}
