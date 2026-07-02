/**
 * TabContext — multi-tab market watcher context.
 * Each tab is an independent "watch context" with its own symbol focus.
 */
import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabType = 'symbol' | 'watchlist' | 'market' | 'portfolio' | 'strategy';

export interface MarketTab {
    id:       string;
    type:     TabType;
    name:     string;
    symbol?:  string;           // For symbol tabs
    symbols?: string[];         // For watchlist tabs
    synced:   boolean;          // true = broadcasts to global TerminalContext
    pinned:   boolean;          // prevent close
}

interface TabState {
    tabs:        MarketTab[];
    activeTabId: string;
}

type TabAction =
    | { type: 'ADD_TAB';      payload: Omit<MarketTab, 'id'> }
    | { type: 'REMOVE_TAB';   payload: string }
    | { type: 'SET_ACTIVE';   payload: string }
    | { type: 'UPDATE_TAB';   payload: Partial<MarketTab> & { id: string } }
    | { type: 'REORDER_TABS'; payload: MarketTab[] };

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_TABS: MarketTab[] = [
    { id: 'tab-1', type: 'symbol',    name: 'BTC/USD',     symbol: 'BTC/USD', synced: true,  pinned: true  },
    { id: 'tab-2', type: 'watchlist', name: 'Tech Stocks',  symbols: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOG'], synced: true,  pinned: false },
    { id: 'tab-3', type: 'market',    name: 'S&P 500',                         synced: false, pinned: false },
];

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: TabState, action: TabAction): TabState {
    switch (action.type) {
        case 'ADD_TAB': {
            const tab: MarketTab = { ...action.payload, id: `tab-${Date.now()}` };
            return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id };
        }
        case 'REMOVE_TAB': {
            const filtered = state.tabs.filter(t => t.id !== action.payload);
            const newActive = state.activeTabId === action.payload
                ? (filtered[filtered.length - 1]?.id ?? '')
                : state.activeTabId;
            return { tabs: filtered, activeTabId: newActive };
        }
        case 'SET_ACTIVE':   return { ...state, activeTabId: action.payload };
        case 'UPDATE_TAB':   return { ...state, tabs: state.tabs.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t) };
        case 'REORDER_TABS': return { ...state, tabs: action.payload };
        default:             return state;
    }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface TabContextValue {
    tabs:        MarketTab[];
    activeTab:   MarketTab | undefined;
    addTab:      (tab: Omit<MarketTab, 'id'>) => void;
    removeTab:   (id: string) => void;
    setActiveTab:(id: string) => void;
    updateTab:   (id: string, updates: Partial<MarketTab>) => void;
    reorderTabs: (tabs: MarketTab[]) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TabProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, { tabs: DEFAULT_TABS, activeTabId: 'tab-1' });

    const addTab      = useCallback((tab: Omit<MarketTab, 'id'>) => dispatch({ type: 'ADD_TAB',      payload: tab }),          []);
    const removeTab   = useCallback((id: string)                  => dispatch({ type: 'REMOVE_TAB',   payload: id }),           []);
    const setActiveTab= useCallback((id: string)                  => dispatch({ type: 'SET_ACTIVE',   payload: id }),           []);
    const updateTab   = useCallback((id: string, u: Partial<MarketTab>) => dispatch({ type: 'UPDATE_TAB', payload: { id, ...u } }), []);
    const reorderTabs = useCallback((tabs: MarketTab[])           => dispatch({ type: 'REORDER_TABS', payload: tabs }),         []);

    const activeTab = state.tabs.find(t => t.id === state.activeTabId);

    return (
        <TabContext.Provider value={{ tabs: state.tabs, activeTab, addTab, removeTab, setActiveTab, updateTab, reorderTabs }}>
            {children}
        </TabContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTabContext(): TabContextValue {
    const ctx = useContext(TabContext);
    if (!ctx) throw new Error('useTabContext must be used within TabProvider');
    return ctx;
}
