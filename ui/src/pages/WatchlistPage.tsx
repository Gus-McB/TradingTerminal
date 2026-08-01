import { useState } from 'react';
import { useTerminal } from '../stores/terminalStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WatchSymbol {
  ticker: string;
  price: string;
  change: number;
  volume: string;
  weekLow: number;
  weekHigh: number;
  current: number;
}

interface Watchlist {
  id: string;
  name: string;
  count: number;
  type: 'auto' | 'manual';
  symbols: WatchSymbol[];
}

interface ScanResult {
  ticker: string;
  name: string;
  price: string;
  change: number;
  rsi: number;
  volume: string;
  marketCap: string;
  signal: string;
}

interface FilterChip {
  id: string;
  label: string;
  color: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TECH_GIANTS: WatchSymbol[] = [
  { ticker: 'AAPL', price: '$172.50', change: 0.82,  volume: '45.2M', weekLow: 124,  weekHigh: 199,  current: 172 },
  { ticker: 'TSLA', price: '$164.80', change: -2.12, volume: '89.4M', weekLow: 138,  weekHigh: 299,  current: 164 },
  { ticker: 'NVDA', price: '$879.40', change: 3.21,  volume: '31.7M', weekLow: 400,  weekHigh: 974,  current: 879 },
  { ticker: 'MSFT', price: '$413.20', change: 0.64,  volume: '22.1M', weekLow: 310,  weekHigh: 468,  current: 413 },
  { ticker: 'GOOG', price: '$178.10', change: 0.92,  volume: '18.5M', weekLow: 120,  weekHigh: 193,  current: 178 },
];

const WATCHLISTS: Watchlist[] = [
  { id: 'portfolio', name: 'My Portfolio',     count: 6, type: 'auto',   symbols: [] },
  { id: 'tech',      name: 'Tech Giants',      count: 5, type: 'manual', symbols: TECH_GIANTS },
  { id: 'hi-conv',   name: 'High Conviction',  count: 3, type: 'manual', symbols: [] },
  { id: 'crypto',    name: 'Crypto Watch',     count: 4, type: 'manual', symbols: [] },
];

const OVERSOLD_RESULTS: ScanResult[] = [
  { ticker: 'INTC', name: 'Intel Corp',       price: '$34.20',  change: -1.8, rsi: 27.4, volume: '42M',  marketCap: '$144B', signal: 'Oversold' },
  { ticker: 'F',    name: 'Ford Motor',       price: '$12.80',  change: -2.1, rsi: 25.8, volume: '78M',  marketCap: '$51B',  signal: 'Oversold' },
  { ticker: 'BAC',  name: 'Bank of America',  price: '$38.40',  change: -1.2, rsi: 28.9, volume: '65M',  marketCap: '$302B', signal: 'Oversold' },
  { ticker: 'XOM',  name: 'Exxon Mobil',      price: '$112.30', change: -0.9, rsi: 29.2, volume: '28M',  marketCap: '$448B', signal: 'Oversold' },
  { ticker: 'CVX',  name: 'Chevron',          price: '$156.70', change: -1.1, rsi: 28.1, volume: '15M',  marketCap: '$289B', signal: 'Oversold' },
  { ticker: 'PFE',  name: 'Pfizer',           price: '$27.90',  change: -2.4, rsi: 24.6, volume: '52M',  marketCap: '$158B', signal: 'Oversold' },
  { ticker: 'T',    name: 'AT&T',             price: '$17.20',  change: -0.8, rsi: 29.8, volume: '41M',  marketCap: '$123B', signal: 'Oversold' },
  { ticker: 'WBA',  name: 'Walgreens',        price: '$18.60',  change: -3.2, rsi: 22.1, volume: '29M',  marketCap: '$16B',  signal: 'Oversold' },
];

const FILTER_CATEGORIES = {
  Fundamental: ['Market Cap', 'P/E Ratio', 'EPS Growth'],
  Technical:   ['RSI Range', 'MACD Cross', 'Above VWAP', 'Below VWAP', '52W High', '52W Low'],
  'Price Action': ['Gap Up', 'Gap Down', 'Inside Bar', 'Breakout'],
};

const PRESETS = ['Momentum Breakouts', 'Oversold RSI<30', 'Earnings Gappers', 'High IV Rank'];

const INITIAL_FILTERS: FilterChip[] = [
  { id: 'f1', label: 'RSI < 30',       color: 'var(--color-amber-alt)' },
  { id: 'f2', label: 'Volume > 2× Avg', color: 'var(--color-accent)' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 80 }}>
      <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{low}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: -2, left: `${pct}%`, width: 7, height: 7, background: 'var(--color-text-bright)', borderRadius: '50%', transform: 'translateX(-50%)' }} />
      </div>
      <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{high}</span>
    </div>
  );
}

