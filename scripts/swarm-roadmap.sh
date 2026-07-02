#!/usr/bin/env bash
# =============================================================================
# TradingTerminal — ROAD_MAP.md Swarm Execution Script
# Orchestrates implementation of all 10 modules using RuFlo/claude-flow swarm
# =============================================================================
# Usage:
#   bash scripts/swarm-roadmap.sh                  # full roadmap
#   bash scripts/swarm-roadmap.sh --phase 1        # infrastructure only
#   bash scripts/swarm-roadmap.sh --module 3       # single module
# =============================================================================

set -euo pipefail

RUFLO="npx @claude-flow/cli@latest"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_SRC="$PROJECT_ROOT/ui/src"

# Parse args
PHASE="all"
MODULE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --phase) PHASE="$2"; shift 2 ;;
    --module) MODULE="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "============================================================"
echo " TradingTerminal Swarm — ROAD_MAP.md Implementation"
echo " Project: $PROJECT_ROOT"
echo " Phase: $PHASE | Module: ${MODULE:-all}"
echo "============================================================"

# ---------------------------------------------------------------------------
# 0. Pre-flight checks
# ---------------------------------------------------------------------------
echo ""
echo "[0/3] Pre-flight checks..."

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node 18+." >&2; exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "ERROR: npx not found." >&2; exit 1
fi

echo "  ✓ Node $(node --version)"
echo "  ✓ Project root: $PROJECT_ROOT"
$RUFLO doctor --fix --quiet || true

# ---------------------------------------------------------------------------
# 1. Initialize swarm
# ---------------------------------------------------------------------------
echo ""
echo "[1/3] Initialising swarm..."

$RUFLO swarm init \
  --topology hierarchical \
  --max-agents 8 \
  --strategy specialized \
  --name "roadmap-swarm" \
  --memory hybrid \
  --hnsw-enabled \
  --neural-enabled

# Store key context in swarm memory so all agents share it
$RUFLO memory store \
  --key "project/root" \
  --value "$PROJECT_ROOT" \
  --namespace roadmap

$RUFLO memory store \
  --key "project/ui-src" \
  --value "$UI_SRC" \
  --namespace roadmap

$RUFLO memory store \
  --key "project/stack" \
  --value "React 19, TypeScript, Vite 7, Zustand 5, Socket.IO, Supabase, Lightweight Charts 5, React Grid Layout 2, Tailwind 4, Lucide React, Electron" \
  --namespace roadmap

$RUFLO memory store \
  --key "project/conventions" \
  --value "Functional components, hooks throughout, React.memo on all widgets, useMemo/useCallback for expensive ops, Tailwind utility classes only, no inline styles except grid math, typed interfaces for all public APIs, files under 500 lines, TDD London School mock-first" \
  --namespace roadmap

$RUFLO memory store \
  --key "project/integration-points" \
  --value "TerminalContext (activeSymbol, activeAccount, marketSession, alerts, theme), workspaceStore (layouts, widgets, localStorage key: trading-terminal-workspaces-v2), widget registry (widgets/registry.tsx), Socket.IO events (ticker:update, orderbook:snapshot, kline:history, kline:update), Supabase auth (profiles table: id, role)" \
  --namespace roadmap

echo "  ✓ Swarm initialised with shared memory context"

# ---------------------------------------------------------------------------
# 2. Spawn agents and assign tasks
# ---------------------------------------------------------------------------
echo ""
echo "[2/3] Spawning agents and creating task graph..."

# =============================================================================
# PHASE 1 — Shared Infrastructure (must complete before feature modules)
# Agents: coordinator (1), infra-architect (2)
# =============================================================================

if [[ "$PHASE" == "all" || "$PHASE" == "1" ]]; then
  echo ""
  echo "  -- PHASE 1: Shared Infrastructure --"

  # Agent 1: Coordinator — owns memory, routing, and dependency gates
  $RUFLO agent spawn \
    --type hierarchical-coordinator \
    --name "coord" \
    --role "queen" \
    --instructions "$(cat <<'INST'
You are the swarm coordinator for the TradingTerminal ROAD_MAP implementation.
Your responsibilities:
1. Gate phase-2 agents until phase-1 tasks are marked complete
2. Monitor progress via memory namespace 'roadmap'
3. Resolve conflicts when multiple agents edit shared files (registry.tsx, App.tsx, index.css)
4. Enforce file size limit (500 lines) — if an agent produces a file over limit, split it
5. On completion, run: cd ui && npm run build && npm run lint
6. Store build result in memory key 'build/result'
INST
)"

  # Agent 2: Infrastructure architect — creates shared services, hooks, and context extensions
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "infra" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement PHASE 1 shared infrastructure for TradingTerminal.
Working directory: ui/src

TASK A — Toast Notification System (ui/src/components/ToastNotification.tsx)
- Top-right toast stack, max 4 visible, auto-dismiss 5s
- Types: Info (blue) | Success (green) | Warning (amber) | Alert (red)
- Persistent alerts stay until dismissed
- Export: ToastProvider, useToast() hook
- Integrate ToastProvider into ui/src/App.tsx

