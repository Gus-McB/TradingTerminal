/**
 * WidgetErrorBoundary — isolates widget crashes to their own frame.
 * One widget throwing during render must never take down the workspace.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
    /** Shown in the crash panel so the user knows which widget died */
    widgetLabel: string;
    children: ReactNode;
}

interface State {
    error: Error | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[Widget:${this.props.widgetLabel}] crashed:`, error, info.componentStack);
    }

    private retry = () => this.setState({ error: null });

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div
                className="h-full flex flex-col items-center justify-center gap-2 p-3"
                style={{ background: 'var(--color-surface)' }}
            >
                <AlertTriangle size={18} color="var(--color-amber)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text)', fontFamily: 'monospace' }}>
                    {this.props.widgetLabel} crashed
                </span>
                <span
                    style={{
                        fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace',
                        maxWidth: '90%', textAlign: 'center', wordBreak: 'break-word',
                    }}
                >
                    {this.state.error.message}
                </span>
                <button
                    onClick={this.retry}
                    className="flex items-center gap-1.5 px-3 py-1.5 mt-1"
                    style={{
                        background: 'transparent', border: '1px solid var(--color-border)',
                        color: 'var(--color-accent)', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
                    }}
                >
                    <RotateCcw size={11} /> Retry
                </button>
            </div>
        );
    }
}
