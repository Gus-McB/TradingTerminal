/**
 * alertEngine — user-defined alerts evaluated against LIVE market data.
 *
 * Price and pct-move alerts subscribe to their symbol's ticker stream
 * (services/marketData) and fire on real crossings — no simulation. Other
 * alert types (indicator, news, …) are stored but dormant until their data
 * sources exist. Alerts persist to localStorage (Supabase lands in Phase 4).
 */

import { marketData } from './marketData';
import { useAlertStore } from '../stores/alertStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType =
    | 'price'         // Symbol crosses price level (LIVE)
    | 'pct_move'      // Symbol moves > X% in session (LIVE)
    | 'indicator'     // RSI cross, MACD cross, price vs MA (dormant)
    | 'volume'        // Volume exceeds X× average (dormant)
    | 'news'          // Keyword in news for symbol (dormant)
    | 'portfolio'     // Position P&L threshold (dormant)
    | 'economic'      // Economic event reminder (dormant)
    | 'options';      // IV spike, unusual activity (dormant)

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

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'trading-terminal-user-alerts-v1';

function loadAlerts(): UserAlert[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

type AlertCallback = (alert: UserAlert) => void;

/** Alert types the engine can evaluate against live tickers today */
const LIVE_TYPES: ReadonlySet<AlertType> = new Set(['price', 'pct_move']);

/** Minimum time between re-fires of a recurring alert */
const RECURRING_COOLDOWN_MS = 60_000;

class AlertEngine {
    private alerts: UserAlert[] = loadAlerts();
    private listeners: AlertCallback[] = [];
    private changeListeners: Array<() => void> = [];
    private running = false;
    private unsubs = new Map<string, () => void>();   // symbol -> unsubscribe
    private lastPrices = new Map<string, number>();   // for crossing detection

    // ── Public API (unchanged) ────────────────────────────────────────────

    subscribe(cb: AlertCallback): () => void {
        this.listeners.push(cb);
        return () => { this.listeners = this.listeners.filter(l => l !== cb); };
    }

    /** Fires on any mutation of the alert list (used by cloud sync). */
    subscribeChanges(cb: () => void): () => void {
        this.changeListeners.push(cb);
        return () => { this.changeListeners = this.changeListeners.filter(l => l !== cb); };
    }

    getAlerts(): UserAlert[] { return [...this.alerts]; }

    /** Replace the whole alert list (cloud pull). Does not notify changes. */
    replaceAlerts(alerts: UserAlert[]): void {
        this.alerts = [...alerts];
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
        } catch { /* storage unavailable */ }
        this.syncSubscriptions();
        // Trigger listeners so hooks refresh their view
        this.listeners.forEach(l => l(this.alerts[0] ?? ({} as UserAlert)));
    }

    addAlert(alert: Omit<UserAlert, 'id' | 'createdAt' | 'status'>): UserAlert {
        const newAlert: UserAlert = {
            ...alert, id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            status: 'active', createdAt: new Date().toISOString(),
        };
        this.alerts = [...this.alerts, newAlert];
        this.persist();
        this.syncSubscriptions();
        return newAlert;
    }

    updateAlert(id: string, updates: Partial<UserAlert>): void {
        this.alerts = this.alerts.map(a => a.id === id ? { ...a, ...updates } : a);
        this.persist();
        this.syncSubscriptions();
    }

    removeAlert(id: string): void {
        this.alerts = this.alerts.filter(a => a.id !== id);
        this.persist();
        this.syncSubscriptions();
    }

    toggleAlert(id: string): void {
        this.alerts = this.alerts.map(a =>
            a.id === id ? { ...a, status: a.status === 'disabled' ? 'active' : 'disabled' } : a
        );
        this.persist();
        this.syncSubscriptions();
    }

    /** Begin live evaluation — one ticker subscription per alerted symbol. */
    start(): void {
        if (this.running) return;
        this.running = true;
        this.syncSubscriptions();
    }

    stop(): void {
        this.running = false;
        for (const unsub of this.unsubs.values()) unsub();
        this.unsubs.clear();
        this.lastPrices.clear();
    }

    // ── Internals ─────────────────────────────────────────────────────────

    private persist(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.alerts));
        } catch { /* storage unavailable (tests) */ }
        this.changeListeners.forEach(l => l());
    }

    private evaluableSymbols(): Set<string> {
        const symbols = new Set<string>();
        for (const a of this.alerts) {
            if (a.status === 'active' && a.symbol && LIVE_TYPES.has(a.type)) {
                symbols.add(a.symbol);
            }
        }
        return symbols;
    }

    /** Keep exactly one live subscription per symbol with an active alert. */
    private syncSubscriptions(): void {
        if (!this.running) return;
        const needed = this.evaluableSymbols();

        for (const [symbol, unsub] of this.unsubs) {
            if (!needed.has(symbol)) {
                unsub();
                this.unsubs.delete(symbol);
                this.lastPrices.delete(symbol);
            }
        }
        for (const symbol of needed) {
            if (!this.unsubs.has(symbol)) {
                this.unsubs.set(symbol,
                    marketData.subscribeSymbol(symbol, () => this.evaluate(symbol)));
            }
        }
    }

    private evaluate(symbol: string): void {
        const ticker = marketData.getTicker(symbol);
        if (!ticker) return;

        const prevPrice = this.lastPrices.get(symbol);
        this.lastPrices.set(symbol, ticker.price);

        for (const alert of this.alerts) {
            if (alert.status !== 'active' || alert.symbol !== symbol || !LIVE_TYPES.has(alert.type)) continue;

            // Recurring cooldown so a standing condition doesn't refire every tick
            if (alert.triggeredAt &&
                Date.now() - new Date(alert.triggeredAt).getTime() < RECURRING_COOLDOWN_MS) continue;

            if (this.conditionMet(alert, ticker.price, ticker.changePercent, prevPrice)) {
                this.trigger(alert, ticker.price);
            }
        }
    }

    private conditionMet(alert: UserAlert, price: number, changePercent: number, prevPrice?: number): boolean {
        const target = Number(alert.value);
        if (!Number.isFinite(target)) return false;

        if (alert.type === 'pct_move') {
            // "moves more than X% in session" (either direction)
            return Math.abs(changePercent) >= target;
        }

        switch (alert.condition) {
            case 'above':         return price > target;
            case 'below':         return price < target;
            case 'crosses_above': return prevPrice !== undefined && prevPrice <= target && price > target;
            case 'crosses_below': return prevPrice !== undefined && prevPrice >= target && price < target;
            case 'equals':        return Math.abs(price - target) <= Math.abs(target) * 1e-4;
            default:              return false;
        }
    }

    private trigger(alert: UserAlert, price: number): void {
        const now = new Date().toISOString();
        this.alerts = this.alerts.map(a =>
            a.id === alert.id
                ? { ...a, status: a.expiry === 'once' ? 'triggered' : 'active', triggeredAt: now }
                : a
        );
        this.persist();

        const triggered = this.alerts.find(a => a.id === alert.id)!;
        this.listeners.forEach(l => l(triggered));

        if (alert.notify.includes('in_app')) {
            useAlertStore.getState().addAlert({
                type: 'warn',
                message: `${alert.label} — ${alert.symbol} @ ${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
            });
        }
        if (alert.notify.includes('browser') && typeof Notification !== 'undefined' &&
            Notification.permission === 'granted') {
            new Notification('TradingTerminal Alert', { body: alert.label });
        }

        // 'once' alerts leave the active set — drop their subscription if last
        this.syncSubscriptions();
    }
}

// Singleton instance
export const alertEngine = new AlertEngine();
