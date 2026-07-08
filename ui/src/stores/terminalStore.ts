/**
 * terminalStore — global terminal UI state (symbol / account / session / theme).
 * Replaces the old TerminalContext reducer; one state model, one owner.
 *
 * The active symbol here is THE selected symbol — marketStore no longer keeps
 * its own copy.
 */
import { create } from 'zustand';
import { useAlertStore, type TerminalAlert } from './alertStore';

export type MarketSession = 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER';
export type TerminalTheme = 'dark' | 'light';

/** Symbol link channels (Bloomberg-style color groups) */
export type LinkGroup = 'A' | 'B' | 'C';

export const LINK_GROUP_COLORS: Record<LinkGroup, string> = {
    A: 'var(--color-amber)',
    B: 'var(--color-cyan)',
    C: 'var(--color-purple)',
};

/** Derive market session from current local time (US Eastern, approximate). */
function deriveSession(): MarketSession {
    const now  = new Date();
    const et   = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hhmm = et.getHours() * 100 + et.getMinutes();
    if (hhmm >= 400  && hhmm < 930)  return 'PRE';
    if (hhmm >= 930  && hhmm < 1600) return 'OPEN';
    if (hhmm >= 1600 && hhmm < 2000) return 'AFTER';
    return 'CLOSE';
}

interface TerminalStore {
    activeSymbol: string;
    activeAccount: string;
    marketSession: MarketSession;
    theme: TerminalTheme;
    /** Per-channel symbols — widgets in a link group follow their channel */
    linkGroups: Record<LinkGroup, string>;

    setSymbol:  (symbol: string) => void;
    setGroupSymbol: (group: LinkGroup, symbol: string) => void;
    setAccount: (account: string) => void;
    setSession: (session: MarketSession) => void;
    setTheme:   (theme: TerminalTheme) => void;
}

export const useTerminalStore = create<TerminalStore>((set) => ({
    activeSymbol:  'BTC/USD',
    activeAccount: 'U1234567',
    marketSession: deriveSession(),
    theme: 'dark',
    linkGroups: { A: 'BTC/USD', B: 'ETH/USD', C: 'SOL/USD' },

    setSymbol:  (activeSymbol)  => set({ activeSymbol }),
    setGroupSymbol: (group, symbol) => set(s => ({
        linkGroups: { ...s.linkGroups, [group]: symbol },
    })),
    setAccount: (activeAccount) => set({ activeAccount }),
    setSession: (marketSession) => set({ marketSession }),
    setTheme:   (theme) => {
        // Design tokens are CSS variables switched by this attribute
        if (typeof document !== 'undefined') {
            document.documentElement.dataset.theme = theme;
        }
        set({ theme });
    },
}));

// ─── Compatibility hook (mirrors the old TerminalContext API) ────────────────
// Prefer useTerminalStore / useAlertStore selectors in new code — this hook
// subscribes to everything, like the context it replaced.

export function useTerminal() {
    const activeSymbol  = useTerminalStore(s => s.activeSymbol);
    const activeAccount = useTerminalStore(s => s.activeAccount);
    const marketSession = useTerminalStore(s => s.marketSession);
    const theme         = useTerminalStore(s => s.theme);
    const setSymbol     = useTerminalStore(s => s.setSymbol);
    const setAccount    = useTerminalStore(s => s.setAccount);
    const setSession    = useTerminalStore(s => s.setSession);
    const setTheme      = useTerminalStore(s => s.setTheme);
    const alerts        = useAlertStore(s => s.alerts);
    const addAlert      = useAlertStore(s => s.addAlert);
    const clearAlert    = useAlertStore(s => s.clearAlert);

    return {
        state: { activeSymbol, activeAccount, marketSession, theme, alerts },
        setSymbol, setAccount, setSession, setTheme, addAlert, clearAlert,
    };
}

export type { TerminalAlert };