TASK B — Alert Engine (ui/src/services/alertEngine.ts)
- Typed AlertRule: { id, type, symbol, condition, value, method, expiry, status }
- AlertTypes: 'price' | 'percent_move' | 'indicator' | 'volume' | 'news' | 'portfolio' | 'economic' | 'options'
- evaluateRules(tickers): fires matched rules → calls useToast()
- CRUD: addRule, removeRule, updateRule, toggleRule
- Persists rules to localStorage key 'trading-terminal-alerts'
- Export alertEngine singleton

TASK C — News Fetcher Service (ui/src/services/newsFetcher.ts)
- Mock article data (20+ realistic financial news articles)
- Source categories: Financial, Macro, Research, Social, Earnings, Custom
- fetchBySource(sourceId): returns Article[]
- Article type: { id, source, headline, snippet, body, timestamp, tickers, sentiment, bookmarked }
- Sentiment: 'bullish' | 'bearish' | 'neutral'
- Persists to localStorage key 'trading-terminal-news'
- On load: fires 'Morning Briefing Ready' via addAlert() if first load today

TASK D — Tab Context (ui/src/context/TabContext.tsx)
- TabType: 'symbol' | 'watchlist' | 'market' | 'portfolio' | 'strategy'
- Tab state: { id, type, name, symbol?, symbols?, isolated, scrollPosition }
- Provider: TabProvider wrapping children
- Hook: useTab() → { tabs, activeTab, setActiveTab, addTab, removeTab, updateTab, reorderTabs }
- Persist to localStorage key 'trading-terminal-tabs'
- Wrap TabProvider in App.tsx

TASK E — useDrawingTools hook (ui/src/hooks/useDrawingTools.ts)
- DrawingTool type: 'pointer' | 'trendline' | 'ray' | 'hline' | 'hray' | 'vline' | 'channel' | 'regression' | 'fib_retracement' | 'fib_extension' | 'fib_fan' | 'fib_arc' | 'fib_timezone' | 'rectangle' | 'ellipse' | 'triangle' | 'text' | 'callout' | 'arrow' | 'pricelabel' | 'pitchfork' | 'schiff' | 'gann' | 'position'
- DrawingObject: { id, tool, points, config, visible, locked, symbol, workspaceId }
- Hook returns: { activeTool, setActiveTool, drawings, addDrawing, updateDrawing, removeDrawing, clearDrawings, toggleVisibility, toggleLock }
- Persist drawings per symbol per workspace in workspaceStore under config.drawings

TASK F — useIndicators hook (ui/src/hooks/useIndicators.ts)
- IndicatorConfig: { id, type, params, color, lineStyle, visible }
- IndicatorTypes: all 20+ from utils/indicators.ts
- Hook: useIndicators(widgetId) → { indicators, addIndicator, removeIndicator, updateIndicator, toggleIndicator }
- Persist per widget in workspaceStore under config.indicators

Store completion: npx @claude-flow/cli@latest memory store --key "phase1/infra" --value "complete" --namespace roadmap
INST
)"

fi # end phase 1

# =============================================================================
# PHASE 2 — Feature Modules (parallel, 6 worker agents)
# Each agent handles 1-2 modules
# =============================================================================

if [[ "$PHASE" == "all" || "$PHASE" == "2" ]]; then
  echo ""
  echo "  -- PHASE 2: Feature Modules (parallel) --"

  # Wait gate: only proceed if phase 1 is done (when running standalone phase 2)
  if [[ "$PHASE" == "2" ]]; then
    echo "  Waiting for phase-1 memory gate..."
    until $RUFLO memory retrieve --key "phase1/infra" --namespace roadmap 2>/dev/null | grep -q "complete"; do
      sleep 10
    done
    echo "  Phase 1 confirmed complete."
  fi

  # -----------------------------------------------------------------
  # Agent 3 — MODULE 1: Enhanced Chart Engine
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "chart-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULE 1: Enhanced Chart Engine for TradingTerminal.

Files to modify/create:
- ui/src/widgets/ChartWidget.tsx (enhance existing)
- ui/src/components/DrawingToolbar.tsx (new, already stubbed)
- ui/src/components/IndicatorPanel.tsx (new, already stubbed)
- ui/src/components/market/CandleChart.tsx (enhance existing)

READ each existing file before editing.

DRAWING TOOLBAR (DrawingToolbar.tsx):
- Vertical icon toolbar docked left edge of chart
- Sections: Lines & Channels, Fibonacci Tools, Geometric Shapes, Annotations, Advanced
- Tools (all from DrawingTool type in useDrawingTools hook): trendline, ray, hline, hray, vline, channel, regression, fib_retracement, fib_extension, fib_fan, fib_arc, fib_timezone, rectangle, ellipse, triangle, text, callout, arrow, pricelabel, pitchfork, schiff, gann, position
- Active tool highlighted with cyan border
- Pointer/Select tool at top
- Props: { activeTool, onToolSelect }
- Use Lucide icons (Minus, ArrowRight, MinusSquare, etc.)

