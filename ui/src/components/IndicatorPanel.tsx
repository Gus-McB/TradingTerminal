import { useState } from 'react';
import { X, Eye, EyeOff, Search } from 'lucide-react';

interface IndicatorPanelProps {
    active: Set<string>;
    configs: Record<string, Record<string, number | string>>;
    onAdd: (key: string) => void;
    onRemove: (key: string) => void;
    onUpdateConfig: (key: string, field: string, value: number | string) => void;
    onClose: () => void;
}

interface CatEntry { key: string; label: string; }
interface Category { name: string; items: CatEntry[]; }

const CATEGORIES: Category[] = [
    {
        name: 'Overlays',
        items: [
            { key: 'SMA', label: 'SMA' }, { key: 'EMA', label: 'EMA' },
            { key: 'WMA', label: 'WMA' }, { key: 'BB', label: 'Bollinger Bands' },
            { key: 'VWAP', label: 'VWAP' }, { key: 'Ichimoku', label: 'Ichimoku Cloud' },
            { key: 'ParSAR', label: 'Parabolic SAR' }, { key: 'PivotPoints', label: 'Pivot Points' },
            { key: 'Donchian', label: 'Donchian Channel' }, { key: 'Keltner', label: 'Keltner Channel' },
            { key: 'LinReg', label: 'Linear Regression' }, { key: 'Envelopes', label: 'Price Envelopes' },
        ],
    },
    {
        name: 'Oscillators',
        items: [
            { key: 'RSI', label: 'RSI' }, { key: 'MACD', label: 'MACD' },
            { key: 'Stochastic', label: 'Stochastic' }, { key: 'CCI', label: 'CCI' },
            { key: 'WilliamsR', label: 'Williams %R' }, { key: 'ADX', label: 'ADX' },
            { key: 'Momentum', label: 'Momentum' },
        ],
    },
    {
        name: 'Volume',
        items: [
            { key: 'OBV', label: 'OBV' }, { key: 'Volume', label: 'Volume' },
        ],
    },
    {
        name: 'Volatility',
        items: [
            { key: 'ATR', label: 'ATR' },
        ],
    },
];

const PARAM_LABELS: Record<string, Record<string, string>> = {
    period: { period: 'Period' }, fast: { fast: 'Fast' }, slow: { slow: 'Slow' },
    signal: { signal: 'Signal' }, kPeriod: { kPeriod: 'K Period' },
    dPeriod: { dPeriod: 'D Period' }, emaPeriod: { emaPeriod: 'EMA Period' },
    atrPeriod: { atrPeriod: 'ATR Period' }, mult: { mult: 'Multiplier' },
    step: { step: 'Step' }, max: { max: 'Max' }, pct: { pct: 'Pct %' },
    tenkan: { tenkan: 'Tenkan' }, kijun: { kijun: 'Kijun' }, senkou: { senkou: 'Senkou' },
};
function paramLabel(k: string): string {
    return PARAM_LABELS[k]?.[k] ?? k.charAt(0).toUpperCase() + k.slice(1);
}

const COLORS: Record<string, string> = {
    SMA: '#9b59b6', EMA: '#00f0ff', WMA: '#3498db', BB: '#3498db', VWAP: '#f1c40f',
    Ichimoku: '#00ff6a', ParSAR: '#ffaa00', PivotPoints: '#ff8c00', Donchian: '#1abc9c',
    Keltner: '#e74c3c', LinReg: '#e67e22', Envelopes: '#8e44ad',
    RSI: '#8e44ad', MACD: '#e67e22', Stochastic: '#2ecc71', CCI: '#e74c3c',
    WilliamsR: '#f39c12', ADX: '#1abc9c', Momentum: '#00f0ff',
    OBV: '#00ff6a', Volume: '#6a6a7a', ATR: '#ffaa00',
};

const BG = '#0a0a0f';
const SURFACE = '#12121a';
const BORDER = '#2a2a3a';
const TEXT = '#e0e0e8';
const MUTED = '#6a6a7a';
const CYAN = '#00f0ff';
const FONT = "'JetBrains Mono', monospace";

