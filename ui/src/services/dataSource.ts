/**
 * dataSource — which provider is currently feeding the terminal.
 *
 * Activation goes through Electron main when available, so credentials for
 * providers that need them are read from the vault in the main process and
 * never pass through the renderer. Credential-free sources (the simulated
 * engine, Binance public streams) can also be driven directly in browser dev.
 */
import { socketManager } from './socketManager';

const MIDDLEWARE_URL = 'http://localhost:3000';

export interface DataSourceStatus {
    sourceId: string;
    label: string;
    /** True when a real provider (not the simulated engine) is serving data */
    live: boolean;
    symbols: string[];
    error?: string | null;
}

export interface ActivateResult {
    ok: boolean;
    message?: string;
    status?: DataSourceStatus;
}

type Listener = (status: DataSourceStatus) => void;

const listeners = new Set<Listener>();
let current: DataSourceStatus = {
    sourceId: 'engine', label: 'Simulated engine', live: false, symbols: [],
};
let started = false;

function emit(status: DataSourceStatus) {
    current = status;
    for (const l of listeners) l(status);
}

/** Follow `datasource:changed` broadcasts from the middleware. */
export function startDataSourceWatch(): void {
    if (started) return;
    started = true;
    socketManager.connect();
    socketManager.on('datasource:changed', (status: DataSourceStatus) => emit(status));
}

export function subscribeDataSource(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getDataSource(): DataSourceStatus {
    return current;
}

export async function refreshDataSource(): Promise<DataSourceStatus> {
    const api = window.electronAPI?.providers;
    try {
        const status = api
            ? await api.status()
            : await fetch(`${MIDDLEWARE_URL}/api/providers/status`).then(r => r.json());
        emit(status);
        return status;
    } catch {
        return current;
    }
}

/**
 * @param providerId  'engine' | 'binance' | 'alpaca'
 * @param connectionId saved connection to draw credentials from (Electron only)
 */
export async function activateDataSource(
    providerId: string,
    connectionId?: string,
): Promise<ActivateResult> {
    const api = window.electronAPI?.providers;

    if (api) {
        const result = providerId === 'engine'
            ? await api.deactivate()
            : await api.activate({ providerId, connectionId });
        if (result?.status) emit(result.status);
        return result;
    }

    // Browser dev: only credential-free sources can be driven from here
    if (connectionId) {
        return { ok: false, message: 'Saved connections require the desktop app' };
    }
    try {
        const path = providerId === 'engine'
            ? '/api/providers/deactivate'
            : '/api/providers/activate';
        const result = await fetch(`${MIDDLEWARE_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ providerId }),
        }).then(r => r.json());
        if (result?.status) emit(result.status);
        return result;
    } catch (err) {
        return { ok: false, message: `Middleware unreachable (${(err as Error).message})` };
    }
}