INDICATOR PANEL (IndicatorPanel.tsx):
- Modal opened by "Indicators" button in chart toolbar
- Left column: categorised list — Overlays | Oscillators | Volume | Volatility
- Search bar filters by indicator name
- Right column: Active Indicators list with per-indicator controls:
  - Color swatch (input type=color)
  - Line style selector: solid / dashed / dotted
  - Period / param numeric inputs
  - Eye icon (toggle visibility)
  - Trash icon (remove)
- Props: { isOpen, onClose, widgetId }
- Uses useIndicators(widgetId) hook

CHART TOOLBAR (inside ChartWidget.tsx):
Left group: Symbol search | Interval (1m 5m 15m 30m 1h 4h 1D 1W 1M) | Chart type (Candlestick/Bar/Line/Area/Heikin Ashi)
Right group: Indicators button (opens IndicatorPanel) | Drawing tools toggle (shows/hides DrawingToolbar) | Templates dropdown | Screenshot | Fullscreen

CHART TEMPLATES (stored in localStorage 'trading-terminal-chart-templates'):
- "Scalper": EMA9, EMA21, VWAP, Volume
- "Swing Trader": EMA50, EMA200, Bollinger Bands, RSI, MACD
- "Options Flow": Volume, OBV
- "Clean": no indicators
- Save current setup as new template

DRAWINGS PANEL (inside ChartWidget.tsx):
- Collapsible panel listing all drawings for current symbol
- Each row: tool name, eye icon (visibility), lock icon, trash icon
- Right-click on chart drawing → context menu: Edit | Duplicate | Lock | Delete
- Drawings saved via useDrawingTools hook (persisted to workspaceStore)

All indicator computations use existing ui/src/utils/indicators.ts pure functions.
Overlay indicators rendered as LineSeries on CandleChart.
Sub-pane indicators rendered in a separate pane (use lightweight-charts createSeries).

Store completion: npx @claude-flow/cli@latest memory store --key "phase2/module1" --value "complete" --namespace roadmap
INST
)"

  # -----------------------------------------------------------------
  # Agent 4 — MODULE 2: Multi-Tab Market Watcher
  #           MODULE 8: Economic Calendar & Events
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "tabs-calendar-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULE 2 and MODULE 8 for TradingTerminal.

READ all files before editing. Working directory: ui/src

=== MODULE 2: MULTI-TAB MARKET WATCHER ===

CREATE ui/src/components/MarketTabBar.tsx:
- Tab bar docked below TradingNavbar (add to AppShell.tsx between navbar and outlet)
- TabTypes: Symbol | Watchlist | Market | Portfolio | Strategy
- Each tab: icon (type indicator) + name + mini price/data + close (×)
- Active tab: cyan bottom border
- "+" button opens AddTabModal (type + name + optional symbol picker)
- Tabs draggable to reorder (use onDragStart/onDrop)
- Right-click tab → context menu: Rename | Duplicate | Pin | Isolated/Synced toggle | Close
- Chain-link icon on each tab: filled = synced (updates global activeSymbol), open = isolated
- Horizontal scroll with overflow menu (">>" button) when tabs exceed width
- Tab state from useTab() (TabContext — created in phase 1)
- Symbol tabs show: mini price + change% from marketStore.tickers
- Watchlist tabs show: 3-5 symbol chips from tab.symbols

Integrate: import MarketTabBar into ui/src/components/layout/AppShell.tsx, render below TradingNavbar.

=== MODULE 8: ECONOMIC CALENDAR ===

CREATE ui/src/pages/CalendarPage.tsx:
- Full-page layout
- Route: /calendar (add to App.tsx, add nav button to TradingNavbar)
- Week view (default) + List view toggle
- Filter bar: Country | Importance | Category | Symbol

CREATE ui/src/widgets/EconomicCalendarWidget.tsx (enhance existing stub):
- Compact widget version showing next 5 high-importance events
- Countdown timer on events < 30min away
- Click event → opens CalendarPage

MOCK EVENT DATA (realistic, 30+ events):
Include: Fed meetings, CPI, NFP, GDP, Earnings (AAPL, MSFT, NVDA, TSLA), OPEX dates, IPOs
Each event: { id, date, time, country, name, importance: 'high'|'medium'|'low', previous, forecast, actual?, category }

CALENDAR VIEWS:
- Week view: 5-column grid (Mon-Fri), events listed per day cell
  - Red dot = high importance, yellow = medium, grey = low
  - Past events show actual vs forecast (green if beat, red if miss)
- List view: chronological feed, grouped by date

COUNTDOWN / BANNER:
- High-importance events < 30min → show pulsing banner at top of WidgetPage
- Banner: "⚠ CPI Release in 14:32 — High Impact" with dismiss button
- Use TerminalContext.addAlert() to fire a terminal alert at T-30 and T-5

Store completions:
npx @claude-flow/cli@latest memory store --key "phase2/module2" --value "complete" --namespace roadmap
npx @claude-flow/cli@latest memory store --key "phase2/module8" --value "complete" --namespace roadmap
INST
)"

  # -----------------------------------------------------------------
  # Agent 5 — MODULE 3: AI News & Research Page
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "news-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULE 3: AI-Powered News & Research Page for TradingTerminal.

