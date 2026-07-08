# Widget SDK — How to Add a Widget

The widget registry ([ui/src/widgets/registry.tsx](../ui/src/widgets/registry.tsx))
is the contract between a widget and the workspace shell. Everything the shell
knows about a widget comes from its registry entry; a widget never talks to the
grid, the palette, or the config panel directly.

## The contract

Each widget gets, for free, from the shell:

- **A frame** — title bar, drag/resize handles, edit-mode chrome (WidgetPage).
- **Code splitting** — the component loads as its own chunk on first mount
  (`React.lazy`), behind a Suspense fallback.
- **Crash isolation** — a per-widget error boundary. A widget that throws
  renders a retry panel in its own frame; the rest of the workspace is
  unaffected.
- **Config UI** — the config panel is generated from `configSchema`; the saved
  values arrive as the `config` prop.
- **Persistence** — position, size, and config are stored per workspace
  (workspaceStore, localStorage today).

Each widget must:

1. Live in `ui/src/widgets/<Name>Widget.tsx` and export a **named** component
   taking `WidgetComponentProps`.
2. Register itself in `WIDGET_REGISTRY` (see checklist below).
3. Consume live data **only** through the sanctioned hooks (below) and declare
   what it consumes in `dataDeps`.
4. Never assume it is the only instance — multiple copies of the same widget
   type can be on screen with different configs.

## Checklist

1. **Create the component**

   ```tsx
   // ui/src/widgets/MyWidget.tsx
   import { useTerminalSync } from '../hooks/useTerminalSync';
   import { useTicker } from '../services/marketData';
   import type { WidgetComponentProps } from './registry';

   export function MyWidget({ widgetId, workspaceId, config, className }: WidgetComponentProps) {
       const { symbol } = useTerminalSync({ pinSymbol: config.pinSymbol as string | undefined });
       const ticker = useTicker(symbol);
       return <div className={className}>{symbol}: {ticker?.price ?? '—'}</div>;
   }
   ```

2. **Add the widget type** to the `WidgetType` union in
   `ui/src/stores/workspaceStore.ts`.

3. **Register it** in `WIDGET_REGISTRY`:

   ```tsx
   const MyWidget = lazy(() => import('./MyWidget').then(m => ({ default: m.MyWidget })));

   MyWidget: {
       type: 'MyWidget', label: 'My Widget', icon: 'Sparkles',
       description: 'One-line description shown in the palette',
       defaultSize: { w: 4, h: 4 }, minSize: { w: 2, h: 2 }, maxSize: { w: 8, h: 8 },
       configSchema: [
           { key: 'pinSymbol', type: 'symbolSearch', label: 'Pin Symbol' },
       ],
       dataDeps: { market: ['ticker'], followsSymbol: true },
       component: MyWidget,
   },
   ```

That's it — the palette, config panel, error boundary, and code splitting pick
the widget up automatically.

## Data access (the sanctioned hooks)

Widgets must not open sockets or reach into the transport. Live data comes from
these hooks, which are per-symbol subscriptions batched to one render per
animation frame:

| Hook | Source | Notes |
|---|---|---|
| `useTicker(symbol)` | `services/marketData` | last trade/stats for one symbol |
| `useOrderBook(symbol)` | `services/marketData` | L2 book, ref-counted upstream subscription |
| `useKlines(symbol)` | `services/marketData` | 1m OHLCV bars |
| `useTickerList()` | `services/marketData` | all known tickers (watchlists) |
| `useConnection()` | `services/marketData` | connection + measured feed latency |
| `useOrdersStore` | `stores/ordersStore` | live blotter; `submitOrder()` to trade |
| `useAccountStore` | `stores/accountStore` | paper account: cash, positions, realized P&L |
| `useAlertStore` | `stores/alertStore` | terminal alerts |
| `useTerminalSync({ pinSymbol })` | `hooks/useTerminalSync` | global symbol/account/session/theme; handles pinning |

The user-algorithm runtime (Phase 4) will consume the same subscription API —
treat these hooks as the platform surface, not an implementation detail.

## `dataDeps` declaration

`dataDeps` declares what the widget consumes. It is descriptive today (palette
hints, docs, honest-data badges) and will drive stream preloading later. Set
`mock: true` while a widget renders static demo data so the UI can label it
honestly.

## Styling

Use the design tokens (CSS variables) from `ui/src/index.css` — e.g.
`var(--color-surface)`, `var(--color-text-muted)`, `var(--color-green)` — or
the `terminal-*` Tailwind utilities. Do not hardcode hex values; tokens are
what make the theme toggle work. Canvas-rendered charts (lightweight-charts)
are the one exception — they cannot resolve CSS variables.
