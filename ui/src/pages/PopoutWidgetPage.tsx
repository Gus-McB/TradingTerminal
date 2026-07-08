/**
 * PopoutWidgetPage — a single widget in its own frameless Electron window.
 * Route: /widget/:type?symbol=BTC/USD  (symbol pins the widget when present)
 */
import { Suspense, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { WIDGET_REGISTRY } from '../widgets/registry';
import type { WidgetType } from '../stores/workspaceStore';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';

// Frameless window: the strip is the drag region
const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

export function PopoutWidgetPage() {
    const { type } = useParams();
    const [params] = useSearchParams();
    const symbol = params.get('symbol') || undefined;

    const entry = type ? WIDGET_REGISTRY[type as WidgetType] : undefined;

    if (!entry) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    Unknown widget type: {type}
                </span>
            </div>
        );
    }

    const Component = entry.component;

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
                    {entry.label}{symbol ? ` — ${symbol}` : ''}
                </span>
                <button
                    style={{ ...noDrag, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
                    onClick={() => window.close()}
                    title="Close"
                >
                    ×
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <WidgetErrorBoundary widgetLabel={entry.label}>
                    <Suspense fallback={null}>
                        <Component
                            widgetId={`popout-${type}`}
                            workspaceId="popout"
                            config={symbol ? { pinSymbol: symbol } : {}}
                        />
                    </Suspense>
                </WidgetErrorBoundary>
            </div>
        </div>
    );
}
