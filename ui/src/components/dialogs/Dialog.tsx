/**
 * In-theme modal dialogs — replaces window.prompt / window.confirm.
 * Keyboard: Enter confirms, Escape cancels. Focus lands on the primary
 * control when the dialog opens.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

// ─── Shell ────────────────────────────────────────────────────────────────────

function DialogShell({ children, onCancel }: { children: ReactNode; onCancel: () => void }) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                    padding: 18,
                    width: 340,
                }}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

const titleStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--color-text-bright)',
    letterSpacing: '0.06em', margin: '0 0 10px', fontFamily: 'monospace',
};

const buttonRow: React.CSSProperties = {
    display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14,
};

function CancelButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 16px', fontSize: 11, cursor: 'pointer',
                color: 'var(--color-text-muted)', background: 'transparent',
                border: '1px solid var(--color-border)', fontFamily: 'monospace',
            }}
        >
            Cancel
        </button>
    );
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
    title: string;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { confirmRef.current?.focus(); }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onCancel]);

    const accent = danger ? 'var(--color-red-alt)' : 'var(--color-accent)';

    return (
        <DialogShell onCancel={onCancel}>
            <p style={titleStyle}>{title}</p>
            {message && (
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {message}
                </p>
            )}
            <div style={buttonRow}>
                <CancelButton onClick={onCancel} />
                <button
                    ref={confirmRef}
                    onClick={onConfirm}
                    style={{
                        padding: '6px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        color: danger ? '#fff' : '#000',
                        background: accent, border: 'none', fontFamily: 'monospace',
                    }}
                >
                    {confirmLabel}
                </button>
            </div>
        </DialogShell>
    );
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

interface PromptDialogProps {
    title: string;
    placeholder?: string;
    initialValue?: string;
    confirmLabel?: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
}

export function PromptDialog({
    title, placeholder, initialValue = '', confirmLabel = 'OK', onSubmit, onCancel,
}: PromptDialogProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

    const submit = () => {
        if (value.trim()) onSubmit(value.trim());
    };

    return (
        <DialogShell onCancel={onCancel}>
            <p style={titleStyle}>{title}</p>
            <input
                ref={inputRef}
                value={value}
                placeholder={placeholder}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') onCancel();
                }}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    color: 'var(--color-text)', fontSize: 12, fontFamily: 'monospace',
                    padding: '7px 9px', outline: 'none',
                }}
            />
            <div style={buttonRow}>
                <CancelButton onClick={onCancel} />
                <button
                    onClick={submit}
                    disabled={!value.trim()}
                    style={{
                        padding: '6px 16px', fontSize: 11, fontWeight: 600,
                        cursor: value.trim() ? 'pointer' : 'not-allowed',
                        color: '#000', background: 'var(--color-accent)',
                        border: 'none', fontFamily: 'monospace',
                        opacity: value.trim() ? 1 : 0.5,
                    }}
                >
                    {confirmLabel}
                </button>
            </div>
        </DialogShell>
    );
}
