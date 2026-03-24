/**
 * Widget Registry — central map of all available widget types.
 * To add a new widget: add an entry here + create the component file.
 */
import type { ComponentType } from 'react';
import type { WidgetType } from '../stores/workspaceStore';

// ─── Config Schema Field Types ────────────────────────────────────────────────

export type FieldType =
    | 'text' | 'number' | 'select' | 'multiSelect'
    | 'toggle' | 'symbolSearch' | 'color' | 'sliderRange';

export interface ConfigField {
    key: string;
    type: FieldType;
    label: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: unknown;
}

// ─── Registry Entry ────────────────────────────────────────────────────────────

export interface WidgetRegistryEntry {
    type: WidgetType;
    label: string;
    icon: string;       // Lucide icon name
    description: string;
    defaultSize: { w: number; h: number };
    minSize:     { w: number; h: number };
    maxSize:     { w: number; h: number };
    configSchema: ConfigField[];
    component: ComponentType<WidgetComponentProps>;
}

export interface WidgetComponentProps {
    widgetId:    string;
    workspaceId: string;
    config:      Record<string, unknown>;
    isEditMode?: boolean;
    className?:  string;
}

// ─── Lazy widget imports ──────────────────────────────────────────────────────
// Import at module load time (no dynamic imports needed — bundle is already chunked by RGL)

