/**
 * TradingNavbar — IBKR/Bloomberg-style horizontal taskbar.
 *
 * Composition shell only — each zone is its own component:
 *   [Brand] | [ModuleLauncher] | [MarketStrip] | [CommandBar] | [SystemTray]
 *   [PanelTabs]  (collapsible secondary row)
 *
 * Mock data is quarantined in ../navbar/mockData.ts.
 */
import { useState, useCallback } from 'react';
import { LayoutDashboard, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { ModuleLauncher } from '../navbar/ModuleLauncher';
import { MarketStrip }    from '../navbar/MarketStrip';
import { CommandBar }     from '../navbar/CommandBar';
import { SystemTray }     from '../navbar/SystemTray';
import { PanelTabs, type OpenPanel } from '../navbar/PanelTabs';

export function TradingNavbar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [secondaryOpen, setSecondaryOpen] = useState(true);

    const [panels, setPanels] = useState<OpenPanel[]>([
        { id: 'charts',    label: 'Charts — BTC/USD' },
        { id: 'watchlist', label: 'Watchlist' },
        { id: 'orders',    label: 'Order Entry' },
    ]);
    const [activePanel, setActivePanel] = useState('charts');

    const closePanel = useCallback((id: string) => {
        setPanels(prev => prev.filter(p => p.id !== id));
    }, []);

    const addPanel = useCallback(() => {
        const id = `panel-${Date.now()}`;
        setPanels(prev => [...prev, { id, label: 'New Panel' }]);
        setActivePanel(id);
    }, []);

    return (
        <div
            className="w-full select-none"
            style={{
                fontFamily: "'DM Sans', 'IBM Plex Sans', system-ui, sans-serif",
                // Stacking context above the dockview canvas so navbar
                // dropdowns (account / alerts / profile) paint over panels
                position: 'relative',
                zIndex: 300,
            }}
        >
            {/* ── Primary bar ─────────────────────────────────────────────── */}
            <div
                className="w-full flex items-stretch"
                style={{
                    height: 48,
                    background: 'var(--color-bg-deep)',
                    borderBottom: '1px solid var(--color-divider)',
                }}
            >
                {/* Brand */}
                <div
                    className="flex items-center gap-2 px-3 shrink-0"
                    style={{ borderRight: '1px solid var(--color-divider)' }}
                >
                    <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                            width: 28, height: 28,
                            background: 'color-mix(in srgb, var(--color-accent) 20%, transparent)',
                            border: '1px solid color-mix(in srgb, var(--color-accent) 33%, transparent)',
                        }}
                    >
                        <Zap size={14} color="var(--color-accent)" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-bright)', letterSpacing: '0.08em' }}>
                            APEX
                        </span>
                        <span style={{ fontSize: 9, color: 'var(--color-accent)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                            TERMINAL
                        </span>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="ml-2 flex items-center justify-center"
                        style={{
                            width: 28, height: 28,
                            background: pathname === '/' ? 'color-mix(in srgb, var(--color-accent) 9%, transparent)' : 'transparent',
                            border: pathname === '/' ? '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)' : '1px solid transparent',
                            color: pathname === '/' ? 'var(--color-accent)' : 'var(--color-text-steel)',
                            transition: 'all 0.12s',
                        }}
                        title="Workspace"
                    >
                        <LayoutDashboard size={14} />
                    </button>
                </div>

                <ModuleLauncher />
                <MarketStrip />
                <CommandBar />
                <SystemTray
                    secondaryOpen={secondaryOpen}
                    onToggleSecondary={() => setSecondaryOpen(v => !v)}
                />
            </div>

            {/* ── Secondary taskbar ───────────────────────────────────────── */}
            {secondaryOpen && (
                <PanelTabs
                    panels={panels}
                    activePanel={activePanel}
                    onSelect={setActivePanel}
                    onClose={closePanel}
                    onAdd={addPanel}
                    onReorder={setPanels}
                />
            )}
        </div>
    );
}
