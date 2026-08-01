/**
 * AlgoWidget — write, run, and monitor a trading algorithm.
 *
 * User code runs in a Web Worker (services/algoRuntime) with a three-function
 * API: onTick(fn), submitOrder(order), log(...). Orders go to the same paper
 * matcher as manual tickets, rate-limited to protect against runaways.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import { startAlgo, type AlgoHandle, type AlgoLogEntry, type AlgoStatus } from '../services/algoRuntime';
import type { WidgetComponentProps } from './registry';

const DEFAULT_CODE = `// Algo API: onTick(fn), submitOrder(order), log(...)
// Ticker fields: price, changePercent, high24h, low24h, volume
// Demo: buy tiny momentum breaks (paper account, rate-limited)
let last = null;

onTick((symbol, t) => {
  if (last !== null && t.price > last * 1.0005) {
    submitOrder({ symbol, side: 'BUY', type: 'MARKET', quantity: 0.01 });
    log('momentum buy', symbol, '@', t.price.toFixed(2));
  }
  last = t.price;
});
`;

const MAX_LOG = 100;

const STATUS_COLORS: Record<AlgoStatus, string> = {
    running: 'var(--color-green)',
    stopped: 'var(--color-text-muted)',
    error: 'var(--color-red)',
};

export function AlgoWidget({ widgetId: _w, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    const { symbol } = useTerminalSync({
        pinSymbol: _c?.pinSymbol as string | undefined,
        linkGroup: _c?.linkGroup as string | undefined,
    });

    const [code, setCode] = useState<string>((_c?.code as string) || DEFAULT_CODE);
    const [symbolsInput, setSymbolsInput] = useState(symbol);
    const [status, setStatus] = useState<AlgoStatus>('stopped');
    const [logs, setLogs] = useState<AlgoLogEntry[]>([]);
    const handleRef = useRef<AlgoHandle | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ block: 'nearest' });
    }, [logs]);

    // Stop the worker when the widget unmounts
    useEffect(() => () => handleRef.current?.stop(), []);

    const appendLog = useCallback((entry: AlgoLogEntry) => {
        setLogs(prev => [...prev.slice(-(MAX_LOG - 1)), entry]);
    }, []);

    const start = () => {
        if (handleRef.current) return;
        const symbols = symbolsInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
        if (symbols.length === 0) {
            appendLog({ time: Date.now(), level: 'warn', message: 'no symbols specified' });
            return;
        }
        handleRef.current = startAlgo(code, symbols, {
            onLog: appendLog,
            onStatus: (s) => {
                setStatus(s);
                if (s === 'stopped' || s === 'error') handleRef.current = null;
            },
        });
    };

    const stop = () => {
        handleRef.current?.stop();
        handleRef.current = null;
    };

    const running = status === 'running';
    const mono: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 };

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0 }} title={status} />
                <input
                    value={symbolsInput}
                    onChange={e => setSymbolsInput(e.target.value)}
                    disabled={running}
                    placeholder="BTC/USD, ETH/USD"
                    style={{
                        ...mono, flex: 1, minWidth: 60,
                        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                        color: 'var(--color-text)', padding: '3px 7px', outline: 'none', borderRadius: 3,
                        opacity: running ? 0.6 : 1,
                    }}
                />
                <button
                    onClick={running ? stop : start}
                    className="flex items-center gap-1.5 px-2.5 py-1"
                    style={{
                        ...mono, fontWeight: 700, cursor: 'pointer', borderRadius: 3,
                        background: running ? 'var(--color-sell-bg)' : 'var(--color-buy-bg)',
                        color: running ? 'var(--color-red)' : 'var(--color-green)',
                        border: `1px solid ${running ? 'var(--color-red)' : 'var(--color-green)'}`,
                    }}
                >
                    {running ? <Square size={10} /> : <Play size={10} />}
                    {running ? 'STOP' : 'RUN'}
                </button>
            </div>

            {/* Code editor */}
            <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                disabled={running}
                spellCheck={false}
                style={{
                    ...mono, fontSize: 11, lineHeight: 1.5,
                    flex: 1, minHeight: 60, resize: 'none',
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    border: 'none', borderBottom: '1px solid var(--color-border)',
                    padding: 8, outline: 'none',
                    opacity: running ? 0.7 : 1,
                }}
            />

            {/* Run log */}
            <div style={{ height: '35%', minHeight: 60, overflowY: 'auto', padding: '4px 8px', background: 'var(--color-bg-deep)' }}>
                {logs.length === 0 ? (
                    <span style={{ ...mono, fontSize: 10, color: 'var(--color-text-faint)' }}>
                        Run log — algo output, fills, and rejections appear here
                    </span>
                ) : logs.map((l, i) => (
                    <div key={i} style={{ ...mono, fontSize: 10, display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--color-text-faint)', flexShrink: 0 }}>
                            {new Date(l.time).toLocaleTimeString('en-US', { hour12: false })}
                        </span>
                        <span style={{
                            color: l.level === 'error' ? 'var(--color-red)'
                                 : l.level === 'warn' ? 'var(--color-amber)'
                                 : 'var(--color-text-secondary)',
                            wordBreak: 'break-word',
                        }}>
                            {l.message}
                        </span>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}