Working directory: ui/src
READ all existing files before editing.

CREATE ui/src/pages/NewsPage.tsx:
Route: /news (add to App.tsx, add "News" button to TradingNavbar)

LAYOUT (full page):
- Top: AISummaryBanner (20% height, always visible)
- Left: SourceManagerSidebar (240px, collapsible)
- Centre: NewsFeed (flex-grow)
- Right: ArticleReader (400px, slides in on article click, slides out on close)

CREATE ui/src/components/AISummaryPanel.tsx:
- Gradient-bordered card with colour-coded left border (green=bullish, amber=neutral, red=bearish)
- Rotating mock AI summaries (3+ pre-written, cycle on refresh button)
- Sentiment indicator: Bullish/Neutral/Bearish + confidence bar
- Key themes as chips: ["Fed Policy", "Earnings Season", "Tech Selloff", etc.]
- Symbol mentions as clickable chips → call setSymbol() from TerminalContext
- "Last updated" timestamp + manual refresh button with pulse animation
- Config gear icon opens AISummaryConfig popover:
  - Tone: Concise | Detailed | Analyst Style
  - Focus: All Markets | My Watchlist | My Portfolio
  - Update frequency: On refresh | Every 15min | Every hour

SOURCE MANAGER SIDEBAR:
- Expandable category groups: Financial News | Macro/Economics | Research | Social/Alt Data | Earnings | Custom RSS
- Each source: checkbox toggle (subscribed/unsubscribed) + name + last fetch time
- Subscribed sources: show article count badge + fetch schedule tag
- "Add Custom Source" button: RSS URL input + name + schedule picker
- Right-click source: Edit schedule | Test fetch (mock) | Remove
- Status dot: green (ok) / amber (slow) / red (failed) — mock values
- Search bar at top of sidebar filters sources by name

NEWS FEED (centre):
Article card layout:
- Source logo placeholder (coloured initials badge) + source name + timestamp (relative)
- Headline (bold, 1 line)
- Snippet (2 lines, truncated)
- Ticker tag chips (clickable → setSymbol)
- Sentiment badge: 🟢 Bullish / 🔴 Bearish / ⚪ Neutral
- Bookmark icon (fills on click, stored in article.bookmarked)
Filter bar above feed: All | Bookmarked | By Source | By Symbol | Sort | Time range

ARTICLE READER (right panel):
- Slide-in panel (CSS transform translateX)
- Full headline + source + timestamp
- Full mock article body (3-4 paragraphs of realistic financial prose)
- "AI Analysis" accordion:
  - 3-bullet summary
  - Sentiment + reasoning
  - Symbols impacted with direction arrows
  - Related article links
- Action bar: Open original | Add to research | Copy link | Close (×)

Uses newsFetcher service (created in phase 1) for all article data.

Store completion:
npx @claude-flow/cli@latest memory store --key "phase2/module3" --value "complete" --namespace roadmap
INST
)"

  # -----------------------------------------------------------------
  # Agent 6 — MODULE 4: Portfolio Page
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "portfolio-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULE 4: Portfolio Page for TradingTerminal.

Working directory: ui/src
READ all existing files before editing.

CREATE ui/src/pages/PortfolioPage.tsx:
Route: /portfolio (add to App.tsx, add "Portfolio" button to TradingNavbar)

MOCK DATA (generate realistic mock portfolio):
10-15 positions across asset classes: stocks (AAPL, MSFT, NVDA, GOOGL, AMZN), ETFs (SPY, QQQ), crypto (BTC/USD, ETH/USD), 1 options position
Each position: { symbol, name, category, quantity, avgCost, currentPrice, beta, sector }

TOP SUMMARY BAR (always visible):
Cards: Total Portfolio Value | Day P&L ($ and %) | Total P&L ($ and %) | Cash | Buying Power
Green/red colour coding, large font, real-time feel (mock values update every 5s)

TABS: Overview | Holdings | Performance | Risk | Transactions
Use a styled tab bar — active tab has cyan underline

OVERVIEW TAB:
- Left 40%: Donut chart (use recharts PieChart) — allocation by asset class
  - Click slice → filters holdings table
  - Legend below with % and $ values
- Right 60%: Metric cards grid (2×4):
  Invested | Current Value | Unrealised P&L | Day Change
  Beta | Sharpe (mock 1.8) | Max Drawdown (mock -12%) | Win Rate (mock 67%)

HOLDINGS TAB:
- Grouped table (collapsible groups): Equities | ETFs | Options | Crypto | Fixed Income | Cash
- Sub-groups: Long/Short for equities, Long Calls/Puts/Spreads for options, etc.
- Columns: Symbol | Name | Qty | Avg Cost | Current Price | Market Value | Day P&L$ | Day P&L% | Total P&L$ | Total P&L% | Weight% | Beta | Actions
- Row colour: subtle green tint (profitable) / red tint (loss)
- Options rows expandable: show delta, theta, gamma, IV, expiry
- Click symbol → setSymbol(). Click "Chart" → navigate to / with symbol pinned. Click "Trade" → open order widget
- Sort by any column, filter bar (category, P&L direction), column picker, Export CSV button

