/**
 * alertEngine — manages user-defined alerts and evaluates them against market data.
 * All alert evaluation is mocked in development.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType =
    | 'price'         // Symbol crosses price level
    | 'pct_move'      // Symbol moves > X% in session
    | 'indicator'     // RSI cross, MACD cross, price vs MA
    | 'volume'        // Volume exceeds X× average
    | 'news'          // Keyword in news for symbol
    | 'portfolio'     // Position P&L threshold
    | 'economic'      // Economic event reminder
    | 'options';      // IV spike, unusual activity

export type AlertCondition =
    | 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals';

export type AlertStatus  = 'active' | 'triggered' | 'expired' | 'disabled';
export type AlertExpiry  = 'once' | 'recurring' | 'gtc';
export type NotifyMethod = 'in_app' | 'sound' | 'browser';

export interface UserAlert {
    id:            string;
    type:          AlertType;
    status:        AlertStatus;
    symbol:        string;
    condition:     AlertCondition;
    value:         number | string;
    label:         string;          // Human-readable description
    notify:        NotifyMethod[];
    expiry:        AlertExpiry;
    createdAt:     string;
    triggeredAt?:  string;
    lastChecked?:  string;
}

// ─── Mock Initial Alerts ──────────────────────────────────────────────────────

export const MOCK_ALERTS: UserAlert[] = [
    {
        id: 'alert-1', type: 'price', status: 'active', symbol: 'BTC/USD',
        condition: 'above', value: 70000, label: 'BTC/USD > $70,000',
        notify: ['in_app', 'sound'], expiry: 'once', createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'alert-2', type: 'price', status: 'triggered', symbol: 'AAPL',
        condition: 'below', value: 170, label: 'AAPL < $170',
        notify: ['in_app'], expiry: 'once', createdAt: new Date(Date.now() - 7200000).toISOString(),
        triggeredAt: new Date(Date.now() - 900000).toISOString(),
    },
    {
        id: 'alert-3', type: 'indicator', status: 'active', symbol: 'TSLA',
        condition: 'crosses_below', value: 30, label: 'TSLA RSI crosses below 30',
        notify: ['in_app'], expiry: 'recurring', createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'alert-4', type: 'pct_move', status: 'active', symbol: 'NVDA',
        condition: 'above', value: 5, label: 'NVDA moves > 5% in session',
        notify: ['in_app', 'sound'], expiry: 'gtc', createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
        id: 'alert-5', type: 'volume', status: 'expired', symbol: 'SPY',
        condition: 'above', value: 2, label: 'SPY volume > 2× average',
        notify: ['in_app'], expiry: 'once', createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
        id: 'alert-6', type: 'economic', status: 'active', symbol: '',
        condition: 'equals', value: 'CPI Release', label: 'CPI Release (30 min warning)',
        notify: ['in_app', 'browser'], expiry: 'once', createdAt: new Date(Date.now() - 600000).toISOString(),
    },
];

// ─── Alert Engine ─────────────────────────────────────────────────────────────

type AlertCallback = (alert: UserAlert) => void;

class AlertEngine {
    private alerts:    UserAlert[] = [...MOCK_ALERTS];
    private listeners: AlertCallback[] = [];
    private intervalId: ReturnType<typeof setInterval> | null = null;

    subscribe(cb: AlertCallback): () => void {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    getAlerts(): UserAlert[] { return [...this.alerts]; }

    addAlert(alert: Omit<UserAlert, 'id' | 'createdAt' | 'status'>): UserAlert {
        const newAlert: UserAlert = {
            ...alert, id: `alert-${Date.now()}`,
            status: 'active', createdAt: new Date().toISOString(),
        };
        this.alerts = [...this.alerts, newAlert];
        return newAlert;
    }

    updateAlert(id: string, updates: Partial<UserAlert>): void {
        this.alerts = this.alerts.map(a => a.id === id ? { ...a, ...updates } : a);
    }

    removeAlert(id: string): void {
        this.alerts = this.alerts.filter(a => a.id !== id);
    }

    toggleAlert(id: string): void {
        this.alerts = this.alerts.map(a =>
            a.id === id ? { ...a, status: a.status === 'disabled' ? 'active' : 'disabled' } : a
        );
    }

    /** Start mock evaluation loop (randomly triggers active alerts). */
    start(): void {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => {
            const active = this.alerts.filter(a => a.status === 'active');
            if (active.length === 0) return;
            // Randomly trigger one alert ~5% of the time
            if (Math.random() < 0.05) {
                const target = active[Math.floor(Math.random() * active.length)];
                this.updateAlert(target.id, {
                    status: target.expiry === 'once' ? 'triggered' : 'active',
                    triggeredAt: new Date().toISOString(),
                });
                const triggered = this.alerts.find(a => a.id === target.id)!;
                this.listeners.forEach(l => l(triggered));
            }
        }, 5000);
    }

    stop(): void {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    }
}

// Singleton instance
export const alertEngine = new AlertEngine();
