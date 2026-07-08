/**
 * workspaceStore — Zustand store with localStorage persistence.
 * Stores named workspaces, each containing a grid-based widget layout.
 * Swap the persist adapter to sync with a backend API.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Widget Types ─────────────────────────────────────────────────────────────

export type WidgetType =
    | 'Chart' | 'Watchlist' | 'OrderEntry' | 'OptionChain'
    | 'Positions' | 'Orders' | 'MarketDepth' | 'NewsFeed'
    | 'Scanner' | 'AccountSummary' | 'Alerts' | 'EconomicCalendar'
    | 'Notes' | 'PriceAlert' | 'HeatMap' | 'Algo';

// ─── Data Model ──────────────────────────────────────────────────────────────

export interface LayoutWidget {
    id: string;
    type: WidgetType;
    /** Grid column start (0-based, max 12) */
    x: number;
    /** Grid row start (0-based) */
    y: number;
    /** Column span (1-12) */
    w: number;
    /** Row span (1-N) */
    h: number;
    /** Widget-specific config (from configSchema) */
    config: Record<string, unknown>;
    /** Pin the widget to this symbol instead of global activeSymbol */
    pinSymbol?: string;
}

export interface WorkspaceLayout {
    columns: 12;
    rowHeight: number;
    widgets: LayoutWidget[];
}