export function IndicatorPanel({ active, configs, onAdd, onRemove, onUpdateConfig, onClose }: IndicatorPanelProps) {
    const [search, setSearch] = useState('');
    const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

    const toggleHidden = (key: string) => {
        setHiddenKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const filteredCats: Category[] = CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(it =>
            it.label.toLowerCase().includes(search.toLowerCase()) ||
            it.key.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const activeList = Array.from(active);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT,
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                style={{
                    width: 720, maxHeight: '80vh',
                    background: SURFACE, border: `1px solid ${BORDER}`,
                    borderRadius: 6, display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderBottom: `1px solid ${BORDER}`,
                    background: BG,
                }}>
                    <span style={{ color: CYAN, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em' }}>
                        INDICATORS
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                    {/* Left: indicator list */}
                    <div style={{
                        width: 280, borderRight: `1px solid ${BORDER}`,
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        {/* Search */}
                        <div style={{
                            padding: '8px 10px', borderBottom: `1px solid ${BORDER}`,
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Search size={12} color={MUTED} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search indicators..."
                                style={{
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: TEXT, fontSize: 11, fontFamily: FONT, flex: 1,
                                }}
                            />
                        </div>
                        {/* Categories */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
                            {filteredCats.map(cat => (
                                <div key={cat.name}>
                                    <div style={{ padding: '4px 12px', fontSize: 9, color: MUTED, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                        {cat.name}
                                    </div>
                                    {cat.items.map(item => {
                                        const isActive = active.has(item.key);
                                        return (
                                            <button
                                                key={item.key}
                                                onClick={() => !isActive && onAdd(item.key)}
                                                style={{
                                                    width: '100%', textAlign: 'left', padding: '5px 12px',
                                                    background: isActive ? `${CYAN}11` : 'transparent',
                                                    border: 'none', cursor: isActive ? 'default' : 'pointer',
                                                    color: isActive ? CYAN : TEXT, fontSize: 11,
                                                    fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                        background: COLORS[item.key] ?? MUTED,
                                                    }}
                                                />
                                                {item.label}
                                                {isActive && (
                                                    <span style={{ marginLeft: 'auto', fontSize: 9, color: CYAN }}>active</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                            {filteredCats.length === 0 && (
                                <div style={{ padding: '20px 12px', color: MUTED, fontSize: 11, textAlign: 'center' }}>
                                    No indicators found
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: active indicators */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, fontSize: 10, color: MUTED }}>
                            ACTIVE ({activeList.length})
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
                            {activeList.length === 0 && (
                                <div style={{ padding: '30px 12px', color: MUTED, fontSize: 11, textAlign: 'center' }}>
                                    No active indicators — click from the left panel to add
                                </div>
                            )}
                            {activeList.map(key => {
                                const params = configs[key] ?? {};
                                const isHidden = hiddenKeys.has(key);
                                return (
                                    <div
                                        key={key}
                                        style={{
                                            background: BG, border: `1px solid ${BORDER}`,
                                            borderRadius: 4, marginBottom: 6, padding: '8px 10px',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: Object.keys(params).length > 0 ? 6 : 0 }}>
                                            <span
                                                style={{
                                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                                    background: COLORS[key] ?? MUTED,
                                                    opacity: isHidden ? 0.3 : 1,
                                                }}
                                            />
                                            <span style={{ flex: 1, color: TEXT, fontSize: 11, fontWeight: 600 }}>{key}</span>
                                            <button
                                                onClick={() => toggleHidden(key)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isHidden ? MUTED : CYAN, padding: 2 }}
                                                title={isHidden ? 'Show' : 'Hide'}
                                            >
                                                {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                                            </button>
                                            <button
                                                onClick={() => onRemove(key)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 2 }}
                                                title="Remove"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                        {Object.keys(params).length > 0 && (
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {Object.entries(params).map(([field, val]) => (
                                                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: MUTED }}>
                                                        {paramLabel(field)}
                                                        <input
                                                            type="number"
                                                            value={val as number}
                                                            onChange={e => onUpdateConfig(key, field, parseFloat(e.target.value) || 0)}
                                                            style={{
                                                                width: 48, background: SURFACE, border: `1px solid ${BORDER}`,
                                                                borderRadius: 2, color: TEXT, fontSize: 10,
                                                                fontFamily: FONT, padding: '1px 4px', outline: 'none',
                                                            }}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
