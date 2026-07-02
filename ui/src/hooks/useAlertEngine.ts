/**
 * useAlertEngine — hook for subscribing to and managing user alerts.
 */
import { useState, useEffect, useCallback } from 'react';
import { alertEngine, type UserAlert } from '../services/alertEngine';

export function useAlertEngine() {
    const [alerts, setAlerts] = useState<UserAlert[]>(() => alertEngine.getAlerts());
    const [lastTriggered, setLastTriggered] = useState<UserAlert | null>(null);

    useEffect(() => {
        // Start evaluation loop
        alertEngine.start();

        // Subscribe to triggers
        const unsubscribe = alertEngine.subscribe((triggered) => {
            setAlerts(alertEngine.getAlerts());
            setLastTriggered(triggered);
        });

        return () => {
            unsubscribe();
            alertEngine.stop();
        };
    }, []);

    const refresh = useCallback(() => setAlerts(alertEngine.getAlerts()), []);

    const addAlert    = useCallback((a: Omit<UserAlert, 'id' | 'createdAt' | 'status'>) => {
        alertEngine.addAlert(a);
        refresh();
    }, [refresh]);

    const removeAlert = useCallback((id: string) => {
        alertEngine.removeAlert(id);
        refresh();
    }, [refresh]);

    const toggleAlert = useCallback((id: string) => {
        alertEngine.toggleAlert(id);
        refresh();
    }, [refresh]);

    const updateAlert = useCallback((id: string, updates: Partial<UserAlert>) => {
        alertEngine.updateAlert(id, updates);
        refresh();
    }, [refresh]);

    return {
        alerts,
        lastTriggered,
        addAlert,
        removeAlert,
        toggleAlert,
        updateAlert,
        activeCount:    alerts.filter(a => a.status === 'active').length,
        triggeredCount: alerts.filter(a => a.status === 'triggered').length,
    };
}
