/**
 * alertStore — the single terminal alert list.
 * Consumed by the navbar bell, the Alerts widget, and useTerminalSync.
 */
import { create } from 'zustand';

export interface TerminalAlert {
    id: string;
    type: 'info' | 'warn' | 'danger';
    message: string;
    timestamp: string;
}

interface AlertStore {
    alerts: TerminalAlert[];
    addAlert:   (alert: Omit<TerminalAlert, 'id' | 'timestamp'>) => void;
    clearAlert: (id: string) => void;
    clearAll:   () => void;
}

const MAX_ALERTS = 100;

export const useAlertStore = create<AlertStore>((set) => ({
    alerts: [],

    addAlert: (alert) => set(s => ({
        alerts: [
            ...s.alerts,
            {
                ...alert,
                id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString(),
            },
        ].slice(-MAX_ALERTS),
    })),

    clearAlert: (id) => set(s => ({ alerts: s.alerts.filter(a => a.id !== id) })),
    clearAll:   () => set({ alerts: [] }),
}));