PERFORMANCE TAB:
- Equity Curve (recharts LineChart) vs SPY benchmark — time range: 1D|1W|1M|3M|YTD|1Y|All
- Daily P&L Bar Chart (recharts BarChart, green/red)
- Top 5 Winners & Losers (recharts HorizontalBarChart)
- Sector Exposure bar chart
- Calendar Heatmap (mock GitHub-style grid — build with CSS grid, color by daily P&L)

RISK TAB:
- Position Sizing Table: each position → % of portfolio, max shares at 1%/2% account risk
- Correlation Matrix: 6×6 heatmap of top 6 holdings (CSS grid with bg colour scale)
- Portfolio Greeks: Delta | Theta | Vega | Gamma (mock values, show for options positions)
- Drawdown Chart (recharts AreaChart — negative fill, red)
- Concentration Alerts: amber warning cards for any position >10% of portfolio

TRANSACTIONS TAB:
- Paginated table (20 rows/page) of 50+ mock historical trades
- Columns: Date | Symbol | Action | Qty | Price | Commission | P&L | Hold Time | Strategy Tag
- Filter: date range picker, symbol search, action (Buy/Sell/Expire), strategy tag dropdown
- Bottom stats row: Total commissions | Total realised P&L | Avg P&L per trade
- Strategy tags: Earnings Play | Breakout | Mean Reversion | Swing | Scalp | Hedge

Store completion:
npx @claude-flow/cli@latest memory store --key "phase2/module4" --value "complete" --namespace roadmap
INST
)"

  # -----------------------------------------------------------------
  # Agent 7 — MODULE 5: Watchlist & Screener
  #           MODULE 9: Research & Notes
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "watchlist-research-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULE 5 and MODULE 9 for TradingTerminal.

Working directory: ui/src
READ all existing files before editing.

=== MODULE 5: WATCHLIST & SCREENER PAGE ===

CREATE ui/src/pages/WatchlistPage.tsx:
Route: /watchlist (add to App.tsx, add nav button to TradingNavbar)
Split layout: Left — Watchlist Manager (300px) | Right — Advanced Scanner

WATCHLIST MANAGER (left panel):
- Multiple named watchlists (stored in workspaceStore or separate localStorage key 'trading-terminal-watchlists')
- Each list has rows: Symbol | Price | Change% | Volume | 52W range bar | Sparkline | Market Cap | Sector
- Sparkline: 7 mock data points rendered as a 60×20px SVG path
- Add symbol: type-ahead search input
- Drag rows to reorder (data-draggable)
- Folder grouping: create folders that contain multiple watchlists
- Auto-lists (read-only): "My Positions" (from portfolio mock data), "Recently Viewed" (last 10 via TerminalContext), "Earnings This Week" (from calendar mock data)
- Click symbol → setSymbol(). Right-click → Add Alert | Chart | Remove from list

ADVANCED SCANNER (right panel):
- Filter builder: "Add Filter" button → Select category → Select metric → Select condition → Enter value
- Categories + metrics:
  Fundamental: Market Cap, P/E, EPS Growth, Dividend Yield, Debt/Equity
  Technical: RSI range, MACD cross (above/below), Price vs SMA50, Price vs SMA200, Volume spike (>2x avg), 52W High/Low
  Options: IV Rank (mock), Put/Call ratio (mock)
  Price Action: Gap Up/Down today, Inside Bar (mock)
- Filters render as removable chips above results
- Save filter sets as named "Scans" → stored in localStorage 'trading-terminal-scans'
- Pre-built scans: "Momentum Breakouts" | "Oversold RSI<30" | "Earnings Gappers" | "High IV Rank"
- Results table: 20 mock results, sortable, click to setSymbol(), pagination

=== MODULE 9: RESEARCH & NOTES ===

CREATE ui/src/pages/ResearchPage.tsx:
Route: /research (add to App.tsx, add nav button to TradingNavbar)
Driven by TerminalContext.activeSymbol

Header: Symbol badge + company name + sector + 1-line description (mock per symbol)

TABS: Fundamentals | Financials | Analyst Ratings | Options Data | Notes

FUNDAMENTALS TAB:
Metric grid (3 columns): P/E | Forward P/E | PEG | EV/EBITDA | P/S | P/B | Market Cap | Float | Short Interest% | Beta | Dividend Yield | Payout Ratio | Next Earnings Date
Mock values per symbol (at minimum: AAPL, MSFT, NVDA, TSLA, GOOGL, BTC/USD, ETH/USD)

FINANCIALS TAB:
Annual/Quarterly toggle (SegmentedControl)
Three sub-tabs: Income Statement | Balance Sheet | Cash Flow
Each row: metric name + 4 columns of historical values + sparkline trend
Key metrics: Revenue, Gross Profit, Net Income, EPS, Total Assets, Total Debt, Free Cash Flow

