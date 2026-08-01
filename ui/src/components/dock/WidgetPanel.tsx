/**
 * WidgetPanel — the single dockview content component for all widget types.
 * Resolves the widget from the registry via panel params and renders it
 * behind the SDK's error boundary + lazy-chunk Suspense.
 */
import { Suspense } from 'react';
import type { IDockviewPanelProps } from 'dockview-react';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { WidgetErrorBoundary } from '../WidgetErrorBoundary';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { WidgetPanelParams } from '../../services/dockLayout';

export function WidgetPanel({ api, params }: IDockviewPanelProps<WidgetPanelParams>) {
    const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
    const entry = WIDGET_REGISTRY[params.type];

    if (!entry) {
        return (
            <div className="h-full flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'monospace' }}>
                    Unknown widget type: {String(params.type)}
                </span>
            </div>
        );
    }

    const Component = entry.component;

    return (
        <div className="h-full overflow-hidden" style={{ background: 'var(--color-surface)' }}>
            <WidgetErrorBoundary widgetLabel={entry.label}>
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
                        widgetId={api.id}
                        workspaceId={activeWorkspaceId}
                        config={params.config ?? {}}
                    />
                </Suspense>
            </WidgetErrorBoundary>
        </div>
    );
}
