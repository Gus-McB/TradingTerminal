import { X } from 'lucide-react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

const BORDER_COLORS = { danger: '#ff3366', warn: '#ffaa00', info: '#00f0ff' };
const BG_COLORS     = { danger: 'rgba(255,51,102,0.08)', warn: 'rgba(255,170,0,0.08)', info: 'rgba(0,240,255,0.08)' };

function formatTs(ts: string) {
    try {
        return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch { return ts; }
}

export function AlertsWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { alerts, clearAlert } = useTerminalSync();

    return (
        <div className={className} style={{ background: '#0a0a0f', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: '#12121a', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a6a7a', textTransform: 'uppercase' }}>Alerts</span>
                {alerts.length > 0 && (
                    <span style={{ fontFamily: 'monospace', fontSize: 10, background: '#ff3366', color: '#fff', borderRadius: 10, padding: '1px 7px' }}>
                        {alerts.length}
                    </span>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: alerts.length === 0 ? 0 : 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6a6a7a' }}>No active alerts</span>
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
                                <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#e0e0e8', lineHeight: 1.4 }}>
                                    {alert.message}
                                </p>
                                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6a6a7a' }}>{formatTs(alert.timestamp)}</span>
                            </div>
                            <button onClick={() => clearAlert(alert.id)} style={{
                                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                                color: '#6a6a7a', display: 'flex', alignItems: 'center',
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
