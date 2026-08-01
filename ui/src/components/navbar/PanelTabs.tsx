/**
 * PanelTabs — the collapsible secondary taskbar of open panel tabs
 * (drag to reorder, close, add).
 */
import { useRef } from 'react';
import { GripVertical, X } from 'lucide-react';

export interface OpenPanel {
    id: string;
    label: string;
}

interface PanelTabsProps {
    panels: OpenPanel[];
    activePanel: string;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onAdd: () => void;
    onReorder: (panels: OpenPanel[]) => void;
}

export function PanelTabs({ panels, activePanel, onSelect, onClose, onAdd, onReorder }: PanelTabsProps) {
    const dragIdx = useRef<number | null>(null);

    const handleDragStart = (idx: number) => { dragIdx.current = idx; };
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (dragIdx.current === null || dragIdx.current === idx) return;
        const next = [...panels];
        const [moved] = next.splice(dragIdx.current, 1);
        next.splice(idx, 0, moved);
        dragIdx.current = idx;
        onReorder(next);
    };

    return (
        <div
            className="w-full flex items-stretch overflow-x-auto"
            style={{
                height: 28,
                background: 'var(--color-bg-deeper)',
                borderBottom: '1px solid var(--color-divider-faint)',
                scrollbarWidth: 'none',
            }}
        >
            {panels.map((panel, idx) => {
                const isActive = activePanel === panel.id;
                return (
                    <div
                        key={panel.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={e => handleDragOver(e, idx)}
                        className="flex items-stretch shrink-0 group"
                        style={{
                            borderRight: '1px solid var(--color-divider-faint)',
                            background: isActive ? 'var(--color-surface-alt)' : 'transparent',
                            borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                            cursor: 'pointer',
                        }}
                        onClick={() => onSelect(panel.id)}
                    >
                        <div
                            className="flex items-center px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--color-icon-dim)', cursor: 'grab' }}
                        >
                            <GripVertical size={10} />
                        </div>

                        <span
                            style={{
                                fontSize: 10,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-gray)',
                                display: 'flex',
                                alignItems: 'center',
                                paddingRight: 6,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {panel.label}
                        </span>

                        <button
                            className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-2"
                            style={{ color: 'var(--color-text-dim)' }}
                            onClick={e => { e.stopPropagation(); onClose(panel.id); }}
                        >
                            <X size={10} />
                        </button>
                    </div>
                );
            })}

            <button
                className="flex items-center px-3"
                style={{ fontSize: 16, color: 'var(--color-icon-dim)', lineHeight: 1 }}
                onClick={onAdd}
                title="Open new panel"
            >
                +
            </button>
        </div>
    );
}
