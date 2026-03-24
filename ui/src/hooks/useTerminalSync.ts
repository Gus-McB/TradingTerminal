/**
 * useTerminalSync — convenience hook consumed by every widget.
 * Provides read + write access to the global TerminalContext and
 * optional per-widget symbol pinning.
 */
import { useEffect, useRef } from 'react';
import { useTerminal, type MarketSession } from '../context/TerminalContext';

interface TerminalSyncOptions {
    /** If set, this widget ignores the global activeSymbol and uses its own. */
    pinSymbol?: string;
    /** Called whenever the global activeSymbol changes (even if widget is pinned). */
    onSymbolChange?: (symbol: string) => void;
    /** Called whenever a new alert is added. */
    onAlertFired?: (alertId: string) => void;
}

export function useTerminalSync(opts: TerminalSyncOptions = {}) {
    const terminal = useTerminal();
    const { state, setSymbol, setAccount, setSession, addAlert, clearAlert, setTheme } = terminal;

    // Fire onSymbolChange callback when the global symbol changes
    const prevSymbol = useRef(state.activeSymbol);
    useEffect(() => {
        if (state.activeSymbol !== prevSymbol.current) {
            prevSymbol.current = state.activeSymbol;
            opts.onSymbolChange?.(state.activeSymbol);
        }
    }, [state.activeSymbol, opts.onSymbolChange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fire onAlertFired when a new alert arrives
    const prevAlertCount = useRef(state.alerts.length);
    useEffect(() => {
        if (state.alerts.length > prevAlertCount.current) {
            const newest = state.alerts[state.alerts.length - 1];
            opts.onAlertFired?.(newest.id);
        }
        prevAlertCount.current = state.alerts.length;
    }, [state.alerts]); // eslint-disable-line react-hooks/exhaustive-deps

    // The symbol this widget should actually display
    const effectiveSymbol = opts.pinSymbol ?? state.activeSymbol;

    return {
        // ── Read ──────────────────────────────────────────────────────
        symbol:        effectiveSymbol,
        globalSymbol:  state.activeSymbol,
        account:       state.activeAccount,
        session:       state.marketSession,
        alerts:        state.alerts,
        theme:         state.theme,
        isPinned:      !!opts.pinSymbol,

        // ── Write ─────────────────────────────────────────────────────
        setSymbol,
        setAccount,
        setSession: (s: MarketSession) => setSession(s),
        addAlert,
        clearAlert,
        setTheme,
    };
}
