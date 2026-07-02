/**
 * ToastNotification — top-right toast stack, max 4 visible, auto-dismiss.
 * Integrate globally in AppShell or App root.
 */
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'info' | 'success' | 'warning' | 'alert';

export interface Toast {
    id:          string;
    type:        ToastType;
    title:       string;
    message?:    string;
    persistent?: boolean;   // stays until dismissed
    duration?:   number;    // ms, default 5000
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
    addToast:    (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<ToastType, { border: string; icon: React.ReactNode; iconColor: string }> = {
    info:    { border: '#00a8ff', iconColor: '#00a8ff', icon: <Info size={14} /> },
    success: { border: '#00e676', iconColor: '#00e676', icon: <CheckCircle size={14} /> },
    warning: { border: '#f0a500', iconColor: '#f0a500', icon: <AlertTriangle size={14} /> },
    alert:   { border: '#ff3b30', iconColor: '#ff3b30', icon: <AlertOctagon size={14} /> },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const [visible, setVisible] = useState(false);
    const cfg = TYPE_STYLES[toast.type];

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
        if (!toast.persistent) {
            const t = setTimeout(() => {
                setVisible(false);
                setTimeout(() => onDismiss(toast.id), 300);
            }, toast.duration ?? 5000);
            return () => clearTimeout(t);
        }
    }, [toast.id, toast.persistent, toast.duration, onDismiss]);

    return (
        <div
            style={{
                background: '#161a1f',
                border: `1px solid rgba(255,255,255,0.1)`,
                borderLeft: `3px solid ${cfg.border}`,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                minWidth: 280,
                maxWidth: 360,
                marginBottom: 8,
                transform: visible ? 'translateX(0)' : 'translateX(120%)',
                opacity: visible ? 1 : 0,
                transition: 'transform 0.25s ease, opacity 0.25s ease',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
        >
            <span style={{ color: cfg.iconColor, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e8eaed', lineHeight: 1.4 }}>
                    {toast.title}
                </p>
                {toast.message && (
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9aa0ac', lineHeight: 1.4 }}>
                        {toast.message}
                    </p>
                )}
            </div>
            <button
                onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
                style={{ color: '#4b5563', flexShrink: 0, marginTop: 1 }}
            >
                <X size={12} />
            </button>
        </div>
    );
}

// ─── Provider + Container ─────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => {
            const next = [...prev, { ...toast, id }];
            return next.slice(-4); // max 4 visible
        });
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            {/* Toast stack — top-right fixed */}
            <div
                style={{
                    position: 'fixed',
                    top: 80,
                    right: 16,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    pointerEvents: 'none',
                }}
            >
                {toasts.map(t => (
                    <div key={t.id} style={{ pointerEvents: 'all' }}>
                        <ToastItem toast={t} onDismiss={removeToast} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
