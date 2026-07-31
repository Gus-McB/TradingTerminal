/**
 * PopoutWorkspacePage — a full, editable workspace in its own window.
 *
 * This is a peer of the main canvas, not a mirror: the window owns its own
 * dock layout (persisted per workspace), so monitor 2 can be a purpose-built
 * crypto desk while monitor 1 runs equities. Symbol channels stay shared via
 * terminalSync, so linked panes still follow the main window.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import {
    DockviewReact,
    themeDark,
    type DockviewReadyEvent,
    type DockviewApi,
    type SerializedDockview,
    type IWatermarkPanelProps,
} from 'dockview-react';
import { PanelLeftOpen, Lock, LockOpen } from 'lucide-react';

import { useWorkspaceStore, type WidgetType } from '../stores/workspaceStore';
import { useDockUiStore } from '../stores/dockUiStore';
import {
    addWidgetPanel, buildDockFromGrid, PANEL_COMPONENT, TAB_COMPONENT,
    type WidgetPanelParams,
} from '../services/dockLayout';
import { WidgetPanel } from '../components/dock/WidgetPanel';
import { WidgetTab } from '../components/dock/WidgetTab';
import { WidgetPalette } from '../components/WidgetPalette';
import { WidgetConfigPanel } from '../components/WidgetConfigPanel';

const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

const DOCK_COMPONENTS = { [PANEL_COMPONENT]: WidgetPanel };
const DOCK_TABS = { [TAB_COMPONENT]: WidgetTab };
const PERSIST_DEBOUNCE_MS = 500;

function Watermark(_props: IWatermarkPanelProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: 'var(--color-bg)' }}>
            <span style={{ color: 'var(--color-text-faint)', fontFamily: 'monospace', fontSize: 12 }}>
                [ EMPTY WORKSPACE ]
            </span>
            <span style={{ color: 'var(--color-border-strong)', fontSize: 11 }}>
                Add widgets from the palette
            </span>
        </div>
    );
}

export function PopoutWorkspacePage() {
    const { id } = useParams();
    const workspaces = useWorkspaceStore(s => s.workspaces);
    const setDockLayout = useWorkspaceStore(s => s.setDockLayout);
    const workspace = workspaces.find(w => w.id === id);

    const locked = useDockUiStore(s => s.locked);
    const setLocked = useDockUiStore(s => s.setLocked);
    const configPanelId = useDockUiStore(s => s.configPanelId);
    const setConfigPanel = useDockUiStore(s => s.setConfigPanel);
    const setApi = useDockUiStore(s => s.setApi);

    const [isPaletteOpen, setIsPaletteOpen] = useState(false);

    const apiRef = useRef<DockviewApi | null>(null);
    const loadingRef = useRef(false);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Persistence (this window edits the same workspace record) ───────────

    const persistNow = useCallback(() => {
        const api = apiRef.current;
        if (!api || !id || loadingRef.current) return;
        setDockLayout(id, api.toJSON());
    }, [id, setDockLayout]);

    const schedulePersist = useCallback(() => {
        if (loadingRef.current) return;
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
    }, [persistNow]);

    const load = useCallback((api: DockviewApi) => {
        const ws = useWorkspaceStore.getState().workspaces.find(w => w.id === id);
        if (!ws) return;
        loadingRef.current = true;
        try {
            api.clear();
            if (ws.dockLayout) {
                try {
                    api.fromJSON(ws.dockLayout as SerializedDockview);
                } catch {
                    api.clear();
                    buildDockFromGrid(api, ws.layout.widgets);
                }
            } else {
                buildDockFromGrid(api, ws.layout.widgets);
            }
        } finally {
            loadingRef.current = false;
        }
    }, [id]);

    const onReady = useCallback((event: DockviewReadyEvent) => {
        apiRef.current = event.api;
        setApi(event.api);
        event.api.onDidLayoutChange(() => schedulePersist());
        load(event.api);
    }, [load, schedulePersist, setApi]);

    // Follow layout edits made in other windows (main window, or a sibling
    // pop-out) — localStorage 'storage' fires cross-window on the same origin
    useEffect(() => {
        const handler = async (e: StorageEvent) => {
            if (e.key !== 'trading-terminal-workspaces-v2') return;
            await useWorkspaceStore.persist.rehydrate();
            // Only reload when this window isn't the one mid-edit
            if (!persistTimer.current && apiRef.current) load(apiRef.current);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [load]);

    useEffect(() => () => {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistNow();
        setApi(null);
        setConfigPanel(null);
    }, [persistNow, setApi, setConfigPanel]);

    const handleAddWidget = useCallback((type: WidgetType) => {
        const api = apiRef.current;
        if (api) addWidgetPanel(api, type);
    }, []);

    const configTarget = (() => {
        const api = apiRef.current;
        if (!api || !configPanelId) return null;
        const panel = api.getPanel(configPanelId);
        const params = panel?.params as WidgetPanelParams | undefined;
        if (!panel || !params?.type) return null;
        return { id: panel.id, type: params.type, config: params.config ?? {}, x: 0, y: 0, w: 0, h: 0 };
    })();

    const handleApplyConfig = useCallback((widgetId: string, config: Record<string, unknown>) => {
        const panel = apiRef.current?.getPanel(widgetId);
        if (panel) {
            const params = panel.params as WidgetPanelParams;
            panel.api.updateParameters({ config: { ...(params.config ?? {}), ...config } });
            schedulePersist();
        }
        setConfigPanel(null);
    }, [schedulePersist, setConfigPanel]);

    if (!workspace) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    Workspace not found
                </span>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)', position: 'relative' }}>
            {/* Title / drag strip */}
            <div
                className="flex items-center justify-between px-3 shrink-0"
                style={{
                    ...dragRegion,
                    height: 30,
                    background: 'var(--color-bg-deep)',
                    borderBottom: '1px solid var(--color-border)',
                    userSelect: 'none',
                }}
            >
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                    {workspace.name}
                </span>
                <button
                    style={{ ...noDrag, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
                    onClick={() => window.close()}
                    title="Close"
                >
                    ×
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {isPaletteOpen && (
                    <WidgetPalette
                        isOpen={isPaletteOpen}
                        onAddWidget={handleAddWidget}
                        onClose={() => setIsPaletteOpen(false)}
                    />
                )}

                <div className="flex-1 overflow-hidden">
                    <DockviewReact
                        theme={themeDark}
                        components={DOCK_COMPONENTS}
                        tabComponents={DOCK_TABS}
                        watermarkComponent={Watermark}
                        onReady={onReady}
                        locked={locked}
                        disableDnd={locked}
                    />
                </div>

                <WidgetConfigPanel
                    widget={configTarget}
                    workspaceId={workspace.id}
                    onClose={() => setConfigPanel(null)}
                    onApply={handleApplyConfig}
                />
            </div>

            {/* Floating actions (wrapper is click-transparent) */}
            <div
                className="absolute bottom-4 right-4 flex flex-col gap-2 items-end"
                style={{ zIndex: 100, pointerEvents: 'none' }}
            >
                {!locked && (
                    <button
                        onClick={() => setIsPaletteOpen(v => !v)}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{
                            background: isPaletteOpen ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                            border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
                            color: isPaletteOpen ? '#000' : 'var(--color-accent)',
                            fontSize: 11, fontWeight: 600, pointerEvents: 'auto',
                        }}
                        title="Add widget"
                    >
                        <PanelLeftOpen size={13} />
                        Add Widget
                    </button>
                )}
                <button
                    onClick={() => setLocked(!locked)}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                        background: locked ? 'var(--color-amber)' : 'var(--color-surface-alt)',
                        border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                        color: locked ? '#000' : 'var(--color-amber)',
                        fontSize: 11, fontWeight: 600, pointerEvents: 'auto',
                    }}
                    title={locked ? 'Unlock layout' : 'Lock layout'}
                >
                    {locked ? <Lock size={13} /> : <LockOpen size={13} />}
                    {locked ? 'Locked' : 'Lock'}
                </button>
            </div>
        </div>
    );
}
