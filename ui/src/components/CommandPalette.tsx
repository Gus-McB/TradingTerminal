/**
 * CommandPalette — Ctrl+K keyboard-first entry point.
 *
 * One input, several verbs:
 *   AAPL                     go to symbol (retargets the global channel)
 *   B 100 AAPL LMT 187.50    submit an order to the paper matcher
 *   chart / depth / …        add a widget to the active workspace
 *   scalping                 switch workspace
 *   theme                    toggle dark / light
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { create } from 'zustand';
import { useNavigate } from 'react-router-dom';
import { Search, BarChart2, Star, ArrowRight, LayoutGrid, SunMoon, Zap } from 'lucide-react';
import { useTerminalStore } from '../stores/terminalStore';
import { useAlertStore } from '../stores/alertStore';
import { useOrdersStore } from '../stores/ordersStore';
import { useWorkspaceStore, type WidgetType } from '../stores/workspaceStore';
import { useDockUiStore } from '../stores/dockUiStore';
import { addWidgetPanel } from '../services/dockLayout';
import { WIDGET_LIST, WIDGET_REGISTRY } from '../widgets/registry';
import { useTickerList } from '../services/marketData';
import { parseOrderCommand, fuzzyMatch } from '../services/commandParser';
import { INSTRUMENTS, ASSET_CLASS_LABELS, VENUES, formatPrice } from '@shared/instruments';

// ─── Open/close state (global so navbar + hotkey can drive it) ───────────────

interface PaletteState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useCommandPalette = create<PaletteState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));

// ─── Result model ─────────────────────────────────────────────────────────────

interface PaletteItem {
    id: string;
    section: 'ORDER' | 'SYMBOLS' | 'WIDGETS' | 'WORKSPACES' | 'ACTIONS';
    icon: React.ReactNode;
    label: string;
    hint?: string;
    run: () => void;
}

const MAX_PER_SECTION = 5;

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandPalette() {
    const isOpen = useCommandPalette(s => s.isOpen);
    const open = useCommandPalette(s => s.open);
    const close = useCommandPalette(s => s.close);

    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();
    const setSymbol = useTerminalStore(s => s.setSymbol);
    const theme = useTerminalStore(s => s.theme);
    const setTheme = useTerminalStore(s => s.setTheme);
    const addAlert = useAlertStore(s => s.addAlert);
    const submitOrder = useOrdersStore(s => s.submitOrder);
    const workspaces = useWorkspaceStore(s => s.workspaces);
    const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
    const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
    const addWorkspace = useWorkspaceStore(s => s.addWorkspace);
    const dockApi = useDockUiStore(s => s.api);
    const queueWidget = useDockUiStore(s => s.queueWidget);
    const tickers = useTickerList();

    // Global hotkey
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (isOpen) close(); else open();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, open, close]);

    // Reset + focus on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelected(0);
            // Focus after the overlay mounts
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);

    const launchWidget = useCallback((type: WidgetType) => {
        const def = WIDGET_REGISTRY[type];
        if (dockApi) {
            // Workspace page is mounted — add the panel directly
            addWidgetPanel(dockApi, type);
        } else {
            // Elsewhere in the app — queue it and jump to the workspace
            queueWidget(type);
            navigate('/');
        }
        addAlert({ type: 'info', message: `${def?.label ?? type} added to workspace` });
    }, [dockApi, queueWidget, navigate, addAlert]);

    // ── Build result list ─────────────────────────────────────────────────
    const items = useMemo<PaletteItem[]>(() => {
        const q = query.trim();
        const out: PaletteItem[] = [];

        // 1. Order syntax
        const order = parseOrderCommand(q);
        if (order) {
            out.push({
                id: 'order',
                section: 'ORDER',
                icon: <Zap size={13} />,
                label: `${order.side} ${order.quantity} ${order.symbol} ${order.type}` +
                       (order.limitPrice ? ` @ ${order.limitPrice}` : ''),
                hint: 'submit to paper matcher',
                run: () => {
                    const id = submitOrder({
                        symbol: order.symbol,
                        side: order.side,
                        type: order.type,
                        quantity: order.quantity,
                        limitPrice: order.limitPrice,
                    });
                    addAlert({
                        type: id ? 'info' : 'warn',
                        message: id
                            ? `${order.side} ${order.quantity} ${order.symbol} submitted`
                            : 'Order rejected: not connected to middleware',
                    });
                },
            });
        }

        // 2. Symbols — search the whole instrument catalog (all four asset
        //    classes), not just the symbols a feed happens to be pushing.
        const priceOf = (symbol: string) => tickers.find(t => t.symbol === symbol)?.price;
        const symbolMatches = INSTRUMENTS
            .filter(i => fuzzyMatch(q, i.symbol) || fuzzyMatch(q, i.name) || fuzzyMatch(q, ASSET_CLASS_LABELS[i.assetClass]))
            // Live instruments first, then by symbol
            .sort((a, b) => Number(b.live) - Number(a.live) || a.symbol.localeCompare(b.symbol))
            .slice(0, MAX_PER_SECTION);
        for (const i of symbolMatches) {
            const price = priceOf(i.symbol);
            const venueLabel = VENUES[i.venue].label;
            out.push({
                id: `sym-${i.symbol}`,
                section: 'SYMBOLS',
                icon: <BarChart2 size={13} />,
                label: i.symbol,
                hint: price !== undefined
                    ? `${i.name} · ${venueLabel} · ${formatPrice(i, price)}`
                    : `${i.name} · ${venueLabel}${i.live ? '' : ' · SIM'}`,
                run: () => setSymbol(i.symbol),
            });
        }
        const upper = q.toUpperCase();
        if (q && !order && /^[A-Z0-9][A-Z0-9/.:-]*$/.test(upper) &&
            !symbolMatches.some(i => i.symbol === upper)) {
            out.push({
                id: 'sym-free',
                section: 'SYMBOLS',
                icon: <ArrowRight size={13} />,
                label: `Go to ${upper}`,
                hint: 'set global symbol',
                run: () => setSymbol(upper),
            });
        }

        // 3. Widgets
        for (const w of WIDGET_LIST.filter(w => q && fuzzyMatch(q, w.label)).slice(0, MAX_PER_SECTION)) {
            out.push({
                id: `widget-${w.type}`,
                section: 'WIDGETS',
                icon: <LayoutGrid size={13} />,
                label: `Add ${w.label}`,
                hint: w.description,
                run: () => launchWidget(w.type),
            });
        }

        // 4. Workspaces
        for (const ws of workspaces.filter(w => q && fuzzyMatch(q, w.name)).slice(0, MAX_PER_SECTION)) {
            if (ws.id === activeWorkspaceId) continue;
            out.push({
                id: `ws-${ws.id}`,
                section: 'WORKSPACES',
                icon: <Star size={13} />,
                label: `Switch to ${ws.name}`,
                run: () => setActiveWorkspace(ws.id),
            });
        }
        if (q.toLowerCase().startsWith('new workspace')) {
            const name = q.slice('new workspace'.length).trim() || 'Untitled';
            out.push({
                id: 'ws-new',
                section: 'WORKSPACES',
                icon: <Star size={13} />,
                label: `Create workspace "${name}"`,
                run: () => setActiveWorkspace(addWorkspace(name, 'blank')),
            });
        }

        // 5. Actions
        if (!q || fuzzyMatch(q, 'theme toggle dark light')) {
            out.push({
                id: 'theme',
                section: 'ACTIONS',
                icon: <SunMoon size={13} />,
                label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
                run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
            });
        }

        return out;
    }, [query, tickers, workspaces, activeWorkspaceId, theme,
        submitOrder, addAlert, setSymbol, launchWidget, setActiveWorkspace, addWorkspace, setTheme]);

    const clampedSelected = Math.min(selected, Math.max(items.length - 1, 0));

    const runItem = useCallback((item: PaletteItem | undefined) => {
        if (!item) return;
        item.run();
        close();
    }, [close]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected(s => Math.min(s + 1, items.length - 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected(s => Math.max(s - 1, 0));
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            runItem(items[clampedSelected]);
        }
    };

    // Keep selection visible
    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-idx="${clampedSelected}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [clampedSelected]);

    if (!isOpen) return null;

    let lastSection: string | null = null;

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9500,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: '12vh',
            }}
            onClick={close}
        >
            <div
                style={{
                    width: 520, maxWidth: '90vw',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 12px 60px rgba(0,0,0,0.7)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div
                    className="flex items-center gap-2 px-3"
                    style={{ height: 42, borderBottom: '1px solid var(--color-border)' }}
                >
                    <Search size={14} color="var(--color-text-dim)" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setSelected(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Symbol, order (B 100 AAPL LMT 187.5), widget, workspace…"
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            fontSize: 13, fontFamily: 'monospace', color: 'var(--color-text-bright)',
                        }}
                    />
                    <kbd style={{ fontSize: 9, color: 'var(--color-text-dim)', border: '1px solid var(--color-border)', padding: '1px 5px' }}>
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} style={{ maxHeight: 380, overflowY: 'auto', padding: '4px 0' }}>
                    {items.length === 0 && (
                        <div style={{ padding: '18px 14px', fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                            No matches — try a symbol, "chart", a workspace name, or order syntax.
                        </div>
                    )}
                    {items.map((item, idx) => {
                        const showHeader = item.section !== lastSection;
                        lastSection = item.section;
                        const isSel = idx === clampedSelected;
                        return (
                            <div key={item.id}>
                                {showHeader && (
                                    <div style={{ padding: '6px 14px 2px', fontSize: 9, letterSpacing: '0.12em', color: 'var(--color-text-dim)', fontWeight: 700 }}>
                                        {item.section}
                                    </div>
                                )}
                                <button
                                    data-idx={idx}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left"
                                    style={{
                                        background: isSel ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent',
                                        borderLeft: isSel ? '2px solid var(--color-accent)' : '2px solid transparent',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={() => setSelected(idx)}
                                    onClick={() => runItem(item)}
                                >
                                    <span style={{ color: isSel ? 'var(--color-accent)' : 'var(--color-text-gray)', display: 'flex' }}>
                                        {item.icon}
                                    </span>
                                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-text-bright)', flex: 1 }}>
                                        {item.label}
                                    </span>
                                    {item.hint && (
                                        <span style={{ fontSize: 10, color: 'var(--color-text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.hint}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
