/**
 * MarketTabBar — multi-tab market watcher bar docked below the navbar.
 * Each tab is an independent symbol/watchlist focus.
 */
import { useState, useRef } from 'react';
import { Plus, X, Link, Link2Off, Star, BarChart2, Briefcase, TrendingUp, ChevronDown } from 'lucide-react';
import { useTabContext, type MarketTab, type TabType } from '../context/TabContext';
import { useTerminal } from '../stores/terminalStore';

// ─── Tab type icons ───────────────────────────────────────────────────────────

const TAB_ICONS: Record<TabType, React.ReactNode> = {
    symbol:    <BarChart2  size={10} />,
    watchlist: <Star       size={10} />,
    market:    <TrendingUp size={10} />,
    portfolio: <Briefcase  size={10} />,
    strategy:  <Link       size={10} />,
};

// ─── Mock price data ──────────────────────────────────────────────────────────

const MOCK_PRICES: Record<string, { price: number; pct: number }> = {
    'BTC/USD': { price: 63248.5, pct:  1.42 },
    'ETH/USD': { price:  3284.2, pct:  0.87 },
    'AAPL':    { price:   172.5, pct: -0.31 },
    'TSLA':    { price:   164.8, pct: -2.12 },
    'NVDA':    { price:   879.4, pct:  3.21 },
    'MSFT':    { price:   413.2, pct:  0.64 },
    'GOOG':    { price:   178.1, pct:  0.92 },
    'SPY':     { price:   521.3, pct:  0.27 },
};

// ─── New Tab Modal ────────────────────────────────────────────────────────────

