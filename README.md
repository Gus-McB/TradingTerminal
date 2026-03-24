# TradingTerminal

An affordable, low-latency trading platform for day traders. Inspired by the Bloomberg Terminal — professional-grade tooling with accessibility and affordability.

---

## Overview

TradingTerminal is a desktop application built on Electron + React with a modular widget-based workspace. It targets sub-10ms order execution, supports user-authored trading algorithms, and provides real-time market data visualization through a highly configurable, information-dense UI.

**Status:** Active development. UI overhaul in progress; core widget system functional. Order book, mock market feed, and OAuth authentication are implemented.

---

## Architecture

```
TradingTerminal/
├── electron/           # Electron main process (window management, IPC)
├── ui/                 # React + Vite frontend (Tailwind, Zustand, Socket.IO)
├── middleware/         # Express.js + Socket.IO backend (market data, order routing)
├── engine/             # C++ trading engine (CMake, sub-10ms order execution)
└── ROAD_MAP.md         # Detailed feature specification for all 10 planned modules
```

### Monorepo Workspaces

The root `package.json` manages three JS workspaces: `middleware`, `ui`, and `electron`. The C++ engine is a CMake project in `/engine`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron (frameless window, IPC) |
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4, custom CSS variables |
| State management | Zustand 5 (with localStorage persistence) |
| Routing | React Router DOM 7 |
| Real-time data | Socket.IO Client 4 |
| Charting | Lightweight Charts 5 (candles), Recharts 3 (portfolio) |
| Widget layout | React Grid Layout 2 (drag, resize) |
| Auth & DB | Supabase (PostgreSQL + OAuth) |
| Backend | Node.js + Express.js + Socket.IO |
| Order engine | C++ (CMake build) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- CMake (for C++ engine)
- Supabase project (for auth)

### Environment Variables

Create `ui/.env`:
```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Run

```bash
# Install all dependencies (root, ui, middleware, electron)
npm install

# Development (middleware on :3000 + Vite on :5173)
npm run dev

# Development with Electron window
npm run dev:electron

# Full stack (engine + middleware + UI + Electron)
npm run startall

# Production build
npm run build
```

---

## Backend API

### REST Endpoints

The middleware runs on `http://localhost:3000`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check — returns `{ status: 'ok', timestamp: <ms> }` |

### Socket.IO Events

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `subscribe` | `symbol: string` | Subscribe to real-time market data for a symbol |
| `unsubscribe` | `symbol: string` | Unsubscribe from a symbol |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `orderbook:snapshot` | `{ symbol, bids, asks, spread, spreadPercent }` | Initial order book (Level II), sent on subscribe |
| `ticker:update` | `{ symbol, price, change24h, changePercent, high24h, low24h, volume }` | Live price tick |
| `kline:history` | `{ symbol, klines: Candle[] }` | Historical OHLCV candles, sent on subscribe |
| `kline:update` | `{ symbol, candle: Candle }` | Live bar update (appends or replaces last bar) |

**Candle shape:**
```typescript
{ time: number, open: number, high: number, low: number, close: number, volume: number, closed?: boolean }
```

**OrderBook shape:**
```typescript
{
  symbol: string,
  bids: { price: number, size: number, total: number }[],
  asks: { price: number, size: number, total: number }[],
  spread: number,
  spreadPercent: number
}
```

---

## Electron IPC

The Electron main process (`electron/main.js`) handles window management and workspace pop-outs.

| Channel | Direction | Description |
|---------|-----------|-------------|
| `window-minimize` | Renderer → Main | Minimize main window |
| `window-maximize` | Renderer → Main | Maximize/restore main window |
| `window-close` | Renderer → Main | Close main window |
| `open-widget` | Renderer → Main | Pop out widget in new window — `{ type, symbol }` |
| `open-workspace` | Renderer → Main | Pop out workspace — `{ workspaceId }` |
| `transfer-widget` | Renderer → Main | Move widget between windows — `{ widget, targetWorkspaceId }` |
| `workspace-updated` | Main → Renderer | Notify workspace of external changes — `{ workspaceId }` |
| `workspace-closed` | Main → Renderer | Workspace window was closed — `{ workspaceId }` |

---

## Authentication

OAuth via Supabase. Google and GitHub providers are configured.

**Flow:**
1. User lands on `/login`
2. Clicks "Sign in with Google" or "Sign in with GitHub"
3. OAuth redirect handled by Supabase
4. On return, `authStore` fetches user role from `profiles` table
5. `ProtectedRoute` checks `isAuthenticated` before rendering `/` or `/config`

**Roles:** `'free' | 'subscribed' | 'admin'`

**Dev mode:** `devLogin()` bypasses OAuth and sets role `admin`.

**Supabase Tables:**

| Table | Columns | Purpose |
|-------|---------|---------|
| `profiles` | `id (uuid)`, `role` | Stores user role for access control |

