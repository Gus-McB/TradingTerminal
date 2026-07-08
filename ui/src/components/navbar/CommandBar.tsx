/**
 * CommandBar — navbar entry point for the command palette (Ctrl+K).
 * The palette owns all command handling; this is just the visible affordance.
 */
import { Search } from 'lucide-react';
import { useCommandPalette } from '../CommandPalette';
import { useTerminalStore } from '../../stores/terminalStore';

export function CommandBar() {
    const openPalette = useCommandPalette(s => s.open);
    const activeSymbol = useTerminalStore(s => s.activeSymbol);

    return (
        <div
            className="flex items-center px-2"
            style={{
                borderRight: '1px solid var(--color-divider)',
                flex: '0 1 240px',
                minWidth: 100,
            }}
        >
            <button
                onClick={openPalette}
                className="flex items-center gap-1.5 w-full"
                style={{
                    background: 'var(--color-surface-alt)',
                    border: '1px solid var(--color-divider-strong)',
                    padding: '4px 8px',
                    cursor: 'text',
                }}
                title="Command palette (Ctrl+K)"
            >
                <Search size={12} color="var(--color-text-dim)" />
                <span style={{ flex: 1, textAlign: 'left', fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-dim)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {activeSymbol} — symbol or command…
                </span>
                <kbd style={{ fontSize: 9, color: 'var(--color-text-dim)', border: '1px solid var(--color-divider-strong)', padding: '0 4px', whiteSpace: 'nowrap' }}>
                    Ctrl K
                </kbd>
            </button>
        </div>
    );
}
