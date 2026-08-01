import { useEffect, type RefObject } from 'react';

/** Invokes cb when the user clicks outside the referenced element. */
export function useOutsideClick(ref: RefObject<HTMLElement | null>, cb: () => void) {
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) cb();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, cb]);
}
