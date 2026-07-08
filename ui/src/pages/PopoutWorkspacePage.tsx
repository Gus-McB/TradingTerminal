/**
 * PopoutWorkspacePage — a workspace rendered read-only in its own Electron
 * window. Route: /workspace/:id
 *
 * Layout edits happen in the main window; this window follows them by
 * rehydrating the persisted store whenever another window writes to
 * localStorage (the 'storage' event fires cross-window on the same origin).
 */
import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';

const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

const COLS = 12;
const ROW_HEIGHT = 80;

export function PopoutWorkspacePage() {
    const { id } = useParams();
    const workspaces = useWorkspaceStore(s => s.workspaces);
    const workspace = workspaces.find(w => w.id === id);

    // Follow layout changes made in other windows
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === 'trading-terminal-workspaces-v2') {
                void useWorkspaceStore.persist.rehydrate();
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const [gridWidth, setGridWidth] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        setGridWidth(el.clientWidth);
        const ro = new ResizeObserver(entries => setGridWidth(entries[0].contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

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
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
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
                    {workspace.name} — POP-OUT
                </span>
                <button
                    style={{ ...noDrag, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
                    onClick={() => window.close()}
                    title="Close"
                >
                    ×
                </button>
            </div>

            {/* Read-only grid */}
            <div ref={containerRef} className="flex-1 overflow-auto">
                <GridLayout
                    className="layout"
                    layout={workspace.layout.widgets.map(w => ({
                        i: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
                    }))}
                    width={Math.max(gridWidth - 16, 100)}
                    gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [4, 4] as [number, number], containerPadding: [8, 8] as [number, number] }}
                    dragConfig={{ enabled: false }}
                    resizeConfig={{ enabled: false }}
                >
                    {workspace.layout.widgets.map(widget => {
                        const entry = WIDGET_REGISTRY[widget.type];
                        const Component = entry?.component;
                        return (
                            <div key={widget.id} style={{ overflow: 'hidden' }}>
                                <div
                                    className="h-full flex flex-col overflow-hidden"
                                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                                >
                                    <div
                                        className="flex items-center px-2 shrink-0"
                                        style={{ height: 24, background: 'var(--color-bg-deep)', borderBottom: '1px solid var(--color-border)' }}
                                    >
                                        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                                            {entry?.label ?? widget.type}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        {Component && (
                                            <WidgetErrorBoundary widgetLabel={entry?.label ?? widget.type}>
                                                <Suspense fallback={null}>
                                                    <Component
                                                        widgetId={widget.id}
                                                        workspaceId={workspace.id}
                                                        config={widget.config}
                                                    />
                                                </Suspense>
                                            </WidgetErrorBoundary>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </GridLayout>
            </div>
        </div>
    );
}
