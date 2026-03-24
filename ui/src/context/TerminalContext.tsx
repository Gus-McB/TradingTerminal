/**
 * TerminalContext — global trading terminal state shared across all widgets.
 * Changing activeSymbol here propagates to every widget that consumes this context.
 */
import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketSession = 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER';
export type TerminalTheme = 'dark' | 'light';

export interface TerminalAlert {
    id: string;
    type: 'info' | 'warn' | 'danger';
    message: string;
    timestamp: string;
}

export interface TerminalState {
    activeSymbol: string;
    activeAccount: string;
    marketSession: MarketSession;
    alerts: TerminalAlert[];
    theme: TerminalTheme;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
    | { type: 'SET_SYMBOL';  payload: string }
    | { type: 'SET_ACCOUNT'; payload: string }
    | { type: 'SET_SESSION'; payload: MarketSession }
    | { type: 'ADD_ALERT';   payload: Omit<TerminalAlert, 'id' | 'timestamp'> }
    | { type: 'CLEAR_ALERT'; payload: string }
    | { type: 'SET_THEME';   payload: TerminalTheme };

function reducer(state: TerminalState, action: Action): TerminalState {
    switch (action.type) {
        case 'SET_SYMBOL':  return { ...state, activeSymbol: action.payload };
        case 'SET_ACCOUNT': return { ...state, activeAccount: action.payload };
        case 'SET_SESSION': return { ...state, marketSession: action.payload };
        case 'SET_THEME':   return { ...state, theme: action.payload };
        case 'ADD_ALERT':
            return {
                ...state,
                alerts: [
                    ...state.alerts,
                    {
                        ...action.payload,
                        id: `alert-${Date.now()}-${Math.random()}`,
                        timestamp: new Date().toISOString(),
                    },
                ],
            };
        case 'CLEAR_ALERT':
            return { ...state, alerts: state.alerts.filter(a => a.id !== action.payload) };
        default:
            return state;
    }
}

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

const INITIAL: TerminalState = {
    activeSymbol:  'BTC/USD',
    activeAccount: 'U1234567',
    marketSession: deriveSession(),
    alerts: [],
    theme: 'dark',
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface TerminalContextValue {
    state: TerminalState;
    setSymbol:  (symbol: string)  => void;
    setAccount: (account: string) => void;
    setSession: (session: MarketSession) => void;
    addAlert:   (alert: Omit<TerminalAlert, 'id' | 'timestamp'>) => void;
    clearAlert: (id: string) => void;
    setTheme:   (theme: TerminalTheme) => void;
}

const TerminalContext = createContext<TerminalContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TerminalProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, INITIAL);

    const setSymbol  = useCallback((s: string)          => dispatch({ type: 'SET_SYMBOL',  payload: s }), []);
    const setAccount = useCallback((a: string)          => dispatch({ type: 'SET_ACCOUNT', payload: a }), []);
    const setSession = useCallback((s: MarketSession)   => dispatch({ type: 'SET_SESSION', payload: s }), []);
    const setTheme   = useCallback((t: TerminalTheme)   => dispatch({ type: 'SET_THEME',   payload: t }), []);
    const addAlert   = useCallback((a: Omit<TerminalAlert, 'id' | 'timestamp'>) =>
        dispatch({ type: 'ADD_ALERT', payload: a }), []);
    const clearAlert = useCallback((id: string)         => dispatch({ type: 'CLEAR_ALERT', payload: id }), []);

    return (
        <TerminalContext.Provider value={{ state, setSymbol, setAccount, setSession, addAlert, clearAlert, setTheme }}>
            {children}
        </TerminalContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTerminal(): TerminalContextValue {
    const ctx = useContext(TerminalContext);
    if (!ctx) throw new Error('useTerminal must be used within TerminalProvider');
    return ctx;
}
