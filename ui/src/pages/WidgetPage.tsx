/**
 * WidgetPage — the main live canvas.
 * VIEW mode: renders the active workspace grid, live and interactive.
 * EDIT mode: drag/resize widgets, add from palette, configure, save staged changes.
 *
 * Uses react-grid-layout for drag/resize behaviour.
 */

import { useState, useCallback, useMemo, useRef, useEffect, Suspense } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { Settings, X, GripHorizontal, PanelLeftOpen, Edit3, Save } from 'lucide-react';

import { useWorkspaceStore, type LayoutWidget, type WidgetType } from '../stores/workspaceStore';
import { LINK_GROUP_COLORS, type LinkGroup } from '../stores/terminalStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WorkspaceTabBar } from '../components/WorkspaceTabBar';
import { EditModeBar }      from '../components/EditModeBar';
import { WidgetPalette }    from '../components/WidgetPalette';
import { WidgetConfigPanel } from '../components/WidgetConfigPanel';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';
import { ConfirmDialog, PromptDialog } from '../components/dialogs/Dialog';

// none → A → B → C → none
const LINK_CYCLE: Array<LinkGroup | undefined> = [undefined, 'A', 'B', 'C'];

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS       = 12;
const ROW_HEIGHT = 80;

// ─── Helper: map LayoutWidget[] → react-grid-layout LayoutItem[] ─────────────

function toRGL(widgets: LayoutWidget[]): Layout {
    return widgets.map(w => ({
        i: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
        minW: WIDGET_REGISTRY[w.type]?.minSize.w ?? 2,
        minH: WIDGET_REGISTRY[w.type]?.minSize.h ?? 2,
        maxW: WIDGET_REGISTRY[w.type]?.maxSize.w ?? 12,
        maxH: WIDGET_REGISTRY[w.type]?.maxSize.h ?? 20,
    }));
}

// ─── Widget Frame ─────────────────────────────────────────────────────────────

interface WidgetFrameProps {
    widget: LayoutWidget;
    workspaceId: string;
    isEditMode: boolean;
    onConfigure: (w: LayoutWidget) => void;
    onRequestRemove: (w: LayoutWidget) => void;
    onUpdateConfig: (widgetId: string, patch: Record<string, unknown>) => void;
}