ANALYST RATINGS TAB:
- Consensus gauge (horizontal bar: Strong Sell → Strong Buy, needle at consensus position)
- Price target range bar: Low ($) | Average ($) | High ($) vs current price marker
- Recent changes table: Firm | Previous | New | Date | Target — 5-8 mock rows per symbol

OPTIONS DATA TAB:
- IV Rank gauge (0-100, colour: green<25, amber 25-75, red>75) + IV Percentile
- 30-day HV vs IV comparison bar
- Put/Call ratio + Max pain price (mock)
- Open interest by strike chart (recharts BarChart, 7 strikes, blue=calls, red=puts)

NOTES TAB (also powers NotesWidget):
- Textarea with markdown preview toggle
- Tag chips: type #tag and press Enter to add
- Tags: #setup #watchlist #earnings #risk #idea #review
- Notes saved to localStorage 'trading-terminal-notes' keyed by symbol
- Notes list below editor: newest first, click to load
- Search all notes (across symbols) via search input at top
- "Pin to chart" toggle — sets a flag that ChartWidget reads and displays note as annotation

ENHANCE ui/src/widgets/NotesWidget.tsx:
- Show notes for current symbol (from TerminalContext.activeSymbol)
- Mini editor inside widget using the same Notes store

Store completions:
npx @claude-flow/cli@latest memory store --key "phase2/module5" --value "complete" --namespace roadmap
npx @claude-flow/cli@latest memory store --key "phase2/module9" --value "complete" --namespace roadmap
INST
)"

  # -----------------------------------------------------------------
  # Agent 8 — MODULE 6: Order Management
  #           MODULE 7: Alerts & Notifications
  #           MODULE 10: Settings & Hotkeys
  # -----------------------------------------------------------------
  $RUFLO agent spawn \
    --type sparc-coder \
    --name "orders-alerts-settings-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement MODULES 6, 7, and 10 for TradingTerminal.

Working directory: ui/src
READ all existing files before editing.

=== MODULE 6: ORDER MANAGEMENT & EXECUTION ===

ENHANCE ui/src/widgets/OrderEntryWidget.tsx:
Order types selector tabs: Market | Limit | Stop | Stop-Limit | Trailing Stop | MOO | MOC | Bracket
- Bracket: shows 3 price inputs (Entry | Stop | Target) + R:R display
- Trailing Stop: shows trailing amount or %

Position Size Calculator (collapsible panel below size input):
- Input: Account Risk % (default 1%) OR Dollar Risk
- Auto-calculates shares: shares = dollarRisk / (entryPrice - stopPrice)
- Shows: calculated shares, total cost, margin required (mock 50% margin)

Quick-size buttons: 25% | 50% | 75% | 100% of buying power

One-click trading toggle (stored in settings store):
- When ON: no confirmation dialog, immediate submit
- When OFF: shows order preview modal before submit

Order Preview Modal:
- Shows: Order type | Symbol | Qty | Price | Est. Commission ($0.005/share, $1 min) | Buying Power Effect | Margin Requirement
- "Submit Order" button (green) | "Cancel" button

Algo Orders (mock, disabled with "Pro" badge in free tier):
- TWAP: auto-slice order over time period (duration input)
- VWAP: auto-slice following volume curve
- Iceberg: show X shares, total hidden qty

Options Order Entry (separate tab in widget):
- Single leg: underlying | expiry (dropdown) | strike (dropdown) | type (Call/Put) | qty | action (Buy/Sell)
- Multi-leg spread builder: add legs + button, select strategy: Vertical | Condor | Straddle | Strangle

CREATE ui/src/pages/OrdersPage.tsx:
Route: /orders (add to App.tsx, add nav button)
Tabs: Open Orders | Pending | Filled Today | Order History
Mock data: 5-8 open orders, 20+ history records
Columns per tab: relevant order fields
Actions: Cancel (open) | Modify (open) | Duplicate → re-submit (filled) | Export CSV

Pre-Market Queue section at bottom:
- List of staged orders with "Arm" toggle
- Armed orders show green "Armed — will submit at open" badge
- Disarm/Remove buttons

=== MODULE 7: ALERTS & NOTIFICATIONS ===

CREATE ui/src/pages/AlertsPage.tsx:
Route: /alerts (add to App.tsx, add bell icon nav button)

ALERT BUILDER (top section):
Multi-step form:
1. Alert Type: Price | % Move | Indicator | Volume | News | Portfolio | Economic | Options
2. Symbol search (or "Portfolio-wide" for portfolio alerts)
3. Condition (depends on type — e.g. "crosses above", "drops below", "RSI crosses 30")
4. Value input
5. Notification: In-app | Sound | Browser notification (checkbox group)
6. Expiry: One-time | Recurring | Until cancelled
Submit → calls alertEngine.addRule()

ALERT DASHBOARD:
Table of all rules from alertEngine.
Status chips: Active (green) | Triggered (amber) | Expired (grey) | Disabled
Actions: Edit (opens builder pre-filled) | Duplicate | Disable/Enable toggle | Delete
Filter: by status, by type, by symbol

