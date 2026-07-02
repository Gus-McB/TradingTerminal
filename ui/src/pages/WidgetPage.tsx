/**
 * WidgetPage — the main live canvas.
 * VIEW mode: renders the active workspace grid, live and interactive.
 * EDIT mode: drag/resize widgets, add from palette, configure, save staged changes.
 *
 * Uses react-grid-layout for drag/resize behaviour.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { Settings, X, GripHorizontal, PanelLeftOpen, Edit3, Save } from 'lucide-react';

import { useWorkspaceStore, type LayoutWidget, type WidgetType } from '../stores/workspaceStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WorkspaceTabBar } from '../components/WorkspaceTabBar';
import { EditModeBar }      from '../components/EditModeBar';
import { WidgetPalette }    from '../components/WidgetPalette';
import { WidgetConfigPanel } from '../components/WidgetConfigPanel';

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
    onRemove: (id: string) => void;
}

function WidgetFrame({ widget, workspaceId, isEditMode, onConfigure, onRemove }: WidgetFrameProps) {
    const entry = WIDGET_REGISTRY[widget.type];
    const Component = entry?.component;

    return (
        <div
            className="h-full flex flex-col overflow-hidden"
            style={{
                background: '#12121a',
                border: isEditMode ? '1px solid #00a8ff44' : '1px solid #2a2a3a',
                boxShadow: isEditMode ? '0 0 0 1px #00a8ff22' : 'none',
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center justify-between px-2 shrink-0"
                style={{
                    height: 28,
                    background: '#0d0f12',
                    borderBottom: '1px solid #2a2a3a',
                    cursor: isEditMode ? 'grab' : 'default',
                    userSelect: 'none',
                }}
            >
                {isEditMode && (
                    <GripHorizontal size={12} color="#4a4a5a" className="shrink-0 mr-1" />
                )}
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6a6a7a', letterSpacing: '0.1em', flex: 1 }}>
                    {entry?.label ?? widget.type}
                </span>
                {isEditMode && (
                    <div className="flex items-center gap-0.5">
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 20, height: 20, color: '#6a6a7a' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); onConfigure(widget); }}
                            title="Configure widget"
                        >
                            <Settings size={11} />
                        </button>
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 20, height: 20, color: '#ff3366' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => {
                                e.stopPropagation();
                                if (window.confirm(`Remove "${entry?.label}" widget?`)) onRemove(widget.id);
                            }}
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
                    <Component
                        widgetId={widget.id}
                        workspaceId={workspaceId}
                        config={widget.config}
                        isEditMode={isEditMode}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <span style={{ fontSize: 11, color: '#4a4a5a', fontFamily: 'monospace' }}>
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
                        borderRight: '2px solid #00a8ff66',
                        borderBottom: '2px solid #00a8ff66',
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
        if (!window.confirm('Reset this workspace to default layout?')) return;
        // Keep widgets but reset staged positions to defaults from registry
        setStagedWidgets(prev => prev.map(w => ({
            ...w,
            x: 0, y: 0,
            w: WIDGET_REGISTRY[w.type]?.defaultSize.w ?? 4,
            h: WIDGET_REGISTRY[w.type]?.defaultSize.h ?? 4,
        })));
        setIsDirty(true);
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

    // Widgets rendered = staged (edit) or from store (view)
    const displayWidgets = isEditMode ? stagedWidgets : (activeWorkspace?.layout.widgets ?? []);
    const liveLayout = useMemo(() => toRGL(displayWidgets), [displayWidgets]);

    if (!activeWorkspace) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <span style={{ color: '#6a6a7a', fontFamily: 'monospace', fontSize: 12 }}>
                    No workspace selected
                </span>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col h-full overflow-hidden"
            style={{ background: '#0a0a0f', position: 'relative' }}
        >
            {/* Edit Mode Banner */}
            {isEditMode && (
                <EditModeBar
                    workspaceName={stagedName}
                    onNameChange={setStagedName}
                    onSave={saveLayout}
                    onDiscard={discardChanges}
                    onReset={resetLayout}
                    isDirty={isDirty}
                />
            )}

            {/* Workspace Tab Bar */}
            <WorkspaceTabBar
                workspaces={workspaces.map(w => ({ id: w.id, name: w.name }))}
                activeId={activeWorkspaceId}
                onSelect={setActiveWorkspace}
                onAdd={() => {
                    const name = window.prompt('Workspace name:');
                    if (name?.trim()) addWorkspace(name.trim(), 'blank');
                }}
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
                                        onRemove={handleRemoveWidget}
                                    />
                                </div>
                            </div>
                        ))}
                    </GridLayout>

                    {/* Empty workspace prompt */}
                    {displayWidgets.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
                            <span style={{ color: '#4a4a5a', fontFamily: 'monospace', fontSize: 12 }}>
                                [ EMPTY WORKSPACE ]
                            </span>
                            <span style={{ color: '#3a3a4a', fontSize: 11 }}>
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
                            background: isPaletteOpen ? '#00a8ff' : '#161a1f',
                            border: '1px solid #00a8ff66',
                            color: isPaletteOpen ? '#000' : '#00a8ff',
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
                        background: isEditMode ? '#00a8ff' : '#161a1f',
                        border: '1px solid #00a8ff66',
                        color: isEditMode ? '#000' : '#00a8ff',
                        fontSize: 11, fontWeight: 600,
                    }}
                    title={isEditMode ? 'Save Layout' : 'Edit Layout'}
                >
                    {isEditMode ? <Save size={13} /> : <Edit3 size={13} />}
                    {isEditMode ? 'Save Layout' : 'Edit Layout'}
                </button>
            </div>
        </div>
    );
}
