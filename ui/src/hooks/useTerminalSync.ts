/**
 * useTerminalSync — convenience hook consumed by every widget.
 * Provides read + write access to the global terminal stores and
 * optional per-widget symbol pinning.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useTerminalStore, type MarketSession, type LinkGroup } from '../stores/terminalStore';
import { useAlertStore } from '../stores/alertStore';

interface TerminalSyncOptions {
    /** If set, this widget ignores group/global symbols and uses its own (unlinked). */
    pinSymbol?: string;
    /** Color channel: the widget follows and retargets its group's symbol. */
    linkGroup?: LinkGroup | 'none' | string;
    /** Called whenever the global activeSymbol changes (even if widget is pinned). */
    onSymbolChange?: (symbol: string) => void;
    /** Called whenever a new alert is added. */
    onAlertFired?: (alertId: string) => void;
}

function asLinkGroup(value: TerminalSyncOptions['linkGroup']): LinkGroup | undefined {
    return value === 'A' || value === 'B' || value === 'C' ? value : undefined;
}

export function useTerminalSync(opts: TerminalSyncOptions = {}) {
    const linkGroup = asLinkGroup(opts.linkGroup);

    const activeSymbol  = useTerminalStore(s => s.activeSymbol);
    const groupSymbol   = useTerminalStore(s => (linkGroup ? s.linkGroups[linkGroup] : undefined));
    const activeAccount = useTerminalStore(s => s.activeAccount);
    const marketSession = useTerminalStore(s => s.marketSession);
    const theme         = useTerminalStore(s => s.theme);
    const setGlobalSymbol = useTerminalStore(s => s.setSymbol);
    const setGroupSymbol  = useTerminalStore(s => s.setGroupSymbol);
    const setAccount    = useTerminalStore(s => s.setAccount);
    const setSession    = useTerminalStore(s => s.setSession);
    const setTheme      = useTerminalStore(s => s.setTheme);

    // Writes retarget the widget's own channel; ungrouped widgets move the
    // global symbol as before.
    const setSymbol = useCallback((symbol: string) => {
        if (linkGroup) setGroupSymbol(linkGroup, symbol);
        else setGlobalSymbol(symbol);
    }, [linkGroup, setGroupSymbol, setGlobalSymbol]);

    const alerts     = useAlertStore(s => s.alerts);
    const addAlert   = useAlertStore(s => s.addAlert);
    const clearAlert = useAlertStore(s => s.clearAlert);

    // Fire onSymbolChange callback when the global symbol changes
    const prevSymbol = useRef(activeSymbol);
    useEffect(() => {
        if (activeSymbol !== prevSymbol.current) {
            prevSymbol.current = activeSymbol;
            opts.onSymbolChange?.(activeSymbol);
        }
    }, [activeSymbol, opts.onSymbolChange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Fire onAlertFired when a new alert arrives
    const prevAlertCount = useRef(alerts.length);
    useEffect(() => {
        if (alerts.length > prevAlertCount.current) {
            const newest = alerts[alerts.length - 1];
            opts.onAlertFired?.(newest.id);
        }
        prevAlertCount.current = alerts.length;
    }, [alerts]); // eslint-disable-line react-hooks/exhaustive-deps

    // The symbol this widget should actually display:
    // pin (unlinked) > link group channel > global
    const effectiveSymbol = opts.pinSymbol ?? groupSymbol ?? activeSymbol;

    return {
        // ── Read ──────────────────────────────────────────────────────
        symbol:        effectiveSymbol,
        globalSymbol:  activeSymbol,
        account:       activeAccount,
        session:       marketSession,
        alerts,
        theme,
        isPinned:      !!opts.pinSymbol,
        linkGroup,

        // ── Write ─────────────────────────────────────────────────────
        setSymbol,
        setAccount,
        setSession: (s: MarketSession) => setSession(s),
        addAlert,
        clearAlert,
        setTheme,
    };
}