TOAST SYSTEM (integrate ToastNotification component from phase 1):
- Mount ToastContainer in App.tsx
- Alert engine calls addToast() when rules fire
- Mock: simulate a price alert firing 30s after app load (AAPL crosses $195)

=== MODULE 10: TERMINAL SETTINGS & HOTKEYS ===

CREATE ui/src/pages/SettingsPage.tsx:
Route: /settings (add to App.tsx, add gear icon nav button)

CREATE ui/src/stores/settingsStore.ts (Zustand):
Persists to localStorage key 'trading-terminal-settings'
Shape:
{
  appearance: { theme: 'dark'|'light'|'midnight'|'solarized', fontSize: 'compact'|'normal'|'large', bullColor: string, bearColor: string, accentColor: string }
  trading: { defaultOrderType: string, defaultSize: number, defaultStopPct: number, defaultTakePct: number, confirmations: Record<string, boolean>, oneClickMode: boolean }
  data: { refreshIntervalMs: number, newsFetchSchedule: string, calendarCountries: string[] }
  hotkeys: Record<string, string>
  notifications: { soundEnabled: boolean, browserNotifications: boolean, morningBriefing: boolean, morningBriefingTime: string }
  account: { displayName: string, sessionTimeoutMins: number }
}

SETTINGS PAGE TABS:

Appearance tab:
- Theme picker: 4 swatches (Dark/Light/Midnight/Solarized)
- Font size: 3-option segmented control
- Bull/Bear candle colour pickers (input type=color)
- Accent colour picker

Trading Defaults tab:
- Default order type dropdown
- Default size input
- Stop loss % / Take profit % inputs
- Confirmation dialogs: toggle per order type
- One-click mode: big toggle with red warning text

Data & Feeds tab:
- Mock refresh interval slider (500ms - 5000ms)
- News fetch schedule selector
- Calendar countries: multi-select checkboxes (US, EU, UK, JP, CN)

Hotkeys tab:
- Table of all hotkeys: Action | Current Binding | Edit button
- Click Edit → input field captures next keypress
- Reset to Defaults button
- Default bindings:
  B=Buy, S=Sell, F=Flatten, /=Symbol Search, ESC=Close panel
  1-9=Workspace tabs, Ctrl+S=Save, Ctrl+Z=Undo drawing, Ctrl+D=Duplicate chart
  Space=Pause/Resume streaming

Notifications tab:
- Sound on alert: toggle + volume slider
- Browser notification: toggle + "Request Permission" button
- Morning briefing: toggle + time picker

Account & Security tab:
- Display name input
- Session timeout: dropdown (15min | 30min | 1h | 4h | Never)
- Export All Data button (downloads JSON of all localStorage keys)
- Reset All Settings button (with confirmation dialog)

HOTKEY LISTENER (ui/src/hooks/useHotkeys.ts):
- Global keydown listener
- Reads bindings from settingsStore.hotkeys
- Dispatches actions (open order entry, set symbol, navigate)
- Mount in App.tsx

Store completions:
npx @claude-flow/cli@latest memory store --key "phase2/module6" --value "complete" --namespace roadmap
npx @claude-flow/cli@latest memory store --key "phase2/module7" --value "complete" --namespace roadmap
npx @claude-flow/cli@latest memory store --key "phase2/module10" --value "complete" --namespace roadmap
INST
)"

fi # end phase 2

# =============================================================================
# PHASE 3 — Competitive Differentiators
# Single agent handles all 10 differentiators (lighter weight)
# =============================================================================

if [[ "$PHASE" == "all" || "$PHASE" == "3" ]]; then
  echo ""
  echo "  -- PHASE 3: Competitive Differentiators --"

  $RUFLO agent spawn \
    --type sparc-coder \
    --name "differentiators-agent" \
    --role "worker" \
    --instructions "$(cat <<'INST'
Implement the 10 Competitive Differentiators for TradingTerminal.

Working directory: ui/src
READ all existing files before editing. Wait until memory key "phase2/module10" is "complete" before starting.

1. AI MORNING BRIEFING (ui/src/components/MorningBriefingModal.tsx):
- Modal shown on first app load of the day (check localStorage 'morning-briefing-date')
- Sections: Overnight Summary | Pre-Market Movers (5 stocks with % change) | Today's Key Events (3 calendar items)
- All mock data, rotated
- "Dismiss" and "Don't show again today" buttons
- Mount in App.tsx, trigger via useEffect on load

2. TRADE JOURNAL (ui/src/pages/TradeJournalPage.tsx):
Route: /journal
- At order submit in OrderEntryWidget: show "Add trade note?" textarea (optional, 2s timeout auto-dismiss)
- Journal entry: { id, date, symbol, action, qty, price, note, chartSnapshot: null, outcome: null, strategyTag }
- Journal page: table of entries + expandable detail view
- Weekly P&L summary card (recharts BarChart by week)
- "Weekly Review" mock AI-generated paragraph in each week group

