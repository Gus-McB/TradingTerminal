You are a senior frontend architect and UX specialist building a professional,
commercial-grade trading terminal. You are enhancing an existing terminal that 
already has a navbar, workspace/widget system, and layout config. Your task is 
to design and implement a suite of high-value feature modules that bring this 
terminal to parity with — and beyond — Bloomberg, IBKR TWS, and TradingView.

All new modules must integrate with the existing:
- TerminalContext (global activeSymbol, activeAccount, marketSession, alerts)
- WorkspaceManager (layouts saved to localStorage / swappable API)
- Widget Registry (new widgets registered as modular entries)
- Navbar (new pages accessible via existing module launcher buttons)

---

## MODULE 1: ENHANCED CHART ENGINE WITH TECHNICAL INDICATORS & DRAWING TOOLS

### Chart Component
src/widgets/ChartWidget.jsx (enhanced)

Build on the existing ChartWidget to support a full indicator and drawing toolkit.

### Technical Indicators

Implement two categories rendered via a charting library 
(lightweight-charts by TradingView, or recharts with custom layers):

**Overlay Indicators** (rendered directly on the price pane, shared Y-axis):
- Simple Moving Average (SMA) — configurable period, color, line style
- Exponential Moving Average (EMA) — configurable period
- Weighted Moving Average (WMA)
- Bollinger Bands — period + standard deviation multiplier, fill opacity
- VWAP — intraday only, resets at market open, distinct color
- Ichimoku Cloud — Tenkan, Kijun, Senkou A/B, Chikou — shaded cloud fill
- Parabolic SAR — dot markers above/below candles
- Pivot Points — daily/weekly/monthly horizontal levels with labels (R1-R3, S1-S3, PP)
- Fibonacci Retracement — auto-drawn between two price points, % labels
- Donchian Channels — highest high / lowest low over N periods
- Keltner Channels — EMA ± (ATR × multiplier)
- Linear Regression Channel — best fit line + upper/lower deviation bands
- Price Envelopes — SMA ± percentage bands

**Sub-Pane Indicators** (separate pane below chart, independent Y-axis):
- RSI — overbought (70) / oversold (30) reference lines, configurable period
- MACD — histogram bars + signal line + MACD line, zero line reference
- Stochastic Oscillator — %K and %D lines, overbought/oversold bands
- ATR — volatility measure, useful for stop-loss sizing
- OBV (On-Balance Volume) — cumulative volume direction
- CCI (Commodity Channel Index) — ±100 reference lines
- Williams %R — -20/-80 reference levels
- ADX + DMI — trend strength, +DI/-DI lines
- Momentum — rate of change oscillator
- Volume — bar chart, color-coded green/red by candle direction

### Indicator Management Panel
- "Indicators" button on chart toolbar opens a searchable modal
- Left column: categorised list (Overlays / Oscillators / Volume / Volatility)
- Search bar filters by name
- Click to add; each added indicator appears in an "Active Indicators" list
- Each active indicator has:
  - Color swatch picker
  - Line style selector (solid / dashed / dotted)
  - Period / parameter inputs
  - Toggle visibility (eye icon)
  - Remove button
- Active indicator lines appear on chart with a legend label in top-left 
  of chart pane (value at cursor shown on hover)

### Drawing Tools Toolbar
A vertical icon toolbar docked to the left edge of the chart.
Tools (with icons from Lucide or custom SVG):

**Lines & Channels:**
- Trend Line — click two points, extends to edges
- Ray — one-directional trend line
- Horizontal Line — single price level, full width
- Horizontal Ray
- Vertical Line — single time marker
- Parallel Channel — two parallel trend lines
- Regression Channel

**Fibonacci Tools:**
- Fibonacci Retracement — drag between swing high/low, auto-levels: 
  0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%
- Fibonacci Extension — project beyond the move
- Fibonacci Fan
- Fibonacci Arc
- Fibonacci Time Zones

**Geometric Shapes:**
- Rectangle (box) — highlight range zones
- Ellipse
- Triangle

