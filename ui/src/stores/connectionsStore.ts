/**
 * connectionsStore — user-owned provider connections.
 *
 * The renderer only ever holds MASKED summaries. Secrets are typed into the
 * form, handed straight to the Electron vault over IPC, and dropped from
 * component state immediately; they are never persisted here, in zustand's
 * storage, or anywhere else in the renderer.
 */
import { create } from 'zustand';
import type { ConnectionSummaryDto, ConnectionTestDto } from '../types/electron';

interface ConnectionsStore {
    /** Electron + an OS keychain are both required to store credentials */
    vaultAvailable: boolean;
    supported: boolean;
    connections: ConnectionSummaryDto[];
    loading: boolean;
    testingId: string | null;
    error?: string;

    init: () => Promise<void>;
    refresh: () => Promise<void>;
    save: (input: {
        id?: string;
        providerId: string;
        label: string;
        fields: Record<string, string>;
        secretKeys: string[];
    }) => Promise<{ ok: boolean; error?: string }>;
    remove: (id: string) => Promise<void>;
    test: (id: string) => Promise<ConnectionTestDto | undefined>;
}

export const useConnectionsStore = create<ConnectionsStore>((set, get) => ({
    vaultAvailable: false,
    supported: Boolean(window.electronAPI?.isElectron),
    connections: [],
    loading: false,
    testingId: null,

    init: async () => {
        const api = window.electronAPI;
        if (!api?.credentials) {
            set({ supported: false });
            return;
        }
        set({ loading: true });
        const [{ available }, connections] = await Promise.all([
            api.credentials.isAvailable(),
            api.credentials.list(),
        ]);
        set({ vaultAvailable: available, connections, loading: false, supported: true });
    },

    refresh: async () => {
        const api = window.electronAPI;
        if (!api?.credentials) return;
        set({ connections: await api.credentials.list() });
    },

    save: async (input) => {
        const api = window.electronAPI;
        if (!api?.credentials) return { ok: false, error: 'Credential storage requires the desktop app' };

        // environment is pinned to 'paper' — live is not reachable in this build
        const result = await api.credentials.save({ ...input, environment: 'paper' });
        if (result.ok) await get().refresh();
        else set({ error: result.error });
        return { ok: result.ok, error: result.error };
    },

    remove: async (id) => {
        const api = window.electronAPI;
        if (!api?.credentials) return;
        await api.credentials.remove(id);
        await get().refresh();
    },

    test: async (id) => {
        const api = window.electronAPI;
        if (!api?.credentials) return undefined;
        set({ testingId: id });
        try {
            const result = await api.credentials.test(id);
            await get().refresh();
            return result;
        } finally {
            set({ testingId: null });
        }
    },
}));