function WidgetFrame({ widget, workspaceId, isEditMode, onConfigure, onRequestRemove, onUpdateConfig }: WidgetFrameProps) {
    const entry = WIDGET_REGISTRY[widget.type];
    const Component = entry?.component;

    const isPinned = Boolean(widget.config.pinSymbol);
    const linkGroup = (['A', 'B', 'C'] as const).find(g => g === widget.config.linkGroup);

    const cycleLinkGroup = () => {
        const next = LINK_CYCLE[(LINK_CYCLE.indexOf(linkGroup) + 1) % LINK_CYCLE.length];
        onUpdateConfig(widget.id, { linkGroup: next ?? null });
    };

    return (
        <div
            className="h-full flex flex-col overflow-hidden"
            style={{
                background: 'var(--color-surface)',
                border: isEditMode ? '1px solid color-mix(in srgb, var(--color-accent) 27%, transparent)' : '1px solid var(--color-border)',
                boxShadow: isEditMode ? '0 0 0 1px color-mix(in srgb, var(--color-accent) 13%, transparent)' : 'none',
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center justify-between px-2 shrink-0"
                style={{
                    height: 28,
                    background: 'var(--color-bg-deep)',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: isEditMode ? 'grab' : 'default',
                    userSelect: 'none',
                }}
            >
                {isEditMode && (
                    <GripHorizontal size={12} color="var(--color-text-faint)" className="shrink-0 mr-1" />
                )}
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em', flex: 1 }}>
                    {entry?.label ?? widget.type}
                </span>

                {/* Honest-data marker: this widget renders simulated data */}
                {entry?.dataDeps.mock && (
                    <span
                        title="Simulated data — no live feed wired to this widget yet"
                        style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                            color: 'var(--color-amber-alt)',
                            border: '1px solid color-mix(in srgb, var(--color-amber-alt) 40%, transparent)',
                            padding: '0 4px', marginRight: 4, borderRadius: 2,
                        }}
                    >
                        SIM
                    </span>
                )}

                {/* Pin marker (pinned = unlinked, overrides link group) */}
                {isPinned && (
                    <span
                        title={`Pinned to ${widget.config.pinSymbol}`}
                        style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            padding: '0 4px', marginRight: 4, borderRadius: 2,
                        }}
                    >
                        PIN
                    </span>
                )}

                {/* Symbol link channel dot: none → A → B → C */}
                <button
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 18, height: 18, marginRight: 2 }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); cycleLinkGroup(); }}
                    title={linkGroup
                        ? `Link group ${linkGroup} — follows and retargets channel ${linkGroup}`
                        : 'Unlinked — follows the global symbol. Click to join a link group.'}
                >
                    {linkGroup ? (
                        <span
                            className="flex items-center justify-center"
                            style={{
                                width: 12, height: 12, borderRadius: '50%',
                                background: LINK_GROUP_COLORS[linkGroup],
                                color: '#000', fontSize: 8, fontWeight: 800, lineHeight: 1,
                            }}
                        >
                            {linkGroup}
                        </span>
                    ) : (
                        <span
                            style={{
                                width: 10, height: 10, borderRadius: '50%',
                                border: '1.5px solid var(--color-text-faint)',
                                display: 'inline-block',
                            }}
                        />
                    )}
                </button>

                {isEditMode && (
                    <div className="flex items-center gap-0.5">
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 20, height: 20, color: 'var(--color-text-muted)' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onConfigure(widget); }}
                            title="Configure widget"
                        >
                            <Settings size={11} />
                        </button>
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 20, height: 20, color: 'var(--color-red)' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onRequestRemove(widget); }}
                            title="Remove widget"
                        >
                            <X size={11} />
                        </button>
                    </div>
                )}
            </div>

            {/* Widget body */}
            <div className="flex-1 overflow-hidden relative">
                {isEditMode && (
                    // Transparent overlay in edit mode to capture drag events (prevents widget interaction)
                    <div
                        className="absolute inset-0 z-10"
                        style={{ background: 'transparent', cursor: 'grab' }}
                    />
                )}
                {Component ? (
                    // Error boundary isolates crashes; Suspense covers the
                    // lazy chunk load (one chunk per widget type)
                    <WidgetErrorBoundary widgetLabel={entry?.label ?? widget.type}>
                        <Suspense
                            fallback={
                                <div className="h-full flex items-center justify-center">
                                    <span style={{ fontSize: 10, color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                                        loading…
                                    </span>
                                </div>
                            }
                        >
                            <Component
                                widgetId={widget.id}
                                workspaceId={workspaceId}
                                config={widget.config}
                                isEditMode={isEditMode}
                            />
                        </Suspense>
                    </WidgetErrorBoundary>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                            [{widget.type}]
                        </span>
                    </div>
                )}
            </div>

            {/* Resize handle overlay (react-grid-layout adds its own, this is decorative) */}
            {isEditMode && (
                <div
                    className="absolute bottom-0 right-0 pointer-events-none"
                    style={{
                        width: 16, height: 16,
                        borderRight: '2px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
                        borderBottom: '2px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
                    }}
                />
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function WidgetPage() {
    const {
        workspaces,
        activeWorkspaceId,
        setActiveWorkspace,
        renameWorkspace,
        addWorkspace,
        saveWorkspace,
        updateWidgetConfig,
    } = useWorkspaceStore();

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

    // ── Edit mode state ────────────────────────────────────────────────────
    // Everything (name, widget list, positions, config) is staged in edit mode
    // and only written to the store on Save — Discard drops it all.
    const [isEditMode,        setIsEditMode]        = useState(false);
    const [isPaletteOpen,     setIsPaletteOpen]     = useState(false);
    const [configTarget,      setConfigTarget]      = useState<LayoutWidget | null>(null);
    const [stagedName,        setStagedName]        = useState('');
    const [stagedWidgets,     setStagedWidgets]     = useState<LayoutWidget[]>([]);
    const [isDirty,           setIsDirty]           = useState(false);

    // ── Dialog state (in-theme replacements for window.prompt/confirm) ─────
    const [removeTarget,       setRemoveTarget]       = useState<LayoutWidget | null>(null);
    const [showResetConfirm,   setShowResetConfirm]   = useState(false);
    const [showNewWorkspace,   setShowNewWorkspace]   = useState(false);

    // Width for the grid — tracked via ResizeObserver so it adapts on window resize / maximize
    const [gridWidth, setGridWidth] = useState(0);
    const gridContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = gridContainerRef.current;
        if (!el) return;
        setGridWidth(el.clientWidth);
        const ro = new ResizeObserver(entries => {
            setGridWidth(entries[0].contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const enterEditMode = useCallback(() => {
        if (!activeWorkspace) return;
        setStagedName(activeWorkspace.name);
        setStagedWidgets(activeWorkspace.layout.widgets.map(w => ({ ...w })));
        setIsDirty(false);
        setIsEditMode(true);
    }, [activeWorkspace]);

    const saveLayout = useCallback(() => {
        if (!activeWorkspace) return;
        saveWorkspace({
            ...activeWorkspace,
            name: stagedName.trim() || activeWorkspace.name,
            layout: { ...activeWorkspace.layout, widgets: stagedWidgets },
        });
        setIsEditMode(false);
        setIsPaletteOpen(false);
        setConfigTarget(null);
        setIsDirty(false);
    }, [activeWorkspace, stagedWidgets, stagedName, saveWorkspace]);

    const discardChanges = useCallback(() => {
        setIsEditMode(false);
        setIsPaletteOpen(false);
        setConfigTarget(null);
        setIsDirty(false);
    }, []);

    const resetLayout = useCallback(() => {
        // Keep widgets but reset staged positions to defaults from registry
        setStagedWidgets(prev => prev.map(w => ({
            ...w,
            x: 0, y: 0,
            w: WIDGET_REGISTRY[w.type]?.defaultSize.w ?? 4,
            h: WIDGET_REGISTRY[w.type]?.defaultSize.h ?? 4,
        })));
        setIsDirty(true);
        setShowResetConfirm(false);
    }, []);

    const handleLayoutChange = useCallback((layout: Layout) => {
        if (!isEditMode) return;
        setStagedWidgets(prev => prev.map(w => {
            const l = layout.find(item => item.i === w.id);
            return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
        }));
        setIsDirty(true);
    }, [isEditMode]);

    const handleAddWidget = useCallback((type: WidgetType) => {
        const def = WIDGET_REGISTRY[type];
        setStagedWidgets(prev => [...prev, {
            id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            x: 0,
            y: prev.reduce((max, w) => Math.max(max, w.y + w.h), 0), // push to bottom
            w: def?.defaultSize.w ?? 4,
            h: def?.defaultSize.h ?? 4,
            config: {},
        }]);
        setIsDirty(true);
    }, []);

    const handleRemoveWidget = useCallback((widgetId: string) => {
        setStagedWidgets(prev => prev.filter(w => w.id !== widgetId));
        setIsDirty(true);
    }, []);

    const handleApplyConfig = useCallback((widgetId: string, config: Record<string, unknown>) => {
        setStagedWidgets(prev => prev.map(w =>
            w.id === widgetId ? { ...w, config: { ...w.config, ...config } } : w
        ));
        setConfigTarget(null);
        setIsDirty(true);
    }, []);

    // Config patches from the widget frame (e.g. link-group dot). In edit mode
    // they join the staged changes; in view mode they write straight through
    // (retargeting a link channel is a live action, not a layout edit).
    const handleUpdateConfig = useCallback((widgetId: string, patch: Record<string, unknown>) => {
        if (isEditMode) {
            setStagedWidgets(prev => prev.map(w =>
                w.id === widgetId ? { ...w, config: { ...w.config, ...patch } } : w
            ));
            setIsDirty(true);
        } else {
            updateWidgetConfig(activeWorkspaceId, widgetId, patch);
        }
    }, [isEditMode, activeWorkspaceId, updateWidgetConfig]);

    // Widgets rendered = staged (edit) or from store (view)
    const displayWidgets = isEditMode ? stagedWidgets : (activeWorkspace?.layout.widgets ?? []);
    const liveLayout = useMemo(() => toRGL(displayWidgets), [displayWidgets]);

    if (!activeWorkspace) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                    No workspace selected
                </span>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{ background: 'var(--color-bg)', position: 'relative' }}
        >
            {/* Edit Mode Banner */}
            {isEditMode && (
                <EditModeBar
                    workspaceName={stagedName}
                    onNameChange={setStagedName}
                    onSave={saveLayout}
                    onDiscard={discardChanges}
                    onReset={() => setShowResetConfirm(true)}
                    isDirty={isDirty}
                />
            )}

            {/* Workspace Tab Bar */}
            <WorkspaceTabBar
                workspaces={workspaces.map(w => ({ id: w.id, name: w.name }))}
                activeId={activeWorkspaceId}
                onSelect={setActiveWorkspace}
                onAdd={() => setShowNewWorkspace(true)}
                onRename={renameWorkspace}
            />

            {/* Main canvas row */}
            <div className="flex flex-1 overflow-hidden">

                {/* Widget Palette (edit mode only) */}
                {isEditMode && (
                    <WidgetPalette
                        isOpen={isPaletteOpen}
                        onAddWidget={handleAddWidget}
                        onClose={() => setIsPaletteOpen(false)}
                    />
                )}

                {/* Grid area */}
                <div
                    ref={gridContainerRef}
                    className="flex-1 overflow-auto"
                    style={{ position: 'relative' }}
                >
                    {/* Edit mode grid overlay */}
                    {isEditMode && (
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                backgroundImage: 'linear-gradient(rgba(0,168,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,168,255,0.04) 1px, transparent 1px)',
                                backgroundSize: `${(gridWidth - 20) / COLS}px ${ROW_HEIGHT}px`,
                                zIndex: 0,
                            }}
                        />
                    )}

                    <GridLayout
                        className="layout"
                        layout={liveLayout}
                        width={Math.max(gridWidth - 16, 100)}
                        onLayoutChange={handleLayoutChange}
                        gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [4, 4] as [number,number], containerPadding: [8, 8] as [number,number] }}
                        dragConfig={{ enabled: isEditMode, handle: '.drag-handle' }}
                        resizeConfig={{ enabled: isEditMode, handles: ['se'] as ['se'] }}
                        style={{ minHeight: '100%' }}
                    >
                        {displayWidgets.map(widget => (
                            <div key={widget.id} style={{ overflow: 'hidden' }}>
                                <div className="drag-handle h-full">
                                    <WidgetFrame
                                        widget={widget}
                                        workspaceId={activeWorkspaceId}
                                        isEditMode={isEditMode}
                                        onConfigure={setConfigTarget}
                                        onRequestRemove={setRemoveTarget}
                                        onUpdateConfig={handleUpdateConfig}
                                    />
                                </div>
                            </div>
                        ))}
                    </GridLayout>

                    {/* Empty workspace prompt */}
                    {displayWidgets.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                            <span style={{ color: 'var(--color-text-faint)', fontFamily: 'monospace', fontSize: 12 }}>
                                [ EMPTY WORKSPACE ]
                            </span>
                            <span style={{ color: 'var(--color-border-strong)', fontSize: 11 }}>
                                {isEditMode ? 'Click "Add Widget" in the palette to get started' : 'Click Edit Layout to add widgets'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Widget Config Panel (edit mode, slide in from right) */}
                <WidgetConfigPanel
                    widget={configTarget}
                    workspaceId={activeWorkspaceId}
                    onClose={() => setConfigTarget(null)}
                    onApply={handleApplyConfig}
                />
            </div>

            {/* Floating Edit / Palette FABs */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2" style={{ zIndex: 100 }}>
                {isEditMode && (
                    <button
                        onClick={() => setIsPaletteOpen(v => !v)}
                        className="flex items-center gap-2 px-3 py-2"
                        style={{
                            background: isPaletteOpen ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                            border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
                            color: isPaletteOpen ? '#000' : 'var(--color-accent)',
                            fontSize: 11, fontWeight: 600,
                        }}
                        title="Add widget"
                    >
                        <PanelLeftOpen size={13} />
                        Add Widget
                    </button>
                )}
                <button
                    onClick={isEditMode ? saveLayout : enterEditMode}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                        background: isEditMode ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                        border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)',
                        color: isEditMode ? '#000' : 'var(--color-accent)',
                        fontSize: 11, fontWeight: 600,
                    }}
                    title={isEditMode ? 'Save Layout' : 'Edit Layout'}
                >
                    {isEditMode ? <Save size={13} /> : <Edit3 size={13} />}
                    {isEditMode ? 'Save Layout' : 'Edit Layout'}
                </button>
            </div>

            {/* ── Dialogs ─────────────────────────────────────────────────── */}
            {removeTarget && (
                <ConfirmDialog
                    title="REMOVE WIDGET"
                    message={`Remove "${WIDGET_REGISTRY[removeTarget.type]?.label ?? removeTarget.type}" from this workspace?`}
                    confirmLabel="Remove"
                    danger
                    onConfirm={() => { handleRemoveWidget(removeTarget.id); setRemoveTarget(null); }}
                    onCancel={() => setRemoveTarget(null)}
                />
            )}
            {showResetConfirm && (
                <ConfirmDialog
                    title="RESET LAYOUT"
                    message="Reset all widgets in this workspace to their default sizes and positions? (Takes effect on Save.)"
                    confirmLabel="Reset"
                    onConfirm={resetLayout}
                    onCancel={() => setShowResetConfirm(false)}
                />
            )}
            {showNewWorkspace && (
                <PromptDialog
                    title="NEW WORKSPACE"
                    placeholder="Workspace name"
                    confirmLabel="Create"
                    onSubmit={name => { addWorkspace(name, 'blank'); setShowNewWorkspace(false); }}
                    onCancel={() => setShowNewWorkspace(false)}
                />
            )}
        </div>
    );
}
