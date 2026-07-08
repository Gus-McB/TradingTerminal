import { X } from 'lucide-react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

const BORDER_COLORS = { danger: 'var(--color-red)', warn: 'var(--color-amber)', info: 'var(--color-cyan)' };
const BG_COLORS     = { danger: 'rgba(255,51,102,0.08)', warn: 'rgba(255,170,0,0.08)', info: 'rgba(0,240,255,0.08)' };

function formatTs(ts: string) {
    try {
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch { return ts; }
}

export function AlertsWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { alerts, clearAlert } = useTerminalSync();

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Alerts</span>
                {alerts.length > 0 && (
                    <span style={{ fontFamily: 'monospace', fontSize: 10, background: 'var(--color-red)', color: '#fff', borderRadius: 10, padding: '1px 7px' }}>
                        {alerts.length}
                    </span>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: alerts.length === 0 ? 0 : 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-muted)' }}>No active alerts</span>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            padding: '8px 10px', borderRadius: 4,
                            borderLeft: `3px solid ${BORDER_COLORS[alert.type]}`,
                            background: BG_COLORS[alert.type],
                        }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.4 }}>
                                    {alert.message}
                                </p>
                                <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)' }}>{formatTs(alert.timestamp)}</span>
                            </div>
                            <button onClick={() => clearAlert(alert.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                                color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
                            }}>
                                <X size={13} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
