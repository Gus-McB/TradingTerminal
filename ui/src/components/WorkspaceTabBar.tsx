import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface WorkspaceTabBarProps {
    workspaces: Array<{ id: string; name: string }>;
    activeId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onRename: (id: string, name: string) => void;
    className?: string;
}

function Tab({
    ws,
    isActive,
    onSelect,
    onRename,
}: {
    ws: { id: string; name: string };
    isActive: boolean;
    onSelect: () => void;
    onRename: (name: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(ws.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const commit = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== ws.name) onRename(trimmed);
        else setDraft(ws.name);
        setEditing(false);
    };

    return (
        <div
            onClick={!editing ? onSelect : undefined}
            onDoubleClick={() => { setEditing(true); setDraft(ws.name); }}
            style={{
                display: 'inline-flex', alignItems: 'center',
                height: 32, padding: '0 14px',
                cursor: editing ? 'text' : 'pointer',
                borderBottom: isActive ? '2px solid #00f0ff' : '2px solid transparent',
                background: isActive ? '#1a1a28' : 'transparent',
                flexShrink: 0, userSelect: 'none',
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#141420';
            }}
            onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
        >
            {editing ? (
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') { setDraft(ws.name); setEditing(false); }
                        e.stopPropagation();
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#0a0a0f', border: '1px solid #00f0ff',
                        color: '#e0e0e8', fontSize: 12, fontFamily: 'monospace',
                        padding: '1px 4px', outline: 'none', width: Math.max(60, draft.length * 8),
                    }}
                />
            ) : (
                <span style={{
                    color: isActive ? '#e0e0e8' : '#6a6a7a',
                    fontSize: 12, fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                }}>
                    {ws.name}
                </span>
            )}
        </div>
    );
}

export function WorkspaceTabBar({
    workspaces, activeId, onSelect, onAdd, onRename, className,
}: WorkspaceTabBarProps) {
    return (
        <div
            className={className}
            style={{
                display: 'flex', alignItems: 'stretch',
                height: 32, background: '#0a0c0f',
                borderBottom: '1px solid #2a2a3a',
                overflowX: 'auto', flexShrink: 0,
                scrollbarWidth: 'none',
            }}
        >
            <style>{`.ws-tabbar::-webkit-scrollbar{display:none}`}</style>

            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
                {workspaces.map(ws => (
                    <Tab
                        key={ws.id}
                        ws={ws}
                        isActive={ws.id === activeId}
                        onSelect={() => onSelect(ws.id)}
                        onRename={name => onRename(ws.id, name)}
                    />
                ))}
            </div>

            {/* Separator + Add button */}
            <div style={{
                display: 'flex', alignItems: 'center',
                paddingLeft: 4, flexShrink: 0,
            }}>
                <button
                    onClick={onAdd}
                    title="Add workspace"
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, background: 'transparent',
                        border: '1px solid #2a2a3a', cursor: 'pointer', color: '#6a6a7a',
                        transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#00f0ff';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#00f0ff';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#6a6a7a';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a3a';
                    }}
                >
                    <Plus size={13} />
                </button>
            </div>

            {/* Spacer fills remaining width */}
            <div style={{ flex: 1 }} />
        </div>
    );
}