function Sparkline({ positive }: { positive: boolean }) {
  return (
    <div style={{ width: 48, height: 18, background: positive ? 'rgba(0,230,118,0.1)' : 'rgba(255,59,48,0.1)', borderRadius: 3, border: `1px solid ${positive ? 'rgba(0,230,118,0.25)' : 'rgba(255,59,48,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="40" height="12" viewBox="0 0 40 12">
        {positive
          ? <polyline points="0,10 8,7 16,8 24,4 32,3 40,1" fill="none" stroke="var(--color-green-alt)" strokeWidth="1.5" />
          : <polyline points="0,2 8,4 16,3 24,7 32,8 40,11" fill="none" stroke="var(--color-red-alt)" strokeWidth="1.5" />
        }
      </svg>
    </div>
  );
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

interface WatchlistPanelProps {
  activeListId: string;
  onSelectList: (id: string) => void;
  onSelectSymbol: (ticker: string) => void;
}

function WatchlistPanel({ activeListId, onSelectList, onSelectSymbol }: WatchlistPanelProps) {
  const [addSymbolInput, setAddSymbolInput] = useState('');

  const activeList = WATCHLISTS.find(w => w.id === activeListId) ?? WATCHLISTS[0];

  return (
    <div style={{ width: 350, minWidth: 350, background: 'var(--color-bg-deep)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--color-text-secondary)' }}>WATCHLISTS</span>
        <button style={{ fontSize: 11, color: 'var(--color-accent)', background: 'rgba(0,168,255,0.08)', border: '1px solid rgba(0,168,255,0.25)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.04em' }}>
          + New List
        </button>
      </div>

      {/* List selector */}
      <div style={{ padding: '8px 8px 0' }}>
        {WATCHLISTS.map(wl => (
          <button
            key={wl.id}
            onClick={() => onSelectList(wl.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', marginBottom: 2, borderRadius: 5, cursor: 'pointer', textAlign: 'left',
              background: wl.id === activeListId ? 'rgba(0,168,255,0.1)' : 'transparent',
              border: wl.id === activeListId ? '1px solid rgba(0,168,255,0.2)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: wl.id === activeListId ? 'var(--color-accent)' : 'var(--color-text-dim)' }} />
              <span style={{ fontSize: 13, color: wl.id === activeListId ? 'var(--color-text-bright)' : 'var(--color-text-secondary)' }}>{wl.name}</span>
              {wl.type === 'auto' && (
                <span style={{ fontSize: 9, color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>AUTO</span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>{wl.count}</span>
          </button>
        ))}
      </div>

      {/* Symbol table */}
      <div style={{ flex: 1, overflow: 'auto', marginTop: 8 }}>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <span style={{ fontSize: 11, color: 'var(--color-accent)', letterSpacing: '0.06em', fontWeight: 600 }}>{activeList.name}</span>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px 70px 64px 52px 1fr 52px 40px', gap: 0, padding: '5px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {['Symbol', 'Price', 'Chg%', 'Vol', '52W Range', 'Spark', ''].map(h => (
            <span key={h} style={{ fontSize: 9, color: 'var(--color-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</span>
          ))}
        </div>

        {activeList.symbols.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: 12 }}>
            No symbols in this list
          </div>
        ) : (
          activeList.symbols.map((s, i) => (
            <div
              key={s.ticker}
              onClick={() => onSelectSymbol(s.ticker)}
              style={{
                display: 'grid', gridTemplateColumns: '60px 70px 64px 52px 1fr 52px 40px', gap: 0,
                padding: '7px 10px', cursor: 'pointer', alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,255,0.07)')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)', fontFamily: 'monospace' }}>{s.ticker}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-bright)', fontFamily: 'monospace' }}>{s.price}</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: s.change >= 0 ? 'var(--color-green-alt)' : 'var(--color-red-alt)' }}>
                {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{s.volume}</span>
              <RangeBar low={s.weekLow} high={s.weekHigh} current={s.current} />
              <Sparkline positive={s.change >= 0} />
              <button
                onClick={e => { e.stopPropagation(); onSelectSymbol(s.ticker); }}
                style={{ fontSize: 10, color: 'var(--color-accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                SET
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add symbol input */}
      <div style={{ padding: '10px 10px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="Add symbol..."
          value={addSymbolInput}
          onChange={e => setAddSymbolInput(e.target.value.toUpperCase())}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '5px 10px', color: 'var(--color-text-bright)', fontSize: 12,
            fontFamily: 'monospace', outline: 'none',
          }}
        />
        <button style={{ padding: '5px 12px', background: 'rgba(0,168,255,0.12)', border: '1px solid rgba(0,168,255,0.3)', borderRadius: 4, color: 'var(--color-accent)', fontSize: 12, cursor: 'pointer' }}>
          +
        </button>
      </div>
    </div>
  );
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface ScreenerPanelProps {
  onSelectSymbol: (ticker: string) => void;
}

function ScreenerPanel({ onSelectSymbol }: ScreenerPanelProps) {
  const [filters, setFilters]           = useState<FilterChip[]>(INITIAL_FILTERS);
  const [selectedPreset, setPreset]     = useState('Oversold RSI<30');
  const [showFilterDrop, setFilterDrop] = useState(false);
  const [sortKey, setSortKey]           = useState<keyof ScanResult>('rsi');
  const [sortAsc, setSortAsc]           = useState(true);

  const removeFilter = (id: string) => setFilters(f => f.filter(c => c.id !== id));

  const addFilter = (label: string) => {
    setFilters(f => [...f, { id: `f${Date.now()}`, label, color: 'var(--color-text-secondary)' }]);
    setFilterDrop(false);
  };

  const handleSort = (key: keyof ScanResult) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...OVERSOLD_RESULTS].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const SortHeader = ({ label, col }: { label: string; col: keyof ScanResult }) => (
    <th
      onClick={() => handleSort(col)}
      style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, color: sortKey === col ? 'var(--color-accent)' : 'var(--color-text-dim)', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', fontWeight: 600 }}
    >
      {label} {sortKey === col ? (sortAsc ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <div style={{ flex: 1, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--color-text-secondary)', marginRight: 4 }}>SCREENER</span>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterDrop(d => !d)}
            style={{ fontSize: 11, color: 'var(--color-accent)', background: 'rgba(0,168,255,0.08)', border: '1px solid rgba(0,168,255,0.25)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}
          >
            + Add Filter
          </button>
          {showFilterDrop && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, zIndex: 100, minWidth: 200, padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
              {Object.entries(FILTER_CATEGORIES).map(([cat, items]) => (
                <div key={cat}>
                  <div style={{ padding: '6px 12px 3px', fontSize: 9, color: 'var(--color-text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{cat}</div>
                  {items.map(item => (
                    <button key={item} onClick={() => addFilter(item)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 16px', fontSize: 12, color: 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{item}</button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <button style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}>
          Save Scan
        </button>
      </div>

      {/* Active filter chips */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {filters.map(chip => (
          <div key={chip.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 20, border: `1px solid color-mix(in srgb, ${chip.color} 25%, transparent)`, background: `color-mix(in srgb, ${chip.color} 8%, transparent)`, fontSize: 11, color: chip.color }}>
            {chip.label}
            <button onClick={() => removeFilter(chip.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: chip.color, fontSize: 13, lineHeight: 1, padding: 0, marginLeft: 2, opacity: 0.7 }}>×</button>
          </div>
        ))}
        {filters.length === 0 && <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>No active filters</span>}
      </div>

      {/* Preset buttons */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
              background: selectedPreset === p ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.04)',
              border: selectedPreset === p ? '1px solid rgba(0,168,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: selectedPreset === p ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Results info bar */}
      <div style={{ padding: '7px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{sorted.length} results</span>
        <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Sorted by: <span style={{ color: 'var(--color-text-secondary)' }}>{String(sortKey)}</span></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['rsi', 'change', 'volume'] as (keyof ScanResult)[]).map(k => (
            <button key={k} onClick={() => handleSort(k)} style={{ fontSize: 10, color: sortKey === k ? 'var(--color-accent)' : 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-deep)', zIndex: 10 }}>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <SortHeader label="Symbol"     col="ticker"    />
              <SortHeader label="Name"       col="name"      />
              <SortHeader label="Price"      col="price"     />
              <SortHeader label="Chg%"       col="change"    />
              <SortHeader label="RSI"        col="rsi"       />
              <SortHeader label="Volume"     col="volume"    />
              <SortHeader label="Market Cap" col="marketCap" />
              <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, color: 'var(--color-text-dim)', letterSpacing: '0.08em' }}>Signal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.ticker}
                onClick={() => onSelectSymbol(r.ticker)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)')}
              >
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-bright)', fontSize: 12 }}>{r.ticker}</td>
                <td style={{ padding: '8px 10px', color: 'var(--color-text-secondary)', fontSize: 12 }}>{r.name}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--color-text-bright)', fontSize: 12 }}>{r.price}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: r.change >= 0 ? 'var(--color-green-alt)' : 'var(--color-red-alt)' }}>
                  {r.change >= 0 ? '+' : ''}{r.change.toFixed(1)}%
                </td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 7px', borderRadius: 4, background: r.rsi < 25 ? 'rgba(255,59,48,0.18)' : 'rgba(240,165,0,0.14)', color: r.rsi < 25 ? 'var(--color-red-alt)' : 'var(--color-amber-alt)', fontWeight: 600 }}>
                    {r.rsi.toFixed(1)}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', fontSize: 12 }}>{r.volume}</td>
                <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: 'var(--color-text-secondary)', fontSize: 12 }}>{r.marketCap}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,59,48,0.12)', color: 'var(--color-red-alt)', border: '1px solid rgba(255,59,48,0.2)', letterSpacing: '0.04em' }}>
                    {r.signal}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WatchlistPage() {
  const { setSymbol } = useTerminal();
  const [activeListId, setActiveListId] = useState('tech');

  const handleSelectSymbol = (ticker: string) => {
    setSymbol(ticker);
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--color-bg)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <WatchlistPanel
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onSelectSymbol={handleSelectSymbol}
      />
      <ScreenerPanel onSelectSymbol={handleSelectSymbol} />
    </div>
  );
}
