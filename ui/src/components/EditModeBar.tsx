import { useState, useEffect, useRef } from 'react';
import { Save, X, RotateCcw } from 'lucide-react';

interface EditModeBarProps {
    workspaceName: string;
    onNameChange: (name: string) => void;
    onSave: () => void;
    onDiscard: () => void;
    onReset: () => void;
    isDirty: boolean;
    className?: string;
}

export function EditModeBar({
    workspaceName, onNameChange, onSave, onDiscard, onReset, isDirty, className,
}: EditModeBarProps) {
    const [draft, setDraft] = useState(workspaceName);
    const [blink, setBlink] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep draft in sync if parent changes the name externally
    useEffect(() => { setDraft(workspaceName); }, [workspaceName]);

    // Blink interval for edit-mode indicator
    useEffect(() => {
        const id = setInterval(() => setBlink(p => !p), 700);
        return () => clearInterval(id);
    }, []);

    const commitName = () => {
        const trimmed = draft.trim();
        if (trimmed && trimmed !== workspaceName) onNameChange(trimmed);
        else setDraft(workspaceName);
    };

    return (
        <div
            className={className}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 44, padding: '0 16px',
                background: '#0d1117',
                borderBottom: '1px solid var(--color-border)',
                borderLeft: '4px solid var(--color-accent)',
                flexShrink: 0, position: 'sticky', top: 0, zIndex: 90,
            }}
        >
            {/* Edit mode indicator */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
                <span style={{
                    color: blink ? 'var(--color-cyan)' : 'transparent',
                    fontSize: 14, transition: 'color 0.1s', lineHeight: 1,
                }}>
                    ●
                </span>
                <span style={{
                    color: 'var(--color-cyan)', fontSize: 10, fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: 2,
                }}>
                    EDIT MODE
                </span>
            </div>

            {/* Vertical divider */}
            <div style={{ width: 1, height: 20, background: 'var(--color-border)', flexShrink: 0 }} />

            {/* Workspace name input */}
            <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => {
                    if (e.key === 'Enter') { commitName(); inputRef.current?.blur(); }
                    if (e.key === 'Escape') { setDraft(workspaceName); inputRef.current?.blur(); }
                }}
                style={{
                    background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)',
                    fontSize: 13, fontFamily: 'monospace', fontWeight: 600,
                    padding: '2px 4px', outline: 'none', minWidth: 120, maxWidth: 260,
                    transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderBottomColor = 'var(--color-accent)')}
                onBlurCapture={e => (e.currentTarget.style.borderBottomColor = 'var(--color-border)')}
            />

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Unsaved changes label */}
            {isDirty && (
                <span style={{
                    color: 'var(--color-amber)', fontSize: 11, fontFamily: 'monospace',
                    marginRight: 4, flexShrink: 0,
                }}>
                    Unsaved changes
                </span>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button
                    onClick={onSave}
                    disabled={!isDirty}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: isDirty ? 'var(--color-accent)' : '#1a1a28',
                        color: isDirty ? '#fff' : 'var(--color-border-strong)',
                        border: 'none', padding: '5px 12px', cursor: isDirty ? 'pointer' : 'not-allowed',
                        fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
                        transition: 'background 0.15s, color 0.15s',
                    }}
                >
                    <Save size={13} /> Save Layout
                </button>

                <button
                    onClick={onDiscard}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: '#1a1a28', color: 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)', padding: '5px 12px', cursor: 'pointer',
                        fontSize: 12, fontFamily: 'monospace',
                        transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                    <X size={13} /> Discard
                </button>

                <button
                    onClick={onReset}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'transparent', color: 'var(--color-red)',
                        border: '1px solid var(--color-red)', padding: '5px 12px', cursor: 'pointer',
                        fontSize: 12, fontFamily: 'monospace',
                        transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--color-red) 9%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <RotateCcw size={13} /> Reset to Default
                </button>
            </div>
        </div>
    );
}