---

## Frontend State

Three Zustand stores plus a React context handle all frontend state.

### TerminalContext (`context/TerminalContext.tsx`)

Global terminal state shared across all widgets:

```typescript
{
  activeSymbol: string        // e.g. "BTC/USD" — broadcast to all widgets
  activeAccount: string       // e.g. "U1234567"
  marketSession: 'PRE' | 'OPEN' | 'CLOSE' | 'AFTER'
  alerts: TerminalAlert[]
  theme: 'dark' | 'light'
}
```

Market session is derived from current Eastern Time:
- `04:00–09:29` → `PRE`
- `09:30–16:00` → `OPEN`
- `16:00–20:00` → `AFTER`
- Otherwise → `CLOSE`

### AuthStore (`stores/authStore.ts`)

Persisted to `localStorage` key `trading-terminal-auth`.

```typescript
{ user, session, role, isAuthenticated, isLoading }
```

Methods: `initialize()`, `signInWithGoogle()`, `signInWithGithub()`, `devLogin()`, `signOut()`, `hasAccess(role)`

### MarketStore (`stores/marketStore.ts`)

Real-time market data. Populated by Socket.IO events from the middleware.

```typescript
{
  tickers: Map<string, Ticker>
  orderBooks: Map<string, OrderBook>
  candles: Map<string, Candle[]>
  selectedSymbol: string
  connected: boolean
  useRealData: boolean
}
```

### WorkspaceStore (`stores/workspaceStore.ts`)

Persisted to `localStorage` key `trading-terminal-workspaces-v2`.

Manages workspaces (named grid layouts), each containing a list of `LayoutWidget` objects with grid position (`x`, `y`, `w`, `h`), widget type, and per-widget config.

**Built-in workspace templates:** `blank`, `dayTrader`, `optionsTrader`, `portfolioMonitor`

Methods: `addWorkspace`, `removeWorkspace`, `renameWorkspace`, `duplicateWorkspace`, `addWidget`, `removeWidget`, `updateWidgetLayout`, `updateWidgetConfig`, `exportWorkspace`, `importWorkspace`

---

## Widget System

All widgets are registered in `widgets/registry.tsx`. Each entry defines default/min/max grid size, a config schema, and the React component.

### Available Widgets

| Type | Component | Description |
|------|-----------|-------------|
| `Chart` | `ChartWidget` | OHLCV candlestick/line/bar/area chart |
| `Watchlist` | `WatchlistWidget` | Symbol list with live prices |
| `OrderEntry` | `OrderEntryWidget` | Buy/Sell trade ticket |
| `OptionChain` | `OptionChainWidget` | Calls & puts table |
| `Positions` | `PositionsWidget` | Open positions with P&L |
| `Orders` | `OrdersWidget` | Order blotter |
| `MarketDepth` | `MarketDepthWidget` | Order book (Level II) |
| `NewsFeed` | `NewsFeedWidget` | News articles |
| `Scanner` | `ScannerWidget` | Stock screener |
| `AccountSummary` | `AccountSummaryWidget` | Equity, P&L, margin |
| `Alerts` | `AlertsWidget` | Terminal notifications |
| `EconomicCalendar` | `EconomicCalendarWidget` | Upcoming macro events |
| `Notes` | `NotesWidget` | Rich text notepad |
| `PriceAlert` | `PriceAlertWidget` | Price threshold alerts |
| `HeatMap` | `HeatMapWidget` | Sector/market cap heatmap |

### Widget Configuration

Each widget can be pinned to a symbol via `config.pinSymbol`. If not pinned, it responds to the global `activeSymbol` from `TerminalContext`. Config panels are displayed in the right-side `WidgetConfigPanel` drawer.

---

## Technical Indicators (`utils/indicators.ts`)

All indicator functions are pure, returning `(number | null)[]` aligned to input length.

**Trend:** EMA, SMA, WMA, VWAP, Ichimoku, Parabolic SAR, Pivot Points, Donchian Channels, Keltner Channels, Linear Regression, Price Envelopes

**Momentum:** RSI, MACD, Stochastic, Williams %R, Momentum, CCI, ADX+DMI

**Volume / Volatility:** OBV, ATR, Bollinger Bands

---

## UI Structure