export interface Workspace {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    layout: WorkspaceLayout;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const WORKSPACE_TEMPLATES: Record<string, { name: string; widgets: Omit<LayoutWidget, 'id'>[] }> = {
    blank: {
        name: 'Blank',
        widgets: [],
    },
    dayTrader: {
        name: 'Day Trader',
        widgets: [
            { type: 'Chart',       x: 0, y: 0, w: 8, h: 5, config: { chartType: 'candlestick', interval: '1m' } },
            { type: 'OrderEntry',  x: 8, y: 0, w: 4, h: 5, config: {} },
            { type: 'Watchlist',   x: 0, y: 5, w: 3, h: 4, config: {} },
            { type: 'Positions',   x: 3, y: 5, w: 9, h: 4, config: {} },
        ],
    },
    optionsTrader: {
        name: 'Options Trader',
        widgets: [
            { type: 'Chart',       x: 0, y: 0, w: 7, h: 5, config: { chartType: 'candlestick', interval: '5m' } },
            { type: 'OptionChain', x: 7, y: 0, w: 5, h: 5, config: {} },
            { type: 'OrderEntry',  x: 0, y: 5, w: 4, h: 4, config: {} },
            { type: 'Positions',   x: 4, y: 5, w: 8, h: 4, config: {} },
        ],
    },
    portfolioMonitor: {
        name: 'Portfolio Monitor',
        widgets: [
            { type: 'AccountSummary', x: 0, y: 0, w: 4, h: 4, config: {} },
            { type: 'Positions',      x: 4, y: 0, w: 8, h: 4, config: {} },
            { type: 'Orders',         x: 0, y: 4, w: 6, h: 4, config: {} },
            { type: 'NewsFeed',       x: 6, y: 4, w: 6, h: 4, config: {} },
        ],
    },
};

// Date.now() alone collides when two workspaces are created in the same millisecond
const newWorkspaceId = () => `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function createFromTemplate(templateKey: string, name?: string): Workspace {
    const tpl  = WORKSPACE_TEMPLATES[templateKey] ?? WORKSPACE_TEMPLATES.blank;
    const now  = new Date().toISOString();
    return {
        id: newWorkspaceId(),
        name: name ?? tpl.name,
        createdAt: now,
        updatedAt: now,
        layout: {
            columns: 12,
            rowHeight: 80,
            widgets: tpl.widgets.map(w => ({
                ...w,
                id: `${w.type}-${Math.random().toString(36).slice(2, 8)}`,
            })),
        },
    };
}

const DEFAULT_WORKSPACE: Workspace = createFromTemplate('dayTrader', 'Morning Scalping');
DEFAULT_WORKSPACE.id = 'ws-default';

// ─── Store ───────────────────────────────────────────────────────────────────

interface WorkspaceStore {
    workspaces: Workspace[];
    activeWorkspaceId: string;

    // Workspace CRUD
    addWorkspace:       (name: string, template?: string) => string;
    removeWorkspace:    (id: string) => void;
    renameWorkspace:    (id: string, name: string) => void;
    setActiveWorkspace: (id: string) => void;
    duplicateWorkspace: (id: string) => string;
    saveWorkspace:      (workspace: Workspace) => void;

    // Widget management
    addWidget:           (workspaceId: string, widget: Omit<LayoutWidget, 'id'>) => void;
    removeWidget:        (workspaceId: string, widgetId: string) => void;
    updateWidgetLayout:  (workspaceId: string, widgetId: string, layout: Partial<Pick<LayoutWidget, 'x'|'y'|'w'|'h'>>) => void;
    updateWidgetConfig:  (workspaceId: string, widgetId: string, config: Record<string, unknown>) => void;
    updateBatchLayouts:  (workspaceId: string, updates: Array<{ id: string; x: number; y: number; w: number; h: number }>) => void;

    // Persistence utilities
    exportWorkspace:  (id: string) => string;
    importWorkspace:  (json: string) => string | null;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
    persist(
        (set, get) => ({
            workspaces: [DEFAULT_WORKSPACE],
            activeWorkspaceId: DEFAULT_WORKSPACE.id,

            // ── Workspace CRUD ──────────────────────────────────────────────

            addWorkspace: (name, template = 'blank') => {
                const ws = createFromTemplate(template, name);
                set(s => ({ workspaces: [...s.workspaces, ws] }));
                return ws.id;
            },

            removeWorkspace: (id) => {
                set(s => ({
                    workspaces: s.workspaces.filter(w => w.id !== id),
                    activeWorkspaceId: s.activeWorkspaceId === id
                        ? (s.workspaces.find(w => w.id !== id)?.id ?? s.workspaces[0]?.id)
                        : s.activeWorkspaceId,
                }));
            },

            renameWorkspace: (id, name) => {
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w
                    ),
                }));
            },

            setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

            duplicateWorkspace: (id) => {
                const src = get().workspaces.find(w => w.id === id);
                if (!src) return '';
                const now = new Date().toISOString();
                const copy: Workspace = {
                    ...JSON.parse(JSON.stringify(src)),
                    id: newWorkspaceId(),
                    name: `${src.name} (copy)`,
                    createdAt: now,
                    updatedAt: now,
                };
                // Give widgets fresh IDs
                copy.layout.widgets = copy.layout.widgets.map(w => ({
                    ...w,
                    id: `${w.type}-${Math.random().toString(36).slice(2, 8)}`,
                }));
                set(s => ({ workspaces: [...s.workspaces, copy] }));
                return copy.id;
            },

            saveWorkspace: (workspace) => {
                set(s => ({
                    workspaces: s.workspaces.some(w => w.id === workspace.id)
                        ? s.workspaces.map(w => w.id === workspace.id ? { ...workspace, updatedAt: new Date().toISOString() } : w)
                        : [...s.workspaces, workspace],
                }));
            },

            // ── Widget management ───────────────────────────────────────────

            addWidget: (workspaceId, widget) => {
                const id = `${widget.type}-${Math.random().toString(36).slice(2, 8)}`;
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === workspaceId
                            ? {
                                ...w,
                                updatedAt: new Date().toISOString(),
                                layout: {
                                    ...w.layout,
                                    widgets: [...w.layout.widgets, { ...widget, id }],
                                },
                            }
                            : w
                    ),
                }));
            },

            removeWidget: (workspaceId, widgetId) => {
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === workspaceId
                            ? {
                                ...w,
                                updatedAt: new Date().toISOString(),
                                layout: {
                                    ...w.layout,
                                    widgets: w.layout.widgets.filter(wid => wid.id !== widgetId),
                                },
                            }
                            : w
                    ),
                }));
            },

            updateWidgetLayout: (workspaceId, widgetId, layout) => {
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === workspaceId
                            ? {
                                ...w,
                                layout: {
                                    ...w.layout,
                                    widgets: w.layout.widgets.map(wid =>
                                        wid.id === widgetId ? { ...wid, ...layout } : wid
                                    ),
                                },
                            }
                            : w
                    ),
                }));
            },

            updateWidgetConfig: (workspaceId, widgetId, config) => {
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === workspaceId
                            ? {
                                ...w,
                                updatedAt: new Date().toISOString(),
                                layout: {
                                    ...w.layout,
                                    widgets: w.layout.widgets.map(wid =>
                                        wid.id === widgetId
                                            ? { ...wid, config: { ...wid.config, ...config } }
                                            : wid
                                    ),
                                },
                            }
                            : w
                    ),
                }));
            },

            updateBatchLayouts: (workspaceId, updates) => {
                const map = new Map(updates.map(u => [u.id, u]));
                set(s => ({
                    workspaces: s.workspaces.map(w =>
                        w.id === workspaceId
                            ? {
                                ...w,
                                layout: {
                                    ...w.layout,
                                    widgets: w.layout.widgets.map(wid => {
                                        const u = map.get(wid.id);
                                        return u ? { ...wid, ...u } : wid;
                                    }),
                                },
                            }
                            : w
                    ),
                }));
            },

            // ── Persistence utilities ────────────────────────────────────────

            exportWorkspace: (id) => {
                const ws = get().workspaces.find(w => w.id === id);
                return ws ? JSON.stringify(ws, null, 2) : '';
            },

            importWorkspace: (json) => {
                try {
                    const ws: Workspace = JSON.parse(json);
                    const now = new Date().toISOString();
                    const imported: Workspace = {
                        ...ws,
                        id: newWorkspaceId(),
                        createdAt: now,
                        updatedAt: now,
                    };
                    set(s => ({ workspaces: [...s.workspaces, imported] }));
                    return imported.id;
                } catch {
                    return null;
                }
            },
        }),
        {
            name: 'trading-terminal-workspaces-v2',
            partialize: (s) => ({
                workspaces: s.workspaces,
                activeWorkspaceId: s.activeWorkspaceId,
            }),
        }
    )
);
