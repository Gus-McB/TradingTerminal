/**
 * Pop-out controls — send a pane or a whole workspace to its own window.
 *
 * With one monitor it pops out immediately. With several it offers a monitor
 * picker, so a trader can push a DOM to screen 2 and a chart to screen 3.
 * Hidden entirely outside Electron.
 */
import { useState, useRef, type ReactNode } from 'react';
import { ExternalLink, Monitor } from 'lucide-react';
import { useWindowStore } from '../../stores/windowStore';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import type { WidgetType } from '../../stores/workspaceStore';
import type { LinkGroup } from '../../stores/terminalStore';

interface DisplayPickerProps {
    /** Called with the chosen monitor index (undefined = default placement) */
    onPick: (displayIndex?: number) => void;
    title: string;
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/** Button that pops out directly, or opens a monitor list when multi-display. */
export function DisplayPickerButton({ onPick, title, children, className, style }: DisplayPickerProps) {
    const isElectron = useWindowStore(s => s.isElectron);
    const displays = useWindowStore(s => s.displays);

    const [menuOpen, setMenuOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useOutsideClick(ref, () => setMenuOpen(false));

    if (!isElectron) return null;

    const multiMonitor = displays.length > 1;

    const pick = (displayIndex?: number) => {
        onPick(displayIndex);
        setMenuOpen(false);
    };

    return (
        <div ref={ref} className="relative flex items-center" style={{ pointerEvents: 'auto' }}>
            <button
                className={className ?? 'flex items-center justify-center shrink-0'}
                style={style ?? { width: 16, height: 16, color: 'var(--color-text-muted)' }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => {
                    e.stopPropagation();
                    if (multiMonitor) setMenuOpen(v => !v);
                    else pick();
                }}
                title={multiMonitor ? `${title} —  choose monitor` : title}
            >
                {children}
            </button>

            {menuOpen && (
                <div
                    className="absolute top-full right-0 z-50"
                    style={{
                        background: 'var(--color-surface-alt)',
                        border: '1px solid var(--color-divider-strong)',
                        marginTop: 2, minWidth: 200,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    }}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div style={{ padding: '5px 10px', fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-dim)', fontWeight: 700 }}>
                        OPEN ON
                    </div>
                    {displays.map(d => (
                        <button
                            key={d.id}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                            style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}
                            onClick={e => { e.stopPropagation(); pick(d.index); }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-accent) 8%, transparent)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Monitor size={11} color="var(--color-text-dim)" />
                            <span style={{ flex: 1 }}>
                                {d.label}{d.primary ? ' (primary)' : ''}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--color-text-dim)' }}>
                                {d.bounds.width}×{d.bounds.height}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Widget pane pop-out (used in dock tabs) ─────────────────────────────────

interface PopOutButtonProps {
    type: WidgetType;
    /** Pin the pop-out to this symbol (independent of the main window) */
    symbol?: string;
    /** Or have it follow a link channel shared across windows */
    linkGroup?: LinkGroup;
    size?: number;
}

export function PopOutButton({ type, symbol, linkGroup, size = 10 }: PopOutButtonProps) {
    const popOutWidget = useWindowStore(s => s.popOutWidget);
    return (
        <DisplayPickerButton
            title="Pop out to its own window"
            onPick={displayIndex => popOutWidget({ type, symbol, linkGroup, displayIndex })}
        >
            <ExternalLink size={size} />
        </DisplayPickerButton>
    );
}

// ─── Workspace pop-out ───────────────────────────────────────────────────────

export function PopOutWorkspaceButton({ workspaceId }: { workspaceId: string }) {
    const popOutWorkspace = useWindowStore(s => s.popOutWorkspace);
    return (
        <DisplayPickerButton
            title="Open this workspace in a new window"
            onPick={displayIndex => popOutWorkspace(workspaceId, displayIndex)}
            className="flex items-center gap-2 px-3 py-2"
            style={{
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-divider-strong)',
                color: 'var(--color-text-secondary)',
                fontSize: 11, fontWeight: 600, pointerEvents: 'auto',
            }}
        >
            <ExternalLink size={13} />
            Pop Out
        </DisplayPickerButton>
    );
}
