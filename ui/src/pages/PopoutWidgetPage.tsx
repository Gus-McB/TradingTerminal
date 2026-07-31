/**
 * PopoutWidgetPage — a single widget in its own frameless window.
 *
 * Route: /widget/:type?symbol=BTC/USD          → Independent (pinned)
 *        /widget/:type?linkGroup=A             → Linked (follows channel A
 *                                                 across every window)
 *
 * The mode is switchable in the title bar so a trader can park a window on
 * one market permanently, or have it follow the channel they're driving from
 * the main window.
 */
import { Suspense, useState, type CSSProperties } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Pin, Link as LinkIcon } from 'lucide-react';
import { WIDGET_REGISTRY } from '../widgets/registry';
import type { WidgetType } from '../stores/workspaceStore';
import { LINK_GROUP_COLORS, useTerminalStore, type LinkGroup } from '../stores/terminalStore';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';
import { useSessionStatus, SESSION_COLORS } from '../hooks/useSessionStatus';
import { resolveInstrument, VENUES } from '@shared/instruments';

const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties;

const LINK_GROUPS: LinkGroup[] = ['A', 'B', 'C'];

export function PopoutWidgetPage() {
    const { type } = useParams();
    const [params] = useSearchParams();

    const initialSymbol = params.get('symbol') || undefined;
    const initialGroup = LINK_GROUPS.find(g => g === params.get('linkGroup'));

    // Mode is window-local: Independent pins to a symbol, Linked follows a channel
    const [linkGroup, setLinkGroup] = useState<LinkGroup | undefined>(initialGroup);
    const [pinnedSymbol, setPinnedSymbol] = useState<string | undefined>(
        initialGroup ? undefined : initialSymbol
    );

    // Channel symbols arrive from the other windows via terminalSync
    const channelSymbol = useTerminalStore(s => (linkGroup ? s.linkGroups[linkGroup] : undefined));
    const globalSymbol = useTerminalStore(s => s.activeSymbol);
    const effectiveSymbol = pinnedSymbol ?? channelSymbol ?? globalSymbol;

    const instrument = resolveInstrument(effectiveSymbol);
    const session = useSessionStatus(effectiveSymbol);
    const entry = type ? WIDGET_REGISTRY[type as WidgetType] : undefined;

    if (!entry) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                    Unknown widget type: {type}
                </span>
            </div>
        );
    }

    const Component = entry.component;

    /** Cycle: pinned → A → B → C → pinned */
    const cycleMode = () => {
        if (!linkGroup) {
            setPinnedSymbol(undefined);
            setLinkGroup('A');
            return;
        }
        const next = LINK_GROUPS[LINK_GROUPS.indexOf(linkGroup) + 1];
        if (next) {
            setLinkGroup(next);
        } else {
            setLinkGroup(undefined);
            setPinnedSymbol(effectiveSymbol);   // pin wherever we ended up
        }
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-bg)' }}>
            {/* Title / drag strip */}
            <div
                className="flex items-center gap-2 px-3 shrink-0"
                style={{
                    ...dragRegion,
                    height: 30,
                    background: 'var(--color-bg-deep)',
                    borderBottom: '1px solid var(--color-border)',
                    userSelect: 'none',
                }}
            >
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                    {entry.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cyan)', fontFamily: 'monospace' }}>
                    {effectiveSymbol}
                </span>

                {/* Venue session for THIS window's market */}
                <span
                    title={`${VENUES[instrument.venue].label} — session ${session}`}
                    style={{
                        fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                        color: SESSION_COLORS[session],
                        border: `1px solid ${SESSION_COLORS[session]}`,
                        padding: '0 4px', borderRadius: 2,
                    }}
                >
                    {session}
                </span>

                <div style={{ flex: 1 }} />

                {/* Linked ⇄ Independent */}
                <button
                    style={{
                        ...noDrag,
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                        padding: '1px 6px', borderRadius: 2, cursor: 'pointer',
                        background: 'transparent',
                        color: linkGroup ? LINK_GROUP_COLORS[linkGroup] : 'var(--color-text-secondary)',
                        border: `1px solid ${linkGroup ? LINK_GROUP_COLORS[linkGroup] : 'var(--color-border)'}`,
                    }}
                    onClick={cycleMode}
                    title={linkGroup
                        ? `Following channel ${linkGroup} across all windows — click to change`
                        : 'Independent: pinned to this symbol — click to follow a channel'}
                >
                    {linkGroup ? <LinkIcon size={9} /> : <Pin size={9} />}
                    {linkGroup ? `LINK ${linkGroup}` : 'PINNED'}
                </button>

                <button
                    style={{ ...noDrag, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}
                    onClick={() => window.close()}
                    title="Close"
                >
                    ×
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <WidgetErrorBoundary widgetLabel={entry.label}>
                    <Suspense fallback={null}>
                        <Component
                            widgetId={`popout-${type}`}
                            workspaceId="popout"
                            config={linkGroup ? { linkGroup } : { pinSymbol: effectiveSymbol }}
                        />
                    </Suspense>
                </WidgetErrorBoundary>
            </div>
        </div>
    );
}
