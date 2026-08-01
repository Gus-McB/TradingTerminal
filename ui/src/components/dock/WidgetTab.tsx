/**
 * WidgetTab — custom dockview tab carrying the Widget SDK chrome:
 * label · SIM badge · PIN marker · link-group dot · configure · close.
 */
import type { IDockviewPanelHeaderProps } from 'dockview-react';
import { Settings, X } from 'lucide-react';
import { WIDGET_REGISTRY } from '../../widgets/registry';
import { LINK_GROUP_COLORS, type LinkGroup } from '../../stores/terminalStore';
import { useDockUiStore } from '../../stores/dockUiStore';
import { PopOutButton } from './PopOutButton';
import type { WidgetPanelParams } from '../../services/dockLayout';

const LINK_CYCLE: Array<LinkGroup | undefined> = [undefined, 'A', 'B', 'C'];

export function WidgetTab({ api, params }: IDockviewPanelHeaderProps<WidgetPanelParams>) {
    const locked = useDockUiStore(s => s.locked);
    const setConfigPanel = useDockUiStore(s => s.setConfigPanel);

    const entry = WIDGET_REGISTRY[params.type];
    const config = params.config ?? {};
    const isPinned = Boolean(config.pinSymbol);
    const linkGroup = (['A', 'B', 'C'] as const).find(g => g === config.linkGroup);

    const cycleLinkGroup = () => {
        const next = LINK_CYCLE[(LINK_CYCLE.indexOf(linkGroup) + 1) % LINK_CYCLE.length];
        api.updateParameters({ config: { ...config, linkGroup: next ?? null } });
    };

    return (
        <div
            className="flex items-center gap-1 px-2 h-full"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', userSelect: 'none' }}
        >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                {entry?.label ?? params.type}
            </span>

            {entry?.dataDeps.mock && (
                <span
                    title="Simulated data — no live feed wired to this widget yet"
                    style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
                        color: 'var(--color-amber-alt)',
                        border: '1px solid color-mix(in srgb, var(--color-amber-alt) 40%, transparent)',
                        padding: '0 3px', borderRadius: 2, flexShrink: 0,
                    }}
                >
                    SIM
                </span>
            )}

            {isPinned && (
                <span
                    title={`Pinned to ${config.pinSymbol}`}
                    style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        padding: '0 3px', borderRadius: 2, flexShrink: 0,
                    }}
                >
                    PIN
                </span>
            )}

            {/* Link channel dot */}
            <button
                className="flex items-center justify-center shrink-0"
                style={{ width: 16, height: 16 }}
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); cycleLinkGroup(); }}
                title={linkGroup
                    ? `Link group ${linkGroup} — follows and retargets channel ${linkGroup}`
                    : 'Unlinked — follows the global symbol. Click to join a link group.'}
            >
                {linkGroup ? (
                    <span
                        className="flex items-center justify-center"
                        style={{
                            width: 11, height: 11, borderRadius: '50%',
                            background: LINK_GROUP_COLORS[linkGroup],
                            color: '#000', fontSize: 7, fontWeight: 800, lineHeight: 1,
                        }}
                    >
                        {linkGroup}
                    </span>
                ) : (
                    <span
                        style={{
                            width: 9, height: 9, borderRadius: '50%',
                            border: '1.5px solid var(--color-text-faint)',
                            display: 'inline-block',
                        }}
                    />
                )}
            </button>

            {!locked && (
                <>
                    {/* Send this pane to its own window (monitor picker when
                        more than one display is attached) */}
                    <PopOutButton
                        type={params.type}
                        symbol={config.pinSymbol as string | undefined}
                        linkGroup={linkGroup}
                    />
                    <button
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setConfigPanel(api.id); }}
                        title="Configure widget"
                    >
                        <Settings size={10} />
                    </button>
                    <button
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 16, height: 16, color: 'var(--color-text-muted)' }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); api.close(); }}
                        title="Close widget"
                    >
                        <X size={10} />
                    </button>
                </>
            )}
        </div>
    );
}