import { ChartWidget }            from './ChartWidget';
import { WatchlistWidget }        from './WatchlistWidget';
import { OrderEntryWidget }       from './OrderEntryWidget';
import { OptionChainWidget }      from './OptionChainWidget';
import { PositionsWidget }        from './PositionsWidget';
import { OrdersWidget }           from './OrdersWidget';
import { MarketDepthWidget }      from './MarketDepthWidget';
import { NewsFeedWidget }         from './NewsFeedWidget';
import { ScannerWidget }          from './ScannerWidget';
import { AccountSummaryWidget }   from './AccountSummaryWidget';
import { AlertsWidget }           from './AlertsWidget';
import { EconomicCalendarWidget } from './EconomicCalendarWidget';
import { NotesWidget }            from './NotesWidget';
import { PriceAlertWidget }       from './PriceAlertWidget';
import { HeatMapWidget }          from './HeatMapWidget';

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
    Chart: {
        type: 'Chart', label: 'Price Chart', icon: 'BarChart2',
        description: 'OHLCV candlestick chart with indicators',
        defaultSize: { w: 8, h: 5 }, minSize: { w: 4, h: 3 }, maxSize: { w: 12, h: 10 },
        configSchema: [
            { key: 'symbol',    type: 'symbolSearch', label: 'Symbol',     required: true },
            { key: 'chartType', type: 'select',       label: 'Chart Type', options: ['candlestick','line','bar','area'], defaultValue: 'candlestick' },
            { key: 'interval',  type: 'select',       label: 'Interval',   options: ['1m','5m','15m','1h','1D'],        defaultValue: '1m' },
            { key: 'indicators',type: 'multiSelect',  label: 'Indicators', options: ['EMA20','EMA50','SMA200','VWAP','RSI','MACD','Bollinger'] },
        ],
        component: ChartWidget,
    },
    Watchlist: {
        type: 'Watchlist', label: 'Watchlist', icon: 'Star',
        description: 'Symbol list with live price + change',
        defaultSize: { w: 3, h: 5 }, minSize: { w: 2, h: 3 }, maxSize: { w: 6, h: 12 },
        configSchema: [
            { key: 'symbols', type: 'multiSelect', label: 'Symbols', options: ['BTC/USD','ETH/USD','SOL/USD','DOGE/USD','XRP/USD','AAPL','TSLA','MSFT','NVDA','SPY'] },
        ],
        component: WatchlistWidget,
    },
    OrderEntry: {
        type: 'OrderEntry', label: 'Order Entry', icon: 'ShoppingCart',
        description: 'Buy / Sell trade ticket',
        defaultSize: { w: 4, h: 5 }, minSize: { w: 3, h: 4 }, maxSize: { w: 6, h: 8 },
        configSchema: [
            { key: 'defaultOrderType', type: 'select', label: 'Default Order Type', options: ['MARKET','LIMIT','STOP','STOP_LIMIT'], defaultValue: 'LIMIT' },
            { key: 'showAdvanced',     type: 'toggle', label: 'Show Advanced Options', defaultValue: false },
        ],
        component: OrderEntryWidget,
    },
    OptionChain: {
        type: 'OptionChain', label: 'Option Chain', icon: 'Link2',
        description: 'Calls & puts table for selected symbol',
        defaultSize: { w: 6, h: 5 }, minSize: { w: 5, h: 4 }, maxSize: { w: 12, h: 10 },
        configSchema: [
            { key: 'expiry', type: 'select', label: 'Expiry', options: ['Weekly','Monthly','Quarterly'], defaultValue: 'Monthly' },
        ],
        component: OptionChainWidget,
    },
    Positions: {
        type: 'Positions', label: 'Positions', icon: 'Briefcase',
        description: 'Open positions with unrealised P&L',
        defaultSize: { w: 7, h: 4 }, minSize: { w: 4, h: 3 }, maxSize: { w: 12, h: 8 },
        configSchema: [
            { key: 'showClosed', type: 'toggle', label: 'Show Closed Positions', defaultValue: false },
        ],
        component: PositionsWidget,
    },
    Orders: {
        type: 'Orders', label: 'Orders', icon: 'ClipboardList',
        description: 'Order blotter (open + recent fills)',
        defaultSize: { w: 7, h: 4 }, minSize: { w: 4, h: 3 }, maxSize: { w: 12, h: 8 },
        configSchema: [
            { key: 'filter', type: 'select', label: 'Filter', options: ['All','Open','Filled','Cancelled'], defaultValue: 'All' },
        ],
        component: OrdersWidget,
    },
    MarketDepth: {
        type: 'MarketDepth', label: 'Market Depth', icon: 'Layers',
        description: 'Level II order book (DOM)',
        defaultSize: { w: 3, h: 5 }, minSize: { w: 2, h: 4 }, maxSize: { w: 5, h: 12 },
        configSchema: [
            { key: 'levels', type: 'number', label: 'Levels', min: 5, max: 20, defaultValue: 10 },
        ],
        component: MarketDepthWidget,
    },
    NewsFeed: {
        type: 'NewsFeed', label: 'News Feed', icon: 'Newspaper',
        description: 'Latest market news and headlines',
        defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 8, h: 10 },
        configSchema: [
            { key: 'sources', type: 'multiSelect', label: 'Sources', options: ['Reuters','Bloomberg','MarketWatch','CNBC'] },
        ],
        component: NewsFeedWidget,
    },
    Scanner: {
        type: 'Scanner', label: 'Scanner', icon: 'ScanLine',
        description: 'Filterable market screener',
        defaultSize: { w: 6, h: 5 }, minSize: { w: 4, h: 3 }, maxSize: { w: 12, h: 10 },
        configSchema: [
            { key: 'preset', type: 'select', label: 'Preset', options: ['Top Gainers','Top Losers','High Volume','Near High','Near Low'], defaultValue: 'Top Gainers' },
        ],
        component: ScannerWidget,
    },
    AccountSummary: {
        type: 'AccountSummary', label: 'Account Summary', icon: 'Wallet',
        description: 'Equity, P&L and margin overview',
        defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 6, h: 6 },
        configSchema: [
            { key: 'currency', type: 'select', label: 'Currency', options: ['USD','EUR','GBP','JPY'], defaultValue: 'USD' },
        ],
        component: AccountSummaryWidget,
    },
    Alerts: {
        type: 'Alerts', label: 'Alerts', icon: 'Bell',
        description: 'Active terminal alerts',
        defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 8, h: 8 },
        configSchema: [],
        component: AlertsWidget,
    },
    EconomicCalendar: {
        type: 'EconomicCalendar', label: 'Econ Calendar', icon: 'CalendarDays',
        description: 'Upcoming economic events',
        defaultSize: { w: 5, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 10, h: 8 },
        configSchema: [
            { key: 'impact', type: 'select', label: 'Min Impact', options: ['All','Medium','High'], defaultValue: 'Medium' },
        ],
        component: EconomicCalendarWidget,
    },
    Notes: {
        type: 'Notes', label: 'Notes', icon: 'FileText',
        description: 'Freetext notepad (persisted per workspace)',
        defaultSize: { w: 4, h: 4 }, minSize: { w: 2, h: 2 }, maxSize: { w: 8, h: 10 },
        configSchema: [],
        component: NotesWidget,
    },
    PriceAlert: {
        type: 'PriceAlert', label: 'Price Alert', icon: 'TrendingUp',
        description: 'Configure price threshold alerts',
        defaultSize: { w: 4, h: 3 }, minSize: { w: 3, h: 3 }, maxSize: { w: 6, h: 6 },
        configSchema: [
            { key: 'symbol',    type: 'symbolSearch', label: 'Symbol',    required: true },
            { key: 'threshold', type: 'number',       label: 'Threshold', min: 0 },
            { key: 'direction', type: 'select',       label: 'Direction', options: ['above','below'], defaultValue: 'above' },
        ],
        component: PriceAlertWidget,
    },
    HeatMap: {
        type: 'HeatMap', label: 'Heat Map', icon: 'Grid3x3',
        description: 'Sector / market cap heatmap',
        defaultSize: { w: 6, h: 5 }, minSize: { w: 4, h: 4 }, maxSize: { w: 12, h: 10 },
        configSchema: [
            { key: 'groupBy', type: 'select', label: 'Group By', options: ['Sector','Market Cap','Asset Class'], defaultValue: 'Sector' },
            { key: 'metric',  type: 'select', label: 'Metric',   options: ['1D %','5D %','1M %','Volume'], defaultValue: '1D %' },
        ],
        component: HeatMapWidget,
    },
};

export const WIDGET_LIST = Object.values(WIDGET_REGISTRY);
