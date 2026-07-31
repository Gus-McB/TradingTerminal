/**
 * WorkspacePage — the main terminal canvas, powered by dockview.
 *
 * Replaces the react-grid-layout page: widgets live in dockable, tabbable,
 * splitter-resizable panes (Bloomberg/IBKR style). The layout is always live —
 * drag tabs to rearrange, close from the tab, add from the palette — with a
 * Lock toggle instead of the old edit/staging mode. Layout persists per
 * workspace (debounced) as serialized dockview JSON; legacy grid workspaces
 * are converted on first open.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DockviewReact,
    themeDark,
    type DockviewReadyEvent,
    type DockviewApi,
    type SerializedDockview,
    type IWatermarkPanelProps,
} from 'dockview-react';
import { PanelLeftOpen, Lock, LockOpen } from 'lucide-react';

import { useWorkspaceStore, type LayoutWidget, type WidgetType } from '../stores/workspaceStore';
import { useDockUiStore } from '../stores/dockUiStore';
import {
    addWidgetPanel, buildDockFromGrid, PANEL_COMPONENT, TAB_COMPONENT,
    type WidgetPanelParams,
} from '../services/dockLayout';
import { WidgetPanel } from '../components/dock/WidgetPanel';
import { WidgetTab } from '../components/dock/WidgetTab';
import { WorkspaceTabBar } from '../components/WorkspaceTabBar';
import { PopOutWorkspaceButton } from '../components/dock/PopOutButton';
import { WidgetPalette } from '../components/WidgetPalette';
import { WidgetConfigPanel } from '../components/WidgetConfigPanel';
import { PromptDialog } from '../components/dialogs/Dialog';

const PERSIST_DEBOUNCE_MS = 500;

const DOCK_COMPONENTS = { [PANEL_COMPONENT]: WidgetPanel };
const DOCK_TABS = { [TAB_COMPONENT]: WidgetTab };

function Watermark(_props: IWatermarkPanelProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: 'var(--color-bg)' }}>
            <span style={{ color: 'var(--color-text-faint)', fontFamily: 'monospace', fontSize: 12 }}>
                [ EMPTY WORKSPACE ]
            </span>
            <span style={{ color: 'var(--color-border-strong)', fontSize: 11 }}>
                Add widgets from the palette (bottom right) or Ctrl+K
            </span>
        </div>
    );
}

export function WorkspacePage() {
    const {
        workspaces,
        activeWorkspaceId,
        setActiveWorkspace,
        renameWorkspace,
        addWorkspace,
        setDockLayout,
    } = useWorkspaceStore();

    const locked = useDockUiStore(s => s.locked);
    const setLocked = useDockUiStore(s => s.setLocked);
    const configPanelId = useDockUiStore(s => s.configPanelId);
    const setConfigPanel = useDockUiStore(s => s.setConfigPanel);
    const setApi = useDockUiStore(s => s.setApi);
    const drainPendingWidgets = useDockUiStore(s => s.drainPendingWidgets);

    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [showNewWorkspace, setShowNewWorkspace] = useState(false);

    const apiRef = useRef<DockviewApi | null>(null);
    const loadingRef = useRef(false);
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadedWorkspaceRef = useRef<string | null>(null);

    // ── Persistence ─────────────────────────────────────────────────────────

    const persistNow = useCallback(() => {
        const api = apiRef.current;
        const wsId = loadedWorkspaceRef.current;
        if (!api || !wsId || loadingRef.current) return;
        setDockLayout(wsId, api.toJSON());
    }, [setDockLayout]);

    const schedulePersist = useCallback(() => {
        if (loadingRef.current) return;
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(persistNow, PERSIST_DEBOUNCE_MS);
    }, [persistNow]);

    // ── Workspace loading (incl. legacy grid migration) ─────────────────────

    const loadWorkspace = useCallback((api: DockviewApi, workspaceId: string) => {
        const ws = useWorkspaceStore.getState().workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        loadingRef.current = true;
        try {
            api.clear();
            if (ws.dockLayout) {
                try {
                    api.fromJSON(ws.dockLayout as SerializedDockview);
                } catch (err) {
                    console.error('[Workspace] failed to restore dock layout, rebuilding from grid:', err);
                    api.clear();
                    buildDockFromGrid(api, ws.layout.widgets);
                }
            } else {
                // First open since the dock overhaul — convert the grid layout
                buildDockFromGrid(api, ws.layout.widgets);
            }

            // Widgets queued by the command palette while another page was open
            for (const type of drainPendingWidgets()) {
                addWidgetPanel(api, type);
            }
        } finally {
            loadingRef.current = false;
        }

        loadedWorkspaceRef.current = workspaceId;
        // Make the dock layout authoritative immediately (covers migration)
        setDockLayout(workspaceId, api.toJSON());
    }, [drainPendingWidgets, setDockLayout]);

    const onReady = useCallback((event: DockviewReadyEvent) => {
        apiRef.current = event.api;
        setApi(event.api);
        event.api.onDidLayoutChange(() => schedulePersist());
        loadWorkspace(event.api, useWorkspaceStore.getState().activeWorkspaceId);
    }, [loadWorkspace, schedulePersist, setApi]);

    // Switch workspaces: flush the outgoing layout, load the incoming one
    useEffect(() => {
        const api = apiRef.current;
        if (!api || loadedWorkspaceRef.current === activeWorkspaceId) return;
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistNow();
        loadWorkspace(api, activeWorkspaceId);
    }, [activeWorkspaceId, loadWorkspace, persistNow]);

    // Unmount: flush + release the shared API handle
    useEffect(() => () => {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistNow();
        setApi(null);
        setConfigPanel(null);
    }, [persistNow, setApi, setConfigPanel]);

    // ── Widget actions ──────────────────────────────────────────────────────

    const handleAddWidget = useCallback((type: WidgetType) => {
        const api = apiRef.current;
        if (api) addWidgetPanel(api, type);
    }, []);

    // Config panel target, synthesized from the live panel's params
    const configTarget: LayoutWidget | null = (() => {
        const api = apiRef.current;
        if (!api || !configPanelId) return null;
        const panel = api.getPanel(configPanelId);
        if (!panel) return null;
        const params = panel.params as WidgetPanelParams | undefined;
        if (!params?.type) return null;
        return { id: panel.id, type: params.type, config: params.config ?? {}, x: 0, y: 0, w: 0, h: 0 };
    })();

    const handleApplyConfig = useCallback((widgetId: string, config: Record<string, unknown>) => {
        const api = apiRef.current;
        const panel = api?.getPanel(widgetId);
        if (panel) {
            const params = panel.params as WidgetPanelParams;
            panel.api.updateParameters({ config: { ...(params.config ?? {}), ...config } });
            schedulePersist();
        }
        setConfigPanel(null);
    }, [schedulePersist, setConfigPanel]);

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-bg)', position: 'relative' }}>
            <WorkspaceTabBar
                workspaces={workspaces.map(w => ({ id: w.id, name: w.name }))}
                activeId={activeWorkspaceId}
                onSelect={setActiveWorkspace}
                onAdd={() => setShowNewWorkspace(true)}
                onRename={renameWorkspace}
            />

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
                    workspaceId={activeWorkspaceId}
                    onClose={() => setConfigPanel(null)}
                    onApply={handleApplyConfig}
                />
            </div>

            {/* Floating actions — wrapper is click-transparent so it never
                blocks widget content between/around the buttons */}
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
                            fontSize: 11, fontWeight: 600,
                            pointerEvents: 'auto',
                        }}
                        title="Add widget"
                    >
                        <PanelLeftOpen size={13} />
                        Add Widget
                    </button>
                )}
                {/* Send the whole workspace to another monitor */}
                <PopOutWorkspaceButton workspaceId={activeWorkspaceId} />
                <button
                    onClick={() => setLocked(!locked)}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                        background: locked ? 'var(--color-amber)' : 'var(--color-surface-alt)',
                        border: '1px solid color-mix(in srgb, var(--color-amber) 40%, transparent)',
                        color: locked ? '#000' : 'var(--color-amber)',
                        fontSize: 11, fontWeight: 600,
                        pointerEvents: 'auto',
                    }}
                    title={locked ? 'Unlock layout (enable drag/close)' : 'Lock layout (prevent accidental changes)'}
                >
                    {locked ? <Lock size={13} /> : <LockOpen size={13} />}
                    {locked ? 'Locked' : 'Lock'}
                </button>
            </div>

            {showNewWorkspace && (
                <PromptDialog
                    title="NEW WORKSPACE"
                    placeholder="Workspace name"
                    confirmLabel="Create"
                    onSubmit={name => { setActiveWorkspace(addWorkspace(name, 'blank')); setShowNewWorkspace(false); }}
                    onCancel={() => setShowNewWorkspace(false)}
                />
            )}
        </div>
    );
}