3. STRATEGY BACKTESTER (ui/src/pages/BacktesterPage.tsx):
Route: /backtest
- Simple UI: select indicator setup (dropdown of saved chart templates) + symbol + date range
- "Run Backtest" button → 2s loading spinner → mock results:
  { winRate: 62%, totalTrades: 47, avgRR: 1.8, maxDrawdown: -8.4%, totalReturn: +34.2%, sharpe: 1.6 }
- Results display: metric cards + equity curve (recharts) + trade list (mock 10 rows)

4. HEATMAP PAGE (ui/src/pages/HeatmapPage.tsx):
Route: /heatmap
- S&P 500 sector heatmap (treemap layout using CSS grid or recharts Treemap)
- 11 GICS sectors with 5-8 mock stocks each
- Color by day change %: deep red (-3%+) → red → grey → green → deep green (+3%+)
- Size by market cap (mock values)
- Click sector → drill down showing individual stocks in that sector
- Back button to return to sector view
- Header: market breadth (advancing/declining/unchanged counts)

5. COMMAND PALETTE (ui/src/components/CommandPalette.tsx):
- Global Cmd+K (Mac) / Ctrl+K (Win) listener mounted in App.tsx
- Full-screen overlay with centred search input
- Result categories: Symbols (search mockMarket + watchlist) | Pages (navigate to) | Actions (setSymbol, open widget, etc.) | Recent (last 5 actions)
- Keyboard navigable (arrow keys + Enter)
- ESC to close
- Recent actions stored in localStorage 'command-palette-recents'

6. LAYOUT SNAPSHOTS (enhance ui/src/pages/WorkspaceConfigPage.tsx):
- "Capture Snapshot" button per workspace in WorkspaceConfigPage
- Uses html2canvas-like mock: generates a placeholder image (coloured rectangle with workspace name)
- Snapshot stored in workspaceStore under workspace.snapshot (base64 string)
- Thumbnail displayed on workspace card in config page

7. MULTI-MONITOR POP-OUT (enhance electron/main.js + ui):
- "Pop Out" button (⤢ icon) on each widget title bar
- Calls window.electronAPI.openWidget({ type, symbol }) IPC
- For web mode (no Electron): uses window.open() + BroadcastChannel API for sync
- BroadcastChannel: channel name 'terminal-sync', messages: { type: 'symbol-change'|'layout-update', payload }
- ui/src/hooks/useBroadcastSync.ts: listens to channel, applies updates

8. KEYBOARD TRADING MODE (ui/src/components/KeyboardTradingMode.tsx):
- Toggle button in TradingNavbar: "KB" badge, cyan when active
- When active: overlay indicator (pulsing cyan border on main canvas)
- Key bindings (active only in this mode):
  1-5 → preset order sizes (100, 250, 500, 1000, 2500 shares — configurable)
  B → open buy order for activeSymbol at market
  S → open sell order for activeSymbol at market
  Enter → confirm staged order
  ESC → cancel / exit mode
- Staged order shown in a bottom strip with symbol, action, size, price

9. DARK POOL & OPTIONS FLOW TICKER (ui/src/widgets/DarkPoolWidget.tsx + scrolling ticker):
- Add "DarkPool" to widget registry
- Widget shows: scrolling feed of mock unusual activity
  Format: "🔵 AAPL 50,000 @ $189.50 — Block Buy" | "🔴 TSLA 200 contracts 200C 4/19 — Sweep"
- New entries every 3-8s (setInterval with mock data pool of 30+ entries)
- Add scrolling ticker strip to bottom of TradingNavbar (like Bloomberg function line):
  Shows last 5 unusual activity items, scrolls left

10. SENTIMENT DASHBOARD (ui/src/widgets/SentimentWidget.tsx):
- Add "Sentiment" to widget registry
- Shows for activeSymbol:
  - Sentiment bar: % Bullish / Neutral / Bearish (mock, updates per symbol)
  - News sentiment over time (7-day mini area chart using recharts)
  - Social buzz score (mock 0-100 gauge using SVG arc)
  - Fear & Greed index gauge (0-100, labels: Extreme Fear | Fear | Neutral | Greed | Extreme Greed)
    Colour: red→amber→grey→light green→green
  - Mock values change per symbol: BTC high greed, defensive stocks neutral, beaten-down stocks fear

Store completion:
npx @claude-flow/cli@latest memory store --key "phase3/differentiators" --value "complete" --namespace roadmap
INST
)"

fi # end phase 3

# ---------------------------------------------------------------------------
# 3. Monitor and finalise
# ---------------------------------------------------------------------------
echo ""
echo "[3/3] Swarm running. Monitoring progress..."

$RUFLO progress watch --namespace roadmap --keys \
  "phase1/infra,phase2/module1,phase2/module2,phase2/module3,phase2/module4,phase2/module5,phase2/module6,phase2/module7,phase2/module8,phase2/module9,phase2/module10,phase3/differentiators,build/result" \
  --interval 30 \
  --until "build/result" \
  --timeout 7200 || true

echo ""
echo "============================================================"
echo " Swarm complete. Check agent outputs above."
echo " Run manually to verify:"
echo "   cd ui && npm run lint && npm run build"
echo "============================================================"
