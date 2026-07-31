/**
 * useSessionStatus — live trading-session state for one instrument.
 * Recomputes on a timer so a widget flips PRE → OPEN → AFTER → CLOSED
 * as the venue's own clock crosses each boundary.
 */
import { useEffect, useState } from 'react';
import { getSessionStatus, type SessionStatus } from '@shared/instruments';

/** Session boundaries land on the minute; 20s keeps the label honest. */
const POLL_MS = 20_000;

export function useSessionStatus(symbol: string): SessionStatus {
    const [status, setStatus] = useState<SessionStatus>(() => getSessionStatus(symbol));

    useEffect(() => {
        setStatus(getSessionStatus(symbol));
        const id = setInterval(() => setStatus(getSessionStatus(symbol)), POLL_MS);
        return () => clearInterval(id);
    }, [symbol]);

    return status;
}

export const SESSION_COLORS: Record<SessionStatus, string> = {
    OPEN:   'var(--color-green)',
    PRE:    'var(--color-amber)',
    AFTER:  'var(--color-amber-alt)',
    CLOSED: 'var(--color-text-muted)',
};
