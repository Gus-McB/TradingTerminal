/**
 * newsSourceStore — Zustand store for news source subscriptions.
 * Manages which news sources the user is subscribed to and their fetch state.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SourceCategory = 'financial' | 'macro' | 'research' | 'social' | 'earnings' | 'custom';
export type FetchSchedule  = 'market-open' | 'hourly' | 'daily' | 'manual';
export type SourceStatus   = 'ok' | 'slow' | 'error' | 'idle';

export interface NewsSource {
    id:          string;
    name:        string;
    category:    SourceCategory;
    logo:        string;         // Emoji or URL
    subscribed:  boolean;
    schedule:    FetchSchedule;
    status:      SourceStatus;
    lastFetch?:  string;         // ISO timestamp
    articleCount:number;         // Today's count
    url?:        string;         // RSS / website URL
    isCustom:    boolean;
}

// ─── Built-in Sources ─────────────────────────────────────────────────────────

const BUILTIN_SOURCES: NewsSource[] = [
    // Financial News
    { id: 'reuters',     name: 'Reuters',       category: 'financial', logo: '📰', subscribed: true,  schedule: 'hourly',      status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 24, isCustom: false },
    { id: 'bloomberg',   name: 'Bloomberg',     category: 'financial', logo: '📰', subscribed: true,  schedule: 'hourly',      status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 31, isCustom: false },
    { id: 'wsj',         name: 'WSJ',           category: 'financial', logo: '📰', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    { id: 'ft',          name: 'Financial Times',category: 'financial', logo: '📰', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    { id: 'cnbc',        name: 'CNBC',          category: 'financial', logo: '📰', subscribed: true,  schedule: 'market-open', status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 18, isCustom: false },
    { id: 'marketwatch', name: 'MarketWatch',   category: 'financial', logo: '📰', subscribed: true,  schedule: 'hourly',      status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 15, isCustom: false },
    { id: 'barrons',     name: "Barron's",      category: 'financial', logo: '📰', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    // Macro / Economics
    { id: 'fed',         name: 'Federal Reserve',category: 'macro',    logo: '📊', subscribed: true,  schedule: 'daily',       status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 2, isCustom: false },
    { id: 'ecb',         name: 'ECB',           category: 'macro',    logo: '📊', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    { id: 'bls',         name: 'BLS (CPI/Jobs)',category: 'macro',    logo: '📊', subscribed: true,  schedule: 'daily',       status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 1, isCustom: false },
    // Research
    { id: 'seeking-alpha',name: 'Seeking Alpha',category: 'research', logo: '🔬', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    { id: 'zacks',       name: 'Zacks',         category: 'research', logo: '🔬', subscribed: false, schedule: 'daily',       status: 'idle', articleCount: 0, isCustom: false },
    { id: 'morningstar', name: 'Morningstar',   category: 'research', logo: '🔬', subscribed: true,  schedule: 'daily',       status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 5, isCustom: false },
    // Social / Alt Data
    { id: 'stocktwits',  name: 'StockTwits',    category: 'social',   logo: '🐦', subscribed: false, schedule: 'hourly',      status: 'idle', articleCount: 0, isCustom: false },
    { id: 'wsb',         name: 'WallStreetBets Sentiment', category: 'social', logo: '🐦', subscribed: false, schedule: 'hourly', status: 'idle', articleCount: 0, isCustom: false },
    // Earnings
    { id: 'edgar',       name: 'SEC EDGAR',     category: 'earnings', logo: '📅', subscribed: true,  schedule: 'market-open', status: 'ok',   lastFetch: new Date().toISOString(), articleCount: 3, isCustom: false },
    { id: 'earningswhispers',name: 'Earnings Whispers',category:'earnings',logo:'📅',subscribed:false,schedule:'daily',status:'idle',articleCount:0,isCustom:false },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface NewsSourceStore {
    sources:    NewsSource[];
    bookmarks:  string[];         // Article IDs

    toggleSubscription: (id: string) => void;
    updateSchedule:     (id: string, schedule: FetchSchedule) => void;
    addCustomSource:    (name: string, url: string, schedule: FetchSchedule) => void;
    removeSource:       (id: string) => void;
    markFetched:        (id: string, count: number) => void;
    addBookmark:        (articleId: string) => void;
    removeBookmark:     (articleId: string) => void;
}

export const useNewsSourceStore = create<NewsSourceStore>()(
    persist(
        (set, get) => ({
            sources:   BUILTIN_SOURCES,
            bookmarks: [],

            toggleSubscription: (id) => set(s => ({
                sources: s.sources.map(src => src.id === id ? { ...src, subscribed: !src.subscribed } : src),
            })),

            updateSchedule: (id, schedule) => set(s => ({
                sources: s.sources.map(src => src.id === id ? { ...src, schedule } : src),
            })),

            addCustomSource: (name, url, schedule) => {
                const src: NewsSource = {
                    id: `custom-${Date.now()}`, name, url, category: 'custom', logo: '🌐',
                    subscribed: true, schedule, status: 'idle', articleCount: 0, isCustom: true,
                };
                set(s => ({ sources: [...s.sources, src] }));
            },

            removeSource: (id) => set(s => ({
                sources: s.sources.filter(src => src.id !== id || !src.isCustom),
            })),

            markFetched: (id, count) => set(s => ({
                sources: s.sources.map(src =>
                    src.id === id ? { ...src, lastFetch: new Date().toISOString(), articleCount: count, status: 'ok' } : src
                ),
            })),

            addBookmark:    (id) => { if (!get().bookmarks.includes(id)) set(s => ({ bookmarks: [...s.bookmarks, id] })); },
            removeBookmark: (id) => set(s => ({ bookmarks: s.bookmarks.filter(b => b !== id) })),
        }),
        { name: 'trading-terminal-news-sources-v1' }
    )
);
