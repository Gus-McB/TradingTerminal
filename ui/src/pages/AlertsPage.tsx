import { useState, useEffect, useCallback } from 'react';
import { useTerminal } from '../context/TerminalContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertStatus = 'Active' | 'Triggered' | 'Expired' | 'Disabled';
type AlertType   = 'Price' | '% Move' | 'Indicator' | 'Volume' | 'News' | 'Portfolio' | 'Economic' | 'Options';
type AlertExpiry = 'Once' | 'Recurring' | 'GTC';
type AlertFilter = 'All' | AlertStatus;

interface AlertRow {
  id: string;
  symbol: string;
  type: AlertType;
  condition: string;
  value: string;
  status: AlertStatus;
  notify: string[];
  expiry: AlertExpiry;
  created: string;
}

interface ToastItem {
  id: string;
  message: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_ALERTS: AlertRow[] = [
  { id: 'a1', symbol: 'BTC/USD', type: 'Price',     condition: '> $70,000',   value: '$70,000',  status: 'Active',    notify: ['app'],         expiry: 'Once',      created: '2h ago'  },
  { id: 'a2', symbol: 'AAPL',    type: 'Price',     condition: '< $170',      value: '$170',     status: 'Triggered', notify: ['app','sound'],  expiry: 'Once',      created: '1h ago'  },
  { id: 'a3', symbol: 'TSLA',    type: 'Indicator', condition: 'RSI < 30',    value: 'RSI 30',   status: 'Active',    notify: ['app'],         expiry: 'Recurring', created: '1d ago'  },
  { id: 'a4', symbol: 'NVDA',    type: '% Move',    condition: '> 5%',        value: '5%',       status: 'Active',    notify: ['app','sound'],  expiry: 'GTC',       created: '12h ago' },
  { id: 'a5', symbol: 'SPY',     type: 'Volume',    condition: '> 2× avg',    value: '2× avg',   status: 'Expired',   notify: ['app'],         expiry: 'Once',      created: '2d ago'  },
  { id: 'a6', symbol: '—',       type: 'Economic',  condition: 'CPI Release', value: 'Event',    status: 'Active',    notify: ['app','browser'],expiry: 'Once',      created: '10m ago' },
  { id: 'a7', symbol: 'MSFT',    type: 'Portfolio', condition: 'P&L < -$1000',value: '-$1000',   status: 'Disabled',  notify: ['app'],         expiry: 'GTC',       created: '3d ago'  },
  { id: 'a8', symbol: 'ETH/USD', type: 'Price',     condition: '> $4,000',    value: '$4,000',   status: 'Active',    notify: ['app'],         expiry: 'Once',      created: '5h ago'  },
];

const RECENT_TRIGGERS = [
  { label: 'AAPL < $170',        time: '15 min ago', color: '#ff3b30' },
  { label: 'SPY volume spike',   time: '2h ago',     color: '#f0a500' },
];

const ALERT_TYPES: AlertType[] = ['Price', '% Move', 'Indicator', 'Volume', 'News', 'Portfolio', 'Economic', 'Options'];
const CONDITIONS = ['crosses above', 'crosses below', 'is above', 'is below'];
const FILTER_TABS: AlertFilter[] = ['All', 'Active', 'Triggered', 'Expired', 'Disabled'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: AlertStatus): string {
  switch (status) {
    case 'Active':    return '#00a8ff';
    case 'Triggered': return '#f0a500';
    case 'Expired':   return '#4b5563';
    case 'Disabled':  return '#4b5563';
  }
}

function statusBorderColor(status: AlertStatus): string {
  switch (status) {
    case 'Active':    return '#00a8ff';
    case 'Triggered': return '#f0a500';
    default:          return 'transparent';
  }
}

function NotifyIcons({ methods }: { methods: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {methods.includes('app')     && <span title="In-App"  style={{ fontSize: 12 }}>🔔</span>}
      {methods.includes('sound')   && <span title="Sound"   style={{ fontSize: 12 }}>🔊</span>}
      {methods.includes('browser') && <span title="Browser" style={{ fontSize: 12 }}>🌐</span>}
    </div>
  );
}

// ─── Alert Builder ────────────────────────────────────────────────────────────

interface AlertBuilderProps {
  onCreated: (msg: string) => void;
}

function AlertBuilder({ onCreated }: AlertBuilderProps) {
  const { state } = useTerminal();
  const [alertType,  setAlertType]  = useState<AlertType>('Price');
  const [symbol,     setSymbol]     = useState(state.activeSymbol);
  const [condition,  setCondition]  = useState(CONDITIONS[0]);
  const [value,      setValue]      = useState('');
  const [notifyApp,  setNotifyApp]  = useState(true);
  const [notifySound,setNotifySound]= useState(false);
  const [notifyBrow, setNotifyBrow] = useState(false);
  const [expiry,     setExpiry]     = useState<AlertExpiry>('Once');

  const preview = symbol && value
    ? `${symbol.toUpperCase()} ${condition} ${alertType === 'Price' && !value.startsWith('$') ? '$' : ''}${value}`
    : 'Configure alert above';

  const handleCreate = () => {
    if (!symbol || !value) return;
    onCreated(`Alert created: ${preview}`);
    setValue('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, padding: '7px 11px', color: '#e8eaed', fontSize: 13,
    fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: '#6a6a7a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5, display: 'block',
  };

  return (
    <div style={{ width: 400, minWidth: 400, background: '#0d0f12', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#9aa0ac' }}>ALERT BUILDER</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Alert type tabs */}
        <div style={{ marginBottom: 16 }}>
          <span style={labelStyle}>Alert Type</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALERT_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setAlertType(t)}
                style={{
                  padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                  background: alertType === t ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: alertType === t ? '1px solid rgba(0,168,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: alertType === t ? '#00a8ff' : '#9aa0ac',
                  transition: 'all 0.12s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Symbol */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL, BTC/USD"
            style={inputStyle}
          />
        </div>

        {/* Condition */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Condition</label>
          <select
            value={condition}
            onChange={e => setCondition(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
          >
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Value */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Value</label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={alertType === 'Price' ? '180.00' : alertType === '% Move' ? '5' : 'Enter value'}
            style={inputStyle}
          />
        </div>

        {/* Preview */}
        <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(0,168,255,0.06)', border: '1px solid rgba(0,168,255,0.15)', borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>PREVIEW</span>
          <span style={{ fontSize: 13, color: '#e8eaed', fontFamily: 'monospace' }}>{preview}</span>
        </div>

        {/* Notification method */}
        <div style={{ marginBottom: 16 }}>
          <span style={labelStyle}>Notification Method</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { label: 'In-App',  checked: notifyApp,   set: setNotifyApp,   icon: '🔔' },
              { label: 'Sound',   checked: notifySound, set: setNotifySound, icon: '🔊' },
              { label: 'Browser', checked: notifyBrow,  set: setNotifyBrow,  icon: '🌐' },
            ].map(n => (
              <label key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#9aa0ac' }}>
                <input
                  type="checkbox"
                  checked={n.checked}
                  onChange={e => n.set(e.target.checked)}
                  style={{ accentColor: '#00a8ff', width: 14, height: 14 }}
                />
                <span>{n.icon} {n.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Expiry */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Expiry</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Once', 'Recurring', 'GTC'] as AlertExpiry[]).map(e => (
              <button
                key={e}
                onClick={() => setExpiry(e)}
                style={{
                  flex: 1, padding: '6px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  background: expiry === e ? 'rgba(0,168,255,0.1)' : 'rgba(255,255,255,0.04)',
                  border: expiry === e ? '1px solid rgba(0,168,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  color: expiry === e ? '#00a8ff' : '#9aa0ac',
                }}
              >
                {e === 'GTC' ? 'Until Cancelled' : e}
              </button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          style={{
            width: '100%', padding: '10px', borderRadius: 6, fontSize: 13, fontWeight: 700,
            background: symbol && value ? '#00a8ff' : 'rgba(0,168,255,0.2)',
            border: 'none', color: symbol && value ? '#0a0a0f' : '#4b5563',
            cursor: symbol && value ? 'pointer' : 'not-allowed', letterSpacing: '0.06em',
            transition: 'all 0.15s',
          }}
        >
          CREATE ALERT
        </button>
      </div>

      {/* Recent triggers */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: 10, color: '#6a6a7a', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>RECENT TRIGGERS</span>
        {RECENT_TRIGGERS.map((t, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', marginBottom: 4, borderRadius: 4, background: `${t.color}0d`, borderLeft: `2px solid ${t.color}` }}>
            <span style={{ fontSize: 12, color: t.color, fontFamily: 'monospace' }}>{t.label}</span>
            <span style={{ fontSize: 11, color: '#4b5563' }}>{t.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Dashboard ──────────────────────────────────────────────────────────

interface AlertDashboardProps {
  toasts: ToastItem[];
  onDismissToast: (id: string) => void;
}

function AlertDashboard({ toasts, onDismissToast }: AlertDashboardProps) {
  const [alerts, setAlerts]       = useState<AlertRow[]>(MOCK_ALERTS);
  const [filterTab, setFilterTab] = useState<AlertFilter>('All');

  const counts = {
    Active:    alerts.filter(a => a.status === 'Active').length,
    Triggered: alerts.filter(a => a.status === 'Triggered').length,
    Expired:   alerts.filter(a => a.status === 'Expired').length,
    Disabled:  alerts.filter(a => a.status === 'Disabled').length,
  };

  const filtered = filterTab === 'All' ? alerts : alerts.filter(a => a.status === filterTab);

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => {
      if (a.id !== id) return a;
      return { ...a, status: a.status === 'Disabled' ? 'Active' : 'Disabled' };
    }));
  };

  const deleteAlert = (id: string) => setAlerts(prev => prev.filter(a => a.id !== id));

  return (
    <div style={{ flex: 1, background: '#0a0a0f', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Toast area */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '10px 14px', background: '#12121a', border: '1px solid rgba(0,168,255,0.4)',
              borderLeft: '3px solid #00a8ff', borderRadius: 6, fontSize: 12, color: '#e8eaed',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)', maxWidth: 300, display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 14 }}>🔔</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <button onClick={() => onDismissToast(t.id)} style={{ background: 'transparent', border: 'none', color: '#6a6a7a', cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#9aa0ac' }}>ACTIVE ALERTS</span>
        <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, color: '#6a6a7a' }}>
              {k}: <span style={{ color: k === 'Active' ? '#00a8ff' : k === 'Triggered' ? '#f0a500' : '#4b5563', fontFamily: 'monospace' }}>{v}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 0 }}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            style={{
              padding: '9px 14px', fontSize: 11, cursor: 'pointer', background: 'transparent', border: 'none',
              borderBottom: filterTab === tab ? '2px solid #00a8ff' : '2px solid transparent',
              color: filterTab === tab ? '#00a8ff' : '#6a6a7a',
              letterSpacing: '0.06em', transition: 'all 0.15s',
            }}
          >
            {tab}
            {tab !== 'All' && (
              <span style={{ marginLeft: 5, fontSize: 10, fontFamily: 'monospace', color: 'inherit', opacity: 0.7 }}>
                ({counts[tab as AlertStatus] ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#0d0f12', zIndex: 10 }}>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Symbol', 'Type', 'Condition', 'Value', 'Status', 'Notify', 'Expiry', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#4b5563', letterSpacing: '0.09em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const dimmed = a.status === 'Expired' || a.status === 'Disabled';
              const rowBg  = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.012)';

              return (
                <tr
                  key={a.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    borderLeft: `2px solid ${statusBorderColor(a.status)}`,
                    background: a.status === 'Triggered' ? 'rgba(240,165,0,0.04)' : rowBg,
                    opacity: dimmed ? 0.5 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: dimmed ? '#4b5563' : '#e8eaed' }}>{a.symbol}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#9aa0ac' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', fontSize: 10, letterSpacing: '0.04em' }}>{a.type}</span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: dimmed ? '#4b5563' : '#9aa0ac', fontFamily: 'monospace' }}>{a.condition}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: dimmed ? '#4b5563' : '#e8eaed', fontFamily: 'monospace', fontWeight: 600 }}>{a.value}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em', fontWeight: 600,
                      color: statusColor(a.status),
                      background: `${statusColor(a.status)}18`,
                      border: `1px solid ${statusColor(a.status)}30`,
                    }}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px' }}><NotifyIcons methods={a.notify} /></td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#6a6a7a', fontFamily: 'monospace' }}>{a.expiry}</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#4b5563', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{a.created}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Edit */}
                      <button title="Edit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', color: '#9aa0ac', fontSize: 11 }}>✎</button>
                      {/* Toggle */}
                      <button
                        title={a.status === 'Disabled' ? 'Enable' : 'Disable'}
                        onClick={() => toggleAlert(a.id)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', color: a.status === 'Disabled' ? '#00e676' : '#f0a500', fontSize: 11 }}
                      >
                        {a.status === 'Disabled' ? '▶' : '⏸'}
                      </button>
                      {/* Delete */}
                      <button
                        title="Delete"
                        onClick={() => deleteAlert(a.id)}
                        style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.15)', borderRadius: 4, padding: '3px 7px', cursor: 'pointer', color: '#ff3b30', fontSize: 11 }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
            No alerts in this category
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AlertsPage() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Simulate a triggered alert after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      pushToast('Alert triggered: NVDA crossed above 5% move threshold');
    }, 10000);
    return () => clearTimeout(timer);
  }, [pushToast]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: '#0a0a0f', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <AlertBuilder onCreated={pushToast} />
      <AlertDashboard toasts={toasts} onDismissToast={dismissToast} />
    </div>
  );
}