```
App (Router)
└── AppShell
    ├── TitleBar                  — frameless window controls (Electron)
    ├── TradingNavbar             — IBKR-style taskbar
    │   ├── Module launchers      — Portfolio, Watchlist, Orders, etc.
    │   ├── Market strip          — SPX, NDX, DJI, VIX live quotes
    │   ├── Command bar           — search, alerts, user menu
    │   └── Open panel tabs
    └── Route Outlet
        ├── /login                — LoginPage (OAuth)
        ├── / (protected)         — WidgetPage (main trading canvas)
        │   ├── EditModeBar       — workspace name, save/discard
        │   ├── WorkspaceTabBar   — workspace switcher
        │   ├── WidgetPalette     — add widget panel
        │   ├── GridLayout        — react-grid-layout (drag/resize)
        │   │   └── WidgetFrame[] — per-widget chrome
        │   │       └── Widget    — ChartWidget, OrderEntryWidget, etc.
        │   └── WidgetConfigPanel — right-side config drawer
        ├── /config (protected)   — WorkspaceConfigPage
        └── /upgrade              — UpgradePage
```

---

## Theming

CSS variables defined in `ui/src/index.css`:

```css
--terminal-bg:      #0a0a0f   /* near black */
--terminal-surface: #12121a
--terminal-border:  #2a2a3a
--terminal-text:    #c0c0c0
--terminal-cyan:    #00a8ff   /* primary accent */
--terminal-red:     #ff3366   /* danger / sell */
--terminal-green:   #00cc44   /* success / buy */
```

Theme (`dark` | `light`) is toggled via `TerminalContext.setTheme()`.

---

## Mock Market Data

For development, `ui/src/data/mockMarket.ts` provides:

- **Tickers:** BTC/USD, ETH/USD, SOL/USD, DOGE/USD, XRP/USD with realistic prices
- **`generateOrderBook(midPrice)`** — 8 bid/ask levels with cumulative totals
- **`simulatePriceUpdate(ticker)`** — ±0.02% random walk for live price simulation

When `useRealData: false` in `marketStore`, the frontend uses mock generators. In production, Socket.IO feeds real data from the middleware.

---

## Planned Features (ROAD_MAP.md)

The roadmap defines 10 modules for future implementation:

1. **Enhanced Chart Engine** — Drawing tools (trend lines, Fibonacci, annotations), indicator management panel, chart templates
2. **Multi-Tab Market Watcher** — Symbol tabs, market tabs, isolated vs synced modes
3. **AI News & Research** — AI summary banner, source manager, sentiment tagging, article reader
4. **Portfolio Page** — Allocation breakdown, equity curve, risk metrics (Beta, Sharpe, drawdown), Greeks
5. **Watchlist & Screener** — Advanced filter builder (fundamental, technical, options), pre-built scans
6. **Order Management** — Bracket orders, algo orders (TWAP/VWAP/Iceberg), options spreads, order queue
7. **Alerts & Notifications** — Multi-type alert builder, toast system, sound, browser notifications
8. **Economic Calendar** — Central bank, earnings, dividends, options expiry; week/list views
9. **Research & Notes** — Per-symbol fundamentals, financials, analyst ratings, rich text notes with chart annotations
10. **Settings & Hotkeys** — Fully customizable appearance, trading defaults, hotkeys, data feeds, account management

**Differentiators planned:** AI morning briefing, trade journal with screenshots, strategy backtester, S&P 500 heatmap, command palette (Cmd+K), multi-monitor pop-out with BroadcastChannel sync, keyboard trading mode, dark pool/options flow ticker.

---

## Security Notes

- Electron renderer has context isolation enabled and Node integration disabled
- CSP headers enforced (permissive in dev, restrictive in production)
- Never commit `.env` files or hardcode credentials
- Supabase anon key is safe to expose in frontend; RLS policies enforce data access
- Input validation required at all system boundaries (Socket.IO, Supabase, IPC handlers)

---

## File Organization Rules

- Source code → `ui/src/` or `middleware/src/`
- Tests → `/tests`
- Documentation → `/docs`
- Config files → `/config`
- Scripts → `/scripts`
- **Never save files to the root folder** (except README.md and CLAUDE.md)

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `ui/src/App.tsx` | Router — defines all routes |
| `ui/src/context/TerminalContext.tsx` | Global terminal state (symbol, theme, alerts, session) |
| `ui/src/stores/authStore.ts` | Auth state + Supabase OAuth methods |
| `ui/src/stores/marketStore.ts` | Real-time market data (populated by Socket.IO) |
| `ui/src/stores/workspaceStore.ts` | Workspace/widget layouts (localStorage) |
| `ui/src/services/socketManager.ts` | Socket.IO client — connects to middleware:3000 |
| `ui/src/widgets/registry.tsx` | Widget registry with metadata + component refs |
| `ui/src/utils/indicators.ts` | 20+ technical indicator calculations (pure functions) |
| `ui/src/data/mockMarket.ts` | Mock tickers + order book generator for dev |
| `ui/src/lib/supabase.ts` | Supabase client initialization |
| `middleware/src/index.js` | Express + Socket.IO server (port 3000) |
| `electron/main.js` | Electron main process + IPC handlers |
| `ROAD_MAP.md` | Detailed feature specs for all 10 planned modules |
| `CLAUDE.md` | Agent behavioral rules and project configuration |
