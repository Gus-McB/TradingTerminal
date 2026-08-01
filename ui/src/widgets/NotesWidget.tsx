import React, { useState, useEffect, useRef } from 'react';
import { useTerminalSync } from '../hooks/useTerminalSync';
import type { WidgetComponentProps } from './registry';

export function NotesWidget({ widgetId, workspaceId: _ws, config: _c, className }: WidgetComponentProps) {
    useTerminalSync();
    const storageKey = `notes-${widgetId}`;
    const [text, setText] = useState(() => localStorage.getItem(storageKey) ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Keep state in sync if storage changes from another widget instance
        const saved = localStorage.getItem(storageKey);
        if (saved !== null && saved !== text) setText(saved);
    }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const val = e.target.value;
        setText(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            localStorage.setItem(storageKey, val);
        }, 500);
    }

    return (
        <div className={className} style={{ background: 'var(--color-bg)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '5px 10px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Notes</span>
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <textarea
                    value={text}
                    onChange={handleChange}
                    placeholder="Start typing your notes..."
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                        fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text)',
                        padding: '10px 12px 24px',
                        lineHeight: 1.6, boxSizing: 'border-box',
                    }}
                />
                {/* Character count */}
                <div style={{
                    position: 'absolute', bottom: 4, right: 8,
                    fontFamily: 'monospace', fontSize: 10, color: 'var(--color-text-muted)',
                    pointerEvents: 'none',
                }}>
                    {text.length}
                </div>
            </div>
        </div>
    );
}