function NewTabModal({ onClose, onAdd }: { onClose: () => void; onAdd: (tab: Omit<MarketTab, 'id'>) => void }) {
    const [type, setType]   = useState<TabType>('symbol');
    const [name, setName]   = useState('');
    const [symbol, setSymbol] = useState('');

    const handleAdd = () => {
        if (!name.trim()) return;
        onAdd({
            type, name: name.trim(),
            symbol:  type === 'symbol' ? symbol.toUpperCase() : undefined,
            symbols: type === 'watchlist' ? [symbol.toUpperCase()].filter(Boolean) : undefined,
            synced: true, pinned: false,
        });
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9000,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)',
                    padding: 20, width: 320, boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)', margin: '0 0 14px', letterSpacing: '0.06em' }}>
                    ADD NEW TAB
                </p>

                {/* Type selector */}
                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>TAB TYPE</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(['symbol','watchlist','market','portfolio','strategy'] as TabType[]).map(t => (
                            <button key={t} onClick={() => setType(t)}
                                style={{
                                    padding: '4px 10px', fontSize: 10, fontFamily: 'monospace',
                                    color: type === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                    background: type === t ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : 'transparent',
                                    border: type === t ? '1px solid color-mix(in srgb, var(--color-accent) 33%, transparent)' : '1px solid rgba(255,255,255,0.08)',
                                    cursor: 'pointer', textTransform: 'uppercase',
                                }}
                            >{t}</button>
                        ))}
                    </div>
                </div>

                {/* Name */}
                <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>NAME</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="My Tab"
                        style={{
                            width: '100%', background: 'var(--color-bg-deep)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--color-text-bright)', fontSize: 12, padding: '6px 8px', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Symbol (for symbol / watchlist tabs) */}
                {(type === 'symbol' || type === 'watchlist') && (
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                            {type === 'symbol' ? 'SYMBOL' : 'SYMBOLS (comma-separated)'}
                        </label>
                        <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder={type === 'symbol' ? 'AAPL' : 'AAPL, TSLA, NVDA'}
                            style={{
                                width: '100%', background: 'var(--color-bg-deep)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--color-text-bright)', fontSize: 12, padding: '6px 8px', outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onClose}
                        style={{ padding: '6px 16px', fontSize: 11, color: 'var(--color-text-muted)', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleAdd}
                        style={{ padding: '6px 16px', fontSize: 11, color: '#000', background: 'var(--color-accent)', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Add Tab
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function TabContextMenu({
    tab, pos, onClose, onRename, onDuplicate, onTogglePin, onToggleSync, onRemove,
}: {
    tab: MarketTab; pos: { x: number; y: number }; onClose: () => void;
    onRename: () => void; onDuplicate: () => void; onTogglePin: () => void;
    onToggleSync: () => void; onRemove: () => void;
}) {
    const items = [
        { label: 'Rename',          action: onRename },
        { label: 'Duplicate',       action: onDuplicate },
        { label: tab.synced ? 'Isolate (unlink)' : 'Sync (link)', action: onToggleSync },
        { label: tab.pinned ? 'Unpin' : 'Pin',                   action: onTogglePin },
        { label: 'Close', action: onRemove, danger: !tab.pinned, disabled: tab.pinned },
    ];
    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 8998 }} onClick={onClose} />
            <div style={{
                position: 'fixed', left: pos.x, top: pos.y, zIndex: 8999,
                background: 'var(--color-surface-alt)', border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 160, boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}>
                {items.map(item => (
                    <button key={item.label}
                        disabled={item.disabled}
                        onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '7px 14px', fontSize: 11,
                            color: item.danger ? 'var(--color-red-alt)' : item.disabled ? 'var(--color-icon-dim)' : 'var(--color-text-secondary)',
                            background: 'transparent', border: 'none', cursor: item.disabled ? 'default' : 'pointer',
                        }}
                        onMouseEnter={e => { if (!item.disabled) (e.currentTarget.style.background = '#ffffff08'); }}
                        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent'); }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MarketTabBar() {
    const { tabs, activeTab, addTab, removeTab, setActiveTab, updateTab, reorderTabs } = useTabContext();
    const { setSymbol } = useTerminal();
    const [showNewModal,   setShowNewModal]   = useState(false);
    const [contextMenu, setContextMenu] = useState<{ tab: MarketTab; pos: { x: number; y: number } } | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const dragIdx = useRef<number | null>(null);

    const handleTabClick = (tab: MarketTab) => {
        setActiveTab(tab.id);
        if (tab.synced && tab.symbol) setSymbol(tab.symbol);
    };

    const handleContextMenu = (e: React.MouseEvent, tab: MarketTab) => {
        e.preventDefault();
        setContextMenu({ tab, pos: { x: e.clientX, y: e.clientY } });
    };

    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDragOver  = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === idx) return;
        const next = [...tabs];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(idx, 0, moved);
        dragIdx.current = idx;
        reorderTabs(next);
    };

    return (
        <>
            <div
                style={{
                    height: 32, background: 'var(--color-bg-deeper)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'stretch',
                    overflowX: 'auto', overflowY: 'hidden',
                    scrollbarWidth: 'none', userSelect: 'none',
                }}
            >
                {tabs.map((tab, idx) => {
                    const isActive = activeTab?.id === tab.id;
                    const data = tab.symbol ? MOCK_PRICES[tab.symbol] : null;
                    const isRenaming = renamingId === tab.id;

                    return (
                        <div
                            key={tab.id}
                            draggable
                            onDragStart={() => handleDragStart(idx)}
                            onDragOver={e => handleDragOver(e, idx)}
                            onClick={() => handleTabClick(tab)}
                            onContextMenu={e => handleContextMenu(e, tab)}
                            className="group"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '0 10px',
                                borderRight: '1px solid rgba(255,255,255,0.05)',
                                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                                background: isActive ? 'var(--color-surface-alt)' : 'transparent',
                                cursor: 'pointer', flexShrink: 0, maxWidth: 200,
                                transition: 'background 0.1s',
                            }}
                        >
                            {/* Type icon */}
                            <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-dim)', flexShrink: 0 }}>
                                {TAB_ICONS[tab.type]}
                            </span>

                            {/* Name or rename input */}
                            {isRenaming ? (
                                <input
                                    autoFocus
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    onBlur={() => { updateTab(tab.id, { name: renameValue.trim() || tab.name }); setRenamingId(null); }}
                                    onKeyDown={e => { if (e.key === 'Enter') { updateTab(tab.id, { name: renameValue.trim() || tab.name }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                                    style={{ width: 80, background: 'var(--color-bg-deep)', border: '1px solid color-mix(in srgb, var(--color-accent) 33%, transparent)', color: 'var(--color-text-bright)', fontSize: 10, padding: '1px 4px', fontFamily: 'monospace', outline: 'none' }}
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80 }}>
                                    {tab.name}
                                </span>
                            )}

                            {/* Mini price */}
                            {data && (
                                <span style={{ fontSize: 9, fontFamily: 'monospace', color: data.pct >= 0 ? 'var(--color-green-alt)' : 'var(--color-red-alt)', flexShrink: 0 }}>
                                    {data.pct >= 0 ? '+' : ''}{data.pct.toFixed(2)}%
                                </span>
                            )}

                            {/* Watchlist chips */}
                            {tab.type === 'watchlist' && tab.symbols && (
                                <span style={{ fontSize: 9, color: 'var(--color-text-dim)', flexShrink: 0 }}>
                                    {tab.symbols.slice(0, 3).join(' ')}
                                    {tab.symbols.length > 3 && ` +${tab.symbols.length - 3}`}
                                </span>
                            )}

                            {/* Sync indicator */}
                            <span style={{ color: tab.synced ? 'color-mix(in srgb, var(--color-accent) 33%, transparent)' : 'var(--color-icon-dim)', flexShrink: 0 }}
                                title={tab.synced ? 'Synced to global symbol' : 'Isolated'}
                            >
                                {tab.synced ? <Link size={8} /> : <Link2Off size={8} />}
                            </span>

                            {/* Close button */}
                            {!tab.pinned && (
                                <button
                                    onClick={e => { e.stopPropagation(); removeTab(tab.id); }}
                                    style={{ color: 'var(--color-icon-dim)', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-red-alt)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-icon-dim)')}
                                >
                                    <X size={9} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Add tab button */}
                <button
                    onClick={() => setShowNewModal(true)}
                    style={{
                        display: 'flex', alignItems: 'center', padding: '0 12px',
                        fontSize: 14, color: 'var(--color-icon-dim)', background: 'transparent', border: 'none', cursor: 'pointer',
                        flexShrink: 0, lineHeight: 1,
                    }}
                    title="Add new tab"
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-icon-dim)')}
                >
                    <Plus size={12} />
                </button>

                {/* Overflow indicator */}
                {tabs.length > 8 && (
                    <button style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: 'var(--color-text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <ChevronDown size={10} />
                    </button>
                )}
            </div>

            {/* New Tab Modal */}
            {showNewModal && <NewTabModal onClose={() => setShowNewModal(false)} onAdd={addTab} />}

            {/* Context Menu */}
            {contextMenu && (
                <TabContextMenu
                    tab={contextMenu.tab}
                    pos={contextMenu.pos}
                    onClose={() => setContextMenu(null)}
                    onRename={() => { setRenamingId(contextMenu.tab.id); setRenameValue(contextMenu.tab.name); }}
                    onDuplicate={() => addTab({ ...contextMenu.tab, name: `${contextMenu.tab.name} (copy)`, pinned: false })}
                    onTogglePin={() => updateTab(contextMenu.tab.id, { pinned: !contextMenu.tab.pinned })}
                    onToggleSync={() => updateTab(contextMenu.tab.id, { synced: !contextMenu.tab.synced })}
                    onRemove={() => { if (!contextMenu.tab.pinned) removeTab(contextMenu.tab.id); }}
                />
            )}
        </>
    );
}