**Annotations:**
- Text Label — click to place, inline edit
- Callout / Speech bubble
- Arrow (directional marker)
- Price Label — snaps to price, shows value

**Advanced:**
- Pitchfork (Andrews' Pitchfork)
- Schiff Pitchfork
- Gann Box
- Long/Short Position tool — entry price + stop loss + take profit visualiser,
  shows R:R ratio, P&L at each level, risk % of account

**Tool Behaviours:**
- Active tool highlighted in toolbar
- Pointer/Select tool to move and edit drawn objects
- All drawn objects listed in a "Drawings" panel (toggle visibility, lock, delete)
- Drawings saved per symbol per workspace in workspaceStore
- Right-click on any drawing → context menu: Edit, Duplicate, Lock, Delete
- Shift+click snaps to OHLC values

### Chart Toolbar (top of chart)
Left group: Symbol search | Interval selector (1m 5m 15m 30m 1h 4h 1D 1W 1M) |
             Chart type (Candlestick / Bar / Line / Area / Heikin Ashi / Renko)
Right group: Indicators button | Drawing tools toggle | Templates | 
             Screenshot | Fullscreen | Settings

### Chart Templates
Save current indicator + drawing setup as a named template.
Templates appear in a dropdown — apply to any chart instantly.
Include built-in templates:
- "Scalper" — EMA9, EMA21, VWAP, Volume
- "Swing Trader" — EMA50, EMA200, Bollinger Bands, RSI, MACD
- "Options Flow" — IV overlay (mock), Volume, OI levels
- "Clean" — price only, no indicators

---

## MODULE 2: MULTI-TAB MARKET WATCHER

### Concept
A tab system docked below the navbar (or integrated into it) that lets users 
maintain multiple independent "watch contexts" simultaneously. Each tab is 
a named watchlist/symbol focus that independently drives its own set of 
pinned widgets.
src/components/MarketTabBar.jsx
src/context/TabContext.jsx

### Tab Types
Each tab has a type that determines its behaviour:

- **Symbol Tab** — focused on a single ticker (e.g. "AAPL")
  - Displays: mini price, change %, market session indicator
  - Widgets pinned to this tab auto-load that symbol

- **Watchlist Tab** — a group of symbols (e.g. "Tech Stocks", "My Longs")
  - Compact row: list of 3–5 symbol chips with prices
  - Clicking a symbol in the watchlist sets it as activeSymbol within that tab

- **Market Tab** — an index or sector (e.g. "S&P 500", "Crypto", "Forex")
  - Header shows index price + breadth (advancing/declining)

- **Portfolio Tab** — shows your holdings (links to Portfolio Page)

- **Strategy Tab** — a named saved strategy being monitored

### Tab Bar UI
- Tabs styled like browser tabs, dark background, accent border on active
- Each tab: icon (type indicator) + name + mini data + close (×)
- "+" button to add new tab with a type/name picker modal
- Tabs draggable to reorder
- Right-click tab → Rename, Duplicate, Pin (prevent close), Close
- Tab state (active symbol, scroll position, layout) persisted per workspace
- Max visible tabs before horizontal scroll or overflow menu

### Tab Isolation vs Global Sync
- Setting per-tab: "Isolated" mode — the tab's activeSymbol does NOT 
  update the global TerminalContext (useful for watching a position 
  while trading something else)
- "Synced" mode — tab activeSymbol broadcasts to global context
- Toggle shown as a small chain-link icon on the tab

---

## MODULE 3: AI-POWERED NEWS & RESEARCH PAGE
src/pages/NewsPage.jsx
src/components/AISummaryPanel.jsx
src/store/newsSourceStore.js

### Page Layout
Full-page layout split into:
- Top: AI Summary Banner (20% height)
- Left: Source Manager sidebar (240px, collapsible)
- Centre: News Feed (main content area)
- Right: Article Reader panel (400px, slides in when article selected)

### AI Summary Banner
Positioned at the top of the page — always visible.

Displays a rolling AI-generated summary of:
- Top market-moving headlines from the last 2 hours
- Macro sentiment (Bullish / Neutral / Bearish) with a confidence indicator
- Key themes detected: e.g. ["Fed Policy", "Earnings Season", "Tech Selloff"]
- Symbol mentions extracted from headlines — clickable chips that set activeSymbol
- "Last updated" timestamp + manual refresh button

Mock the AI summary with realistic pre-written content that rotates on refresh.
In production this would call the Anthropic API with recent headlines as context.

Design: distinct visual treatment — gradient-bordered card, slightly larger text,
sentiment colour-coded left border (green/amber/red), animated pulse on refresh.

**AI Summary Config (gear icon on banner):**
- Tone: "Concise" | "Detailed" | "Analyst Style"
- Focus: "All Markets" | "My Watchlist Only" | "My Portfolio Only"
- Update frequency: "On refresh only" | "Every 15min" | "Every hour"
- Include/exclude source categories

### News Source Manager (Left Sidebar)
Users subscribe to sources that are polled at market open (09:30 EST) 
and/or on a custom schedule.

**Built-in Source Categories (mock, pre-populated):**
- 📰 Financial News: Reuters, Bloomberg, WSJ, FT, CNBC, MarketWatch, Barron's
- 📊 Macro/Economics: Fed Reserve, ECB, BLS (CPI/Jobs), IMF
- 🔬 Research/Journals: Seeking Alpha, Zacks, Morningstar
- 🐦 Social/Alt Data: StockTwits, WallStreetBets sentiment (mock)
- 📅 Earnings: SEC EDGAR filings, Earnings Whispers
- 🌐 Custom RSS: user-added URLs

**Source Manager UI:**
- Expandable category groups
- Each source: logo/favicon + name + toggle (subscribed/unsubscribed)
- Subscribed sources show: last fetch time, article count today, fetch schedule
- "Add Custom Source" button: input field for RSS URL or website URL,
  name field, fetch schedule picker (Market Open | Hourly | Daily | Manual)
- Per-source: right-click → Edit schedule, Test fetch, Remove
- Fetch status indicator: green (ok) / amber (slow) / red (failed)

**Search Bar (top of sidebar):**
Filter sources by name. Also triggers a "Search Web for News" mode 
that shows a mock search result feed in the centre panel.

### News Feed (Centre)
- Chronological list of articles from subscribed sources
- Each article card:
  - Source logo + source name
  - Headline (bold)
  - 1-2 line snippet
  - Timestamp (relative: "12 min ago")
  - Ticker tags — symbols mentioned, clickable
  - Sentiment badge: 🟢 Bullish / 🔴 Bearish / ⚪ Neutral (AI-tagged, mocked)
  - Bookmark icon
  - Share icon

- Filter bar above feed:
  - All | Bookmarked | By Source (dropdown) | By Symbol (type-ahead)
  - Sort: Newest | Most Relevant | By Source
  - Time range: Last Hour | Today | This Week

- Unread count badge per source in sidebar updates as user scrolls past articles

### Article Reader Panel (Right)
Slides in when an article is clicked.
- Full headline + source + timestamp
- Full article body (mock lorem-ipsum styled as financial news)
- "AI Analysis" accordion section:
  - 3-bullet point summary
  - Sentiment: Bullish/Bearish/Neutral with reasoning
  - Symbols impacted: list of tickers with expected direction
  - Related articles links
- Action bar: Open original, Add to research, Copy link, Close

### Scheduled Fetch System (mock)
src/services/newsFetcher.js
- On app load, checks if it's market open time (mock: always "fetched today")
- Stores fetched articles in localStorage with source + timestamp
- Shows a "Morning Briefing Ready" notification in the alerts system on load
- Manual "Fetch Now" button per source in the sidebar

---

## MODULE 4: PORTFOLIO PAGE
src/pages/PortfolioPage.jsx

### Page Layout
Full-page dashboard split into:
- Top summary bar: total portfolio value, day P&L, total P&L, cash, buying power
- Main area: tabbed sections (Overview | Holdings | Performance | Risk | Transactions)

### Overview Tab
**Allocation Breakdown (left — 40%):**
Investment categories rendered as an interactive donut/treemap chart:
- Asset Class: Equities, Options, ETFs, Crypto, Fixed Income, Cash
- Each slice shows: label, % allocation, total value
- Click a slice to filter the holdings table below

**Key Metrics (right — 60%):**
Cards showing:
- Total Invested vs Current Value vs Unrealised P&L
- Day Change ($ and %)
- Beta (portfolio-weighted)
- Sharpe Ratio (mock)
- Max Drawdown (mock)
- Win Rate (closed positions)
- Average Hold Time

### Holdings Tab
Table of all open positions, grouped by category with collapsible groups:

**Groups:**
- 📈 Equities (Stocks)
  - Sub-groups: Long | Short
- 🔵 ETFs
  - Sub-groups: Broad Market | Sector | Thematic | Leveraged
- 🟣 Options
  - Sub-groups: Long Calls | Long Puts | Spreads | Covered Calls | Cash-Secured Puts
- 🟡 Crypto
  - Sub-groups: Large Cap | Mid Cap | DeFi
- 🟢 Fixed Income
  - Sub-groups: Government | Corporate | Muni
- 💵 Cash & Equivalents
  - Sub-groups: USD | Foreign Currency | Money Market

**Per-position columns:**
Symbol | Name | Category | Quantity | Avg Cost | Current Price | 
Market Value | Day P&L ($) | Day P&L (%) | Total P&L ($) | Total P&L (%) | 
Weight (%) | Beta | Actions (Trade | Chart | Alert)

**Row interactions:**
- Click symbol → sets global activeSymbol
- Click "Chart" → opens chart widget for that symbol
- Click "Trade" → opens order entry for that symbol
- Row colour coding: green tint (profitable) / red tint (loss) — subtle
- Expandable rows for options: shows leg details (strike, expiry, delta, theta, IV)

**Table Controls:**
- Sort by any column
- Filter by category, P&L (profitable only / losers only), asset class
- Group toggle: flat list vs grouped
- Column picker (show/hide columns)
- Export to CSV button

### Performance Tab
Charts showing portfolio performance over time:

- **Equity Curve** — portfolio value over time vs benchmark (SPY)
  - Time range selector: 1D | 1W | 1M | 3M | YTD | 1Y | All
- **Daily P&L Bar Chart** — green/red bars per day
- **Top Winners & Losers** — horizontal bar chart, top 5 each
- **Sector Exposure** — bar chart of allocation by GICS sector
- **Calendar Heatmap** — daily P&L as a GitHub-style contribution grid

### Risk Tab
- **Position Sizing Table** — each holding's % of portfolio, risk per share, 
  suggested max size based on 1% / 2% account risk rules
- **Correlation Matrix** — heatmap of pairwise correlations between top 10 holdings
- **Greeks Summary** (options) — portfolio-level Delta, Theta, Vega, Gamma
- **Drawdown Chart** — rolling drawdown from peak
- **Concentration Alerts** — warnings if any single position >10% of portfolio

### Transactions Tab
- Paginated table of all historical trades
- Columns: Date | Symbol | Action | Qty | Price | Commission | P&L | 
  Hold Time | Strategy Tag
- Filter: date range picker, symbol search, action type, strategy tag
- Summary stats at bottom: total commissions, total realised P&L, 
  average P&L per trade
- Strategy tagging: each closed trade can be tagged (e.g. "Earnings Play", 
  "Breakout", "Mean Reversion") — used to build performance-by-strategy stats

---

## MODULE 5: WATCHLIST & SCREENER PAGE
src/pages/WatchlistPage.jsx
src/widgets/ScannerWidget.jsx (enhanced)

### Watchlist Manager
- Multiple named watchlists (user-created)
- Each list: symbol | name | price | change% | volume | 52W range bar | 
  sparkline (7-day) | market cap | sector
- Add symbol: type-ahead search
- Drag to reorder
- Group watchlists into folders
- Auto-watchlists: "My Positions", "Recently Viewed", "Earnings This Week"
- Watchlist sync: changes reflected in MarketTabBar watchlist tabs

### Advanced Scanner / Screener
Full-page scanner with filter builder:

**Filter categories:**
- Fundamental: Market Cap, P/E, EPS Growth, Revenue Growth, Dividend Yield, 
  Debt/Equity, Free Cash Flow
- Technical: Price vs SMA (50/200), RSI range, MACD cross, 
  New 52W High/Low, Above/Below VWAP, Volume spike (>2x avg)
- Options: IV Rank, Put/Call ratio, Unusual options activity (mock)
- Price Action: Gap Up/Down today, Inside bar, Breakout from range

**Filter UI:**
- "Add Filter" button → category picker → metric → condition → value
- Filters shown as removable chips
- Save filter sets as named "Scans"
- Pre-built scans: "Momentum Breakouts", "Oversold RSI<30", 
  "Earnings Gappers", "High IV Rank Options"

**Results table:** sortable, clickable to set activeSymbol, 
max 200 results, pagination

---

## MODULE 6: ORDER MANAGEMENT & EXECUTION HUB
src/pages/OrdersPage.jsx
src/widgets/OrderEntryWidget.jsx (enhanced)

### Enhanced Order Entry Widget
Order types:
- Market | Limit | Stop | Stop-Limit | Trailing Stop | 
  MOO (Market on Open) | MOC (Market on Close) | 
  Bracket Order (entry + stop + target in one)

Advanced features:
- Position size calculator: input risk % or dollar risk → auto-calculates shares
- Quick-size buttons: 25% / 50% / 75% / 100% of available buying power
- One-click order confirmation toggle (for scalpers)
- Order preview: shows estimated commission, margin requirement, 
  buying power effect before submit
- Algo order types (mock): TWAP, VWAP, Iceberg (hidden qty)
- Options order entry: single leg + multi-leg (spread builder: 
  vertical, condor, straddle, strangle)

### Orders Page
Tabs: Open Orders | Pending | Filled Today | Order History

Each tab: sortable table with all relevant columns.
Actions: Cancel (open orders), Modify (open orders), 
Duplicate (filled orders → re-submit), Export

**Order Staging / Pre-Market Setup:**
- Users can build and stage orders before market open
- Staged orders listed in a "Pre-Market Queue" with an "Arm" toggle
- Armed orders submit automatically at market open (mock behaviour)

---

## MODULE 7: ALERTS & NOTIFICATIONS SYSTEM
src/pages/AlertsPage.jsx
src/services/alertEngine.js

### Alert Types
- Price Alert: symbol crosses above/below a price level
- % Move Alert: symbol moves more than X% in a session
- Indicator Alert: RSI crosses 30/70, MACD crossover, price crosses MA
- Volume Alert: volume exceeds X× average
- News Alert: keyword mentioned in news feed for a symbol
- Portfolio Alert: position P&L exceeds threshold (profit target or stop)
- Economic Event: calendar event reminder (X minutes before)
- Options Alert: IV spike, unusual activity (mock)

### Alert Builder UI
Form: Select type → symbol → condition → value → 
notification method (In-app | Sound | Browser notification) → 
expiry (One-time | Recurring | Until cancelled)

### Alert Dashboard
Table of all active and triggered alerts.
Status: Active (green) | Triggered (amber) | Expired (grey) | Disabled
Actions: Edit | Duplicate | Disable | Delete

### Notification Toast System
src/components/ToastNotification.jsx
- Top-right toast stack, max 4 visible, auto-dismiss (5s)
- Types: Info (blue) | Success (green) | Warning (amber) | Alert (red)
- Persistent alerts (price hit) stay until dismissed
- Sound option: mock audio alert on trigger
- All notifications logged to a notification history panel 
  (accessible from navbar bell icon)

---

## MODULE 8: ECONOMIC CALENDAR & EVENTS
src/pages/CalendarPage.jsx
src/widgets/EconomicCalendarWidget.jsx

### Calendar Views
- Week view (default): grid of trading days, events listed per day
- List view: chronological feed of upcoming events

### Event Data (all mocked, realistic)
Each event: Date | Time (EST) | Country flag | Event name | 
Importance (🔴 High / 🟡 Medium / ⚪ Low) | 
Previous | Forecast | Actual (if released)

Event categories:
- Central Bank: Fed meetings, rate decisions, FOMC minutes, 
  ECB/BOJ/BOE decisions
- Inflation: CPI, PPI, PCE
- Employment: NFP, Initial Jobless Claims, ADP
- Growth: GDP, Retail Sales, Industrial Production
- Housing: Building Permits, Existing Home Sales
- Earnings: Company earnings with EPS estimate vs actual
- Dividends: Ex-dividend dates for held positions
- Options Expiry: monthly OPEX dates highlighted
- IPOs: upcoming IPOs

### Filters
Country | Importance | Category | Symbol (shows events for held tickers)

### Countdown Timers
High-importance events show a live countdown in the widget mini-view.
A banner warning appears in the trading terminal when a high-impact 
event is < 30 minutes away.

---

## MODULE 9: RESEARCH & NOTES
src/pages/ResearchPage.jsx
src/widgets/NotesWidget.jsx

### Research Page
Per-symbol research workspace:
- Header: symbol + name + sector + description (mock)
- Tabs: Fundamentals | Financials | Analyst Ratings | Options Data | Notes

**Fundamentals tab:**
Key stats in a clean grid: P/E, Forward P/E, PEG, EV/EBITDA, 
P/S, P/B, Market Cap, Float, Short Interest %, Beta, 
Dividend Yield, Payout Ratio, Next Earnings Date

**Financials tab:**
Toggle: Annual / Quarterly
Three statements: Income Statement | Balance Sheet | Cash Flow
Sparkline trend next to each key metric (Revenue, EPS, FCF, Debt)

**Analyst Ratings tab:**
- Consensus rating gauge (Strong Buy → Strong Sell)
- Price target range: low | average | high vs current price
- Recent rating changes table: Firm | Previous | New | Date | 
  Price Target

**Options Data tab:**
- IV Rank + IV Percentile gauge
- 30-day Historical Volatility vs IV
- Put/Call ratio
- Max pain price
- Open interest by strike (bar chart)

### Notes Widget
- Per-symbol or per-workspace rich text notes
- Markdown support (bold, lists, code blocks)
- Tag system: #setup #watchlist #earnings #risk
- Notes searchable across all symbols
- Pin important notes to show in chart pane as annotations

---

## MODULE 10: TERMINAL SETTINGS & HOTKEYS
src/pages/SettingsPage.jsx

### Settings Sections (tabbed)

**Appearance:**
- Theme: Dark | Light | Midnight | Solarized
- Font size: compact / normal / large
- Chart default candle colours (bull/bear)
- Accent colour picker

**Trading Defaults:**
- Default order type, default order size, 
  default stop loss %, default take profit %
- Confirmation dialogs: on/off per order type
- One-click trading mode toggle (with warning)

**Data & Feeds:**
- Mock data refresh interval
- News fetch schedule
- Calendar country filter defaults

**Hotkeys (fully configurable):**
Pre-set defaults shown, click to rebind:
B → Buy (open order entry, buy side)
S → Sell (open order entry, sell side)
F → Flatten (close all positions for active symbol — with confirm)
/ → Open symbol search
ESC → Close active panel/modal
1–9 → Switch workspace tab
Ctrl+S → Save layout
Ctrl+Z → Undo last drawing
Ctrl+D → Duplicate active chart
Space → Pause/resume streaming data

**Notifications:**
- Sound on alert: on/off + volume
- Browser notification permission
- Morning briefing: on/off + time

**Account & Security:**
- Display name, linked accounts, session timeout, 
  export all data (JSON), reset all settings

---

## GLOBAL TECHNICAL REQUIREMENTS

- Framework: React 18, functional components, hooks throughout
- State: TerminalContext (global) + local useState/useReducer per page
- Charts: lightweight-charts (TradingView library) for main chart;
  recharts for portfolio/performance charts
- Grid layout: react-grid-layout for workspace canvas
- Styling: Tailwind CSS utility classes only
- Icons: Lucide React
- All data: mocked with realistic values, updating via setInterval 
  where appropriate
- Persistence: localStorage via workspaceStore (all pages respect 
  the same store)
- Routing: React Router v6 — each page is a route
- All components: accept optional className prop
- Performance: React.memo on all widget components, 
  useMemo/useCallback for expensive computations
- Accessibility: keyboard navigable, ARIA labels on interactive elements

---

## DELIVERABLE FILE STRUCTURE
src/
├── context/
│   ├── TerminalContext.jsx
│   └── TabContext.jsx
├── store/
│   ├── workspaceStore.js
│   └── newsSourceStore.js
├── services/
│   ├── alertEngine.js
│   └── newsFetcher.js
├── widgets/
│   ├── registry.js
│   ├── ChartWidget.jsx          ← enhanced with indicators + drawing
│   ├── WatchlistWidget.jsx
│   ├── OrderEntryWidget.jsx     ← enhanced
│   ├── PositionsWidget.jsx
│   ├── OrdersWidget.jsx
│   ├── NewsFeedWidget.jsx
│   ├── AccountSummaryWidget.jsx
│   ├── AlertsWidget.jsx
│   ├── EconomicCalendarWidget.jsx
│   ├── NotesWidget.jsx
│   ├── ScannerWidget.jsx
│   └── MarketDepthWidget.jsx
├── components/
│   ├── WidgetConfigPanel.jsx
│   ├── WidgetPalette.jsx
│   ├── WorkspaceTabBar.jsx
│   ├── MarketTabBar.jsx
│   ├── EditModeBar.jsx
│   ├── LayoutThumbnail.jsx
│   ├── ToastNotification.jsx
│   ├── DrawingToolbar.jsx       ← new
│   ├── IndicatorPanel.jsx       ← new
│   └── AISummaryPanel.jsx       ← new
├── pages/
│   ├── WidgetPage.jsx
│   ├── NewsPage.jsx             ← new
│   ├── PortfolioPage.jsx        ← new
│   ├── WatchlistPage.jsx        ← new
│   ├── OrdersPage.jsx           ← new
│   ├── AlertsPage.jsx           ← new
│   ├── CalendarPage.jsx         ← new
│   ├── ResearchPage.jsx         ← new
│   ├── WorkspaceConfigPage.jsx
│   └── SettingsPage.jsx         ← new
└── hooks/
├── useTerminalSync.js
├── useDrawingTools.js       ← new
├── useIndicators.js         ← new
└── useAlertEngine.js        ← new

---

## COMPETITIVE DIFFERENTIATORS TO INCLUDE

Beyond parity with Bloomberg/IBKR, include these modern features:

1. **AI Morning Briefing** — on app load, show a modal with an AI-generated 
   summary of overnight news, pre-market movers, and today's key events

2. **Trade Journal** — auto-log every order with entry reasoning (user types 
   a note at order submission), outcome, screenshot of chart at entry. 
   Weekly P&L review auto-generated.

3. **Strategy Backtester (mock)** — apply an indicator setup to historical 
   data and show mock backtest results (win rate, avg R:R, drawdown)

4. **Heatmap Page** — S&P 500 sector heatmap (treemap), colour by 
   day change %, size by market cap, click to drill into sector

5. **Command Palette** — Cmd+K opens a Bloomberg-style universal search: 
   symbols, pages, functions, recent actions — keyboard navigable

6. **Layout Snapshots** — take a screenshot of the current workspace 
   and save it as a thumbnail in the workspace config page

7. **Multi-monitor mode** — "Pop out" any widget into a separate browser 
   window, stays synced via BroadcastChannel API

8. **Keyboard trading mode** — dedicated mode where number keys 1-5 
   correspond to preset order sizes, B/S to buy/sell, Enter to confirm

9. **Dark Pool & Options Flow ticker** — mock unusual activity feed 
   (large block trades, sweeps) as a scrolling ticker or alert feed

10. **Sentiment Dashboard** — aggregate mock sentiment from news + 
    social for symbols in watchlist; Fear & Greed index gauge widget